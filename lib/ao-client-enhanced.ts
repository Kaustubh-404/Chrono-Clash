// lib/ao-client-enhanced.ts - Add missing isGatewayConnected method
import { aoClient } from "./ao-client"
import { GameStateCache } from "./game-state-cache"
import type { GameState, Move, GameStateUpdate } from "./types"
import { applyMove } from "./game-utils"

/**
 * Enhanced AO Client with offline support and resilient communication
 */
export class EnhancedAoClient {
  private syncInProgress: Record<string, boolean> = {}
  private reconnectCallbacks: Record<string, (() => void)[]> = {}
  private offlineMode: boolean = false
  
  constructor() {
    // Monitor connection status
    aoClient.addEventListener('connection', (data) => {
      const previousOfflineMode = this.offlineMode
      this.offlineMode = data.status === 'disconnected' || !navigator.onLine
      
      // If reconnected from offline, process pending moves
      if (previousOfflineMode && !this.offlineMode) {
        this.processPendingMoves()
      }
    })
    
    // Set the reconnect callback for AO client
    aoClient.setReconnectCallback(() => {
      this.handleReconnect()
    })
    
    // Initial connection check
    this.offlineMode = !aoClient.isGatewayConnected() || !navigator.onLine
  }
  
  /**
   * Add reconnect callback for a specific match
   */
  addReconnectCallback(matchId: string, callback: () => void): () => void {
    if (!this.reconnectCallbacks[matchId]) {
      this.reconnectCallbacks[matchId] = []
    }
    
    this.reconnectCallbacks[matchId].push(callback)
    
    return () => {
      this.reconnectCallbacks[matchId] = this.reconnectCallbacks[matchId].filter(cb => cb !== callback)
    }
  }
  
  /**
   * Handle reconnection event
   */
  private async handleReconnect(): Promise<void> {
    // Process all pending moves first
    await this.processPendingMoves()
    
    // Execute all reconnect callbacks
    for (const matchId in this.reconnectCallbacks) {
      for (const callback of this.reconnectCallbacks[matchId]) {
        try {
          callback()
        } catch (error) {
          console.error(`Error executing reconnect callback for match ${matchId}:`, error)
        }
      }
    }
  }
  
  /**
   * Process any pending moves that occurred while offline
   */
  private async processPendingMoves(): Promise<void> {
    const activeGames = GameStateCache.getActiveGames()
    
    for (const game of activeGames) {
      try {
        if (this.syncInProgress[game.matchId]) continue
        this.syncInProgress[game.matchId] = true
        
        // Get pending moves
        const pendingMoves = GameStateCache.getPendingMoves(game.matchId)
        if (pendingMoves.length === 0) {
          this.syncInProgress[game.matchId] = false
          continue
        }
        
        console.log(`Processing ${pendingMoves.length} pending moves for match ${game.matchId}`)
        
        // Get current game state from server
        const response = await aoClient.getGameState(game.matchId)
        
        if (response.status === "success" && response.data) {
          const serverState = response.data as GameState
          const { gameState: cachedState, lastSyncedMoveCount } = GameStateCache.loadGameState(game.matchId)
          
          // If no cached state, skip
          if (!cachedState) {
            GameStateCache.clearPendingMoves(game.matchId)
            this.syncInProgress[game.matchId] = false
            continue
          }
          
          // Check if the server already has the pending moves
          if (serverState.moveHistory.length >= cachedState.moveHistory.length) {
            // Server is ahead or equal, clear pending moves
            GameStateCache.clearPendingMoves(game.matchId)
            GameStateCache.saveGameState(game.matchId, serverState)
          } else {
            // Send moves one by one
            for (const move of pendingMoves) {
              await this.syncMove(game.matchId, move)
            }
            
            // Clear pending moves after successful sync
            GameStateCache.clearPendingMoves(game.matchId)
          }
        }
      } catch (error) {
        console.error(`Error processing pending moves for match ${game.matchId}:`, error)
      } finally {
        this.syncInProgress[game.matchId] = false
      }
    }
  }
  
  /**
   * Sync a single move with the server
   */
  private async syncMove(matchId: string, move: Move): Promise<boolean> {
    try {
      const response = await aoClient.playCard(
        matchId,
        move.cardIndex,
        move.targetCardIndex,
        move.attackType
      )
      
      if (response.status === "success") {
        // Sync successful, update move data
        await aoClient.syncMatchState(matchId, {
          Damage: move.damage,
          CardIdx: move.cardIndex + 1, // Adjust to 1-based for Lua
          TargetIdx: move.targetCardIndex + 1 // Adjust to 1-based for Lua
        })
        
        return true
      }
      
      return false
    } catch (error) {
      console.error("Error syncing move:", error)
      return false
    }
  }
  
  /**
   * Enhanced play card method with offline support
   */
  async playCard(
    matchId: string,
    playerAddress: string,
    cardIndex: number,
    targetCardIndex: number,
    attackType: "normal" | "special",
    gameState: GameState
  ): Promise<{ success: boolean, gameState: GameState | null }> {
    // Create move object
    const playerCard = gameState.players[playerAddress].cards[cardIndex]
    const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress)
    
    if (!opponentAddress) {
      return { success: false, gameState: null }
    }
    
    const targetCard = gameState.players[opponentAddress].cards[targetCardIndex]
    
    const move: Move = {
      player: playerAddress,
      cardIndex,
      targetCardIndex,
      attackType,
      damage: attackType === "normal" ? playerCard.attackPower : playerCard.specialAttackPower,
      timestamp: Date.now()
    }
    
    // Apply move locally first
    const updatedGameState = applyMove(gameState, move)
    
    // Save updated state to cache
    GameStateCache.saveGameState(matchId, updatedGameState)
    
    // If offline, store the move to be sent later
    if (this.offlineMode) {
      console.log("Offline mode - storing move for later sync")
      GameStateCache.savePendingMove(matchId, move)
      return { success: true, gameState: updatedGameState }
    }
    
    // If online, send to server
    try {
      const response = await aoClient.playCard(
        matchId,
        cardIndex,
        targetCardIndex,
        attackType
      )
      
      if (response.status !== "success") {
        // If server rejects the move, store for retry
        console.log("Move rejected by server - storing for retry")
        GameStateCache.savePendingMove(matchId, move)
        return { success: true, gameState: updatedGameState }
      }
      
      // Sync move data with server
      await aoClient.syncMatchState(matchId, {
        Damage: move.damage,
        CardIdx: cardIndex + 1, // Adjust to 1-based for Lua
        TargetIdx: targetCardIndex + 1 // Adjust to 1-based for Lua
      })
      
      return { success: true, gameState: updatedGameState }
    } catch (error) {
      console.error("Error processing card play:", error)
      
      // On error, store move for later sync
      GameStateCache.savePendingMove(matchId, move)
      return { success: true, gameState: updatedGameState }
    }
  }
  
  /**
   * Enhanced get game state with cache support
   */
  async getGameState(matchId: string): Promise<{ status: string, data?: GameState, error?: string }> {
    // Try to get from cache first
    const { gameState: cachedState } = GameStateCache.loadGameState(matchId)
    
    // If offline and we have cache, use it
    if (this.offlineMode && cachedState) {
      return { status: "success", data: cachedState }
    }
    
    // If online, try to get from server
    try {
      const response = await aoClient.getGameState(matchId)
      
      if (response.status === "success" && response.data) {
        // Update cache with newest state
        GameStateCache.saveGameState(matchId, response.data)
        return response
      } else if (cachedState) {
        // If server request fails but we have cache, use it
        return { status: "success", data: cachedState }
      }
      
      // No cache and server failed
      return response
    } catch (error) {
      console.error("Error fetching game state:", error)
      
      // If error and we have cache, use it
      if (cachedState) {
        return { status: "success", data: cachedState }
      }
      
      return { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error fetching game state" 
      }
    }
  }
  
  /**
   * Enhanced subscribe to game updates with offline support
   */
  async subscribeToGameUpdates(
    matchId: string, 
    callback: (data: GameStateUpdate) => void
  ): Promise<() => void> {
    // Get initial state from cache
    const { gameState: cachedState } = GameStateCache.loadGameState(matchId)
    
    if (cachedState) {
      // Send cached state immediately
      callback({
        type: "stateUpdate",
        matchId,
        data: cachedState
      })
    }
    
    // Add reconnect callback
    const removeReconnectCallback = this.addReconnectCallback(matchId, async () => {
      // On reconnect, get fresh state
      const response = await this.getGameState(matchId)
      if (response.status === "success" && response.data) {
        callback({
          type: "stateUpdate",
          matchId,
          data: response.data
        })
      }
    })
    
    // Subscribe to real-time updates
    const removeAoSubscription = await aoClient.subscribeToGameUpdates(matchId, (update) => {
      // Always update cache with new state
      if (update.type === "stateUpdate" && update.data) {
        GameStateCache.saveGameState(matchId, update.data)
      }
      
      // Forward update to callback
      callback(update)
    })
    
    // Return combined unsubscribe function
    return () => {
      removeReconnectCallback()
      removeAoSubscription()
    }
  }
  
  /**
   * Check if currently in offline mode
   */
  isOffline(): boolean {
    return this.offlineMode
  }
  
  /**
   * Check if gateway is connected
   * Used by connection manager
   */
  isGatewayConnected(): boolean {
    return aoClient.isGatewayConnected()
  }
  
  /**
   * Force sync with server (used after reconnection)
   */
  async forceSyncGameState(matchId: string): Promise<boolean> {
    if (this.offlineMode) return false
    
    try {
      const pendingMoves = GameStateCache.getPendingMoves(matchId)
      
      // If no pending moves, just update cache
      if (pendingMoves.length === 0) {
        const response = await aoClient.getGameState(matchId)
        if (response.status === "success" && response.data) {
          GameStateCache.saveGameState(matchId, response.data)
          return true
        }
        return false
      }
      
      // Process pending moves
      if (this.syncInProgress[matchId]) return false
      this.syncInProgress[matchId] = true
      
      try {
        for (const move of pendingMoves) {
          await this.syncMove(matchId, move)
        }
        
        // Clear pending moves after successful sync
        GameStateCache.clearPendingMoves(matchId)
        
        // Update cache with latest state
        const response = await aoClient.getGameState(matchId)
        if (response.status === "success" && response.data) {
          GameStateCache.saveGameState(matchId, response.data)
          return true
        }
        
        return false
      } catch (error) {
        console.error(`Error processing pending moves for match ${matchId}:`, error)
        return false
      } finally {
        this.syncInProgress[matchId] = false
      }
    } catch (error) {
      console.error("Error forcing sync:", error)
      return false
    }
  }
  
  /**
   * Get active games for the current player
   */
  getActiveGames(): Array<{
    matchId: string;
    roomCode: string;
    lastUpdated: number;
    status: string;
    wager: number;
    creator: string;
    opponentCount: number;
  }> {
    return GameStateCache.getActiveGames()
  }
  
  /**
   * Clear game state and remove from active games
   */
  clearGameState(matchId: string): void {
    GameStateCache.clearGameState(matchId)
  }
  
  /**
   * Pass-through methods to underlying AO client
   */
  async createGameRoom(wager: number) {
    return aoClient.createGameRoom(wager)
  }
  
  async joinGameRoom(roomCode: string) {
    return aoClient.joinGameRoom(roomCode)
  }
  
  async getGameStateByRoomCode(roomCode: string) {
    return aoClient.getGameStateByRoomCode(roomCode)
  }
  
  async getLeaderboard() {
    return aoClient.getLeaderboard()
  }
  
  setWalletAddress(address: string) {
    aoClient.setWalletAddress(address)
  }
  
  addEventListener(event: string, callback: (data: any) => void) {
    return aoClient.addEventListener(event, callback)
  }
}

// Export singleton instance
export const enhancedAoClient = new EnhancedAoClient()














