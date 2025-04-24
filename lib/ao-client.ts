// lib/ao-client.ts
import type { AoMessage, AoResponse, GameState, Move, GameStateUpdate } from "./types"
import { isWanderAvailable } from "./wallet"



// Message retry configuration
const MESSAGE_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_FACTOR: 2
}

// Polling intervals (in milliseconds)
const POLLING = {
  GAME_STATE: 3000,  // 3 seconds for game state updates
  ACTIVE_GAMES: 10000, // 10 seconds for active games list
  CONNECTION_CHECK: 30000 // 30 seconds for connection checking
}

export class AoClient {
  private gateway: string
  private processId: string
  private scheduler: string
  private walletAddress: string | null = null
  private eventListeners: Record<string, Array<(data: any) => void>> = {}
  private statePollingIntervals: Record<string, NodeJS.Timeout | null> = {}
  private connectionCheckInterval: NodeJS.Timeout | null = null
  private isConnected = true
  private pendingRequests: Record<string, number> = {}
  private lastGameStates: Record<string, GameState> = {}
  private reconnectCallback: (() => void) | null = null

  constructor() {
    this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://g8way.io"
    this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
    this.scheduler = process.env.NEXT_PUBLIC_AO_SCHEDULER || "eU8XgZWrPTkYRSNV_jOw8BGO_V3bfMzQtpIpDxVlBZw"

    if (typeof window !== "undefined") {
      const storedAddress = localStorage.getItem("walletAddress")
      if (storedAddress) {
        this.walletAddress = storedAddress
      }
      
      // Start connection checker
      this.startConnectionCheck()
    }
  }

  setWalletAddress(address: string) {
    this.walletAddress = address
    if (typeof window !== "undefined") {
      localStorage.setItem("walletAddress", address)
    }
  }
  
  private startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
    }
    
    this.connectionCheckInterval = setInterval(async () => {
      if (typeof window !== "undefined" && navigator.onLine) {
        try {
          // Try to ping the gateway
          const response = await fetch(`${this.gateway}/ping`, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })
          
          const wasConnected = this.isConnected
          this.isConnected = response.ok
          
          // If reconnected after being disconnected
          if (this.isConnected && !wasConnected) {
            console.log("AO Gateway connection restored")
            
            // Trigger reconnection callback if set
            if (this.reconnectCallback) {
              this.reconnectCallback()
            }
            
            // Notify all connection listeners
            this.dispatchEvent('connection', { status: 'connected' })
          } else if (!this.isConnected && wasConnected) {
            console.log("AO Gateway connection lost")
            this.dispatchEvent('connection', { status: 'disconnected' })
          }
        } catch (error) {
          console.warn("Connection check failed:", error)
          if (this.isConnected) {
            this.isConnected = false
            this.dispatchEvent('connection', { status: 'disconnected' })
          }
        }
      } else if (this.isConnected) {
        // Browser is offline
        this.isConnected = false
        this.dispatchEvent('connection', { status: 'disconnected' })
      }
    }, POLLING.CONNECTION_CHECK)
  }
  
  setReconnectCallback(callback: () => void) {
    this.reconnectCallback = callback
  }

  async sendMessage(action: string, tags: Record<string, string> = {}, retryCount = 0): Promise<AoResponse> {
    if (!this.walletAddress) {
      return { status: "error", error: "Wallet not connected" }
    }

    if (!this.processId) {
      return { status: "error", error: "Process ID not set. Please deploy the AO process first." }
    }
    
    // Generate a request ID to track this message
    const requestId = `${action}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    this.pendingRequests[requestId] = Date.now()

    try {
      const message: AoMessage = {
        Target: this.processId,
        Action: action,
        Tags: {
          Address: this.walletAddress,
          RequestId: requestId,
          ...tags,
        },
        Data: {}
      }

      console.log(`Sending ${action} message to AO process ${this.processId}:`, message)

      if (isWanderAvailable()) {
        try {
          const dataItem = {
            target: this.processId,
            tags: [
              { name: "Action", value: action },
              { name: "Address", value: this.walletAddress },
              { name: "RequestId", value: requestId },
              ...Object.entries(tags).map(([name, value]) => ({ name, value }))
            ],
            data: ""
          }

          const response = await this.sendRawMessage(dataItem)
          console.log(`Response from AO (${action}):`, response)
          
          // Remove from pending requests
          delete this.pendingRequests[requestId]
          
          return {
            status: "success",
            data: response,
            requestId
          }
        } catch (error) {
          console.error("Error sending message to AO:", error)
          
          // Retry logic with exponential backoff
          if (retryCount < MESSAGE_RETRY.MAX_ATTEMPTS) {
            const delay = MESSAGE_RETRY.INITIAL_DELAY * Math.pow(MESSAGE_RETRY.BACKOFF_FACTOR, retryCount)
            console.log(`Retrying message ${action} (attempt ${retryCount + 1}) after ${delay}ms`)
            
            await new Promise(resolve => setTimeout(resolve, delay))
            return this.sendMessage(action, tags, retryCount + 1)
          }
          
          // If all retries failed, fallback to simulation
          console.log("All retry attempts failed, using simulated response")
          delete this.pendingRequests[requestId]
          
          return {
            status: "success", 
            data: this.simulateResponse(action, tags),
            requestId,
            simulated: true
          }
        }
      } else {
        console.log("Wander wallet not available, using simulated response")
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
        
        delete this.pendingRequests[requestId]
        return {
          status: "success", 
          data: this.simulateResponse(action, tags),
          requestId,
          simulated: true
        }
      }
    } catch (error) {
      console.error("Error preparing message for AO:", error)
      delete this.pendingRequests[requestId]
      
      return { 
        status: "error", 
        error: `Failed to prepare message for AO: ${error}`,
        requestId
      }
    }
  }

  // Helper method to send raw message using Wander
  private async sendRawMessage(dataItem: any): Promise<any> {
    if (!isWanderAvailable()) {
      throw new Error("Wander wallet not available")
    }

    try {
      // Sign the message with Wander
      const signedDataItem = await window.wander!.sign(dataItem)

      const response = await fetch(`${this.gateway}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signedDataItem),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gateway error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error sending raw message:", error)
      throw error
    }
  }

  // Enhanced simulation responses with more realistic game state
  private simulateResponse(action: string, tags: Record<string, string>): any {
    switch (action) {
      case "JoinGame":
        return {
          success: true,
          tokens: 10,
          message: "Successfully joined ChronoClash"
        }
      
      case "CoordinateRoom":
        if (tags.WagerAmount) {
          // Create room
          const roomCode = this.generateRoomCode()
          const matchId = `match-${Date.now()}`
          
          // Store initial game state for this match
          this.lastGameStates[matchId] = this.generateInitialGameState(matchId, roomCode, this.walletAddress!, parseFloat(tags.WagerAmount))
          
          return {
            success: true,
            roomCode,
            matchId,
            wager: parseFloat(tags.WagerAmount),
            timestamp: Date.now()
          }
        } else if (tags.RoomCode) {
          // Join room - find existing match with this room code
          let matchId = `match-${Date.now()}`
          
          // Look for an existing room with this code
          for (const [id, state] of Object.entries(this.lastGameStates)) {
            if (state.roomCode === tags.RoomCode) {
              matchId = id
              
              // Update the game state with the joining player
              this.lastGameStates[matchId] = {
                ...state,
                status: "in_progress",
                players: {
                  ...state.players,
                  [this.walletAddress!]: {
                    address: this.walletAddress!,
                    cards: [],
                    ready: true
                  }
                },
                currentTurn: Object.keys(state.players)[0] // First player goes first
              }
              
              break
            }
          }
          
          // If no match found, create a new one
          if (!this.lastGameStates[matchId]) {
            this.lastGameStates[matchId] = this.generateInitialGameState(
              matchId, 
              tags.RoomCode, 
              "opponent-" + Math.random().toString(36).substring(2, 9),
              10
            )
            
            // Add joining player
            this.lastGameStates[matchId].players[this.walletAddress!] = {
              address: this.walletAddress!,
              cards: [],
              ready: true
            }
          }
          
          return {
            success: true,
            matchId,
            roomCode: tags.RoomCode,
            opponent: Object.keys(this.lastGameStates[matchId].players).find(addr => addr !== this.walletAddress),
            wager: this.lastGameStates[matchId].wager
          }
        }
        return {
          success: false, 
          error: "Invalid room coordination request"
        }
      
      case "ProcessTurn":
        const matchId = tags.MatchID || ''
        const cardIdx = parseInt(tags.CardIdx || '0') - 1 // Convert from 1-based to 0-based
        const targetIdx = parseInt(tags.TargetIdx || '0') - 1
        const moveType = tags.MoveType?.toLowerCase() || 'normal'
        
        if (this.lastGameStates[matchId]) {
          // Get the current game state
          const gameState = this.lastGameStates[matchId]
          
          // Determine attacking and defending players
          const attackingPlayer = this.walletAddress!
          const defendingPlayer = Object.keys(gameState.players).find(addr => addr !== attackingPlayer)!
          
          // Calculate damage (random range based on move type)
          const baseDamage = moveType === 'special' ? 15 : 8
          const damage = baseDamage + Math.floor(Math.random() * 6)
          
          // Create the move
          const move: Move = {
            player: attackingPlayer,
            cardIndex: cardIdx,
            targetCardIndex: targetIdx,
            attackType: moveType as 'normal' | 'special',
            damage,
            timestamp: Date.now()
          }
          
          // Add move to history
          gameState.moveHistory.push(move)
          
          // Switch turns
          gameState.currentTurn = defendingPlayer
          
          // Save updated state
          this.lastGameStates[matchId] = gameState
          
          // Dispatch state update event
          this.dispatchEvent(`gameState:${matchId}`, {
            type: 'stateUpdate',
            matchId,
            data: gameState
          })
          
          return {
            success: true,
            damage,
            attackType: moveType,
            cardDefeated: damage >= 20,
            nextTurn: defendingPlayer
          }
        }
        
        return {
          success: false,
          error: "Match not found"
        }
      
      case "SyncMatchState":
        const syncMatchId = tags.MatchID || ''
        if (this.lastGameStates[syncMatchId]) {
          let moveData = {}
          
          try {
            if (tags.MoveData) {
              moveData = JSON.parse(tags.MoveData)
            }
          } catch (e) {
            console.error("Error parsing move data:", e)
          }
          
          return {
            success: true,
            syncTimestamp: Date.now(),
            moveData
          }
        }
        
        return {
          success: false,
          error: "Match not found for sync"
        }
      
      case "GetMatchState":
        let stateMatchId = tags.MatchID
        
        // If using room code, find the corresponding match ID
        if (!stateMatchId && tags.RoomCode) {
          for (const [id, state] of Object.entries(this.lastGameStates)) {
            if (state.roomCode === tags.RoomCode) {
              stateMatchId = id
              break
            }
          }
        }
        
        if (stateMatchId && this.lastGameStates[stateMatchId]) {
          return this.lastGameStates[stateMatchId]
        } else if (stateMatchId) {
          // Generate a new state if we don't have one yet
          return this.generateMockGameState(stateMatchId)
        }
        
        return {
          success: false,
          error: "Match not found"
        }
      
      case "GetLeaderboard":
        return {
          success: true,
          leaderboard: [
            { address: "0x1234...5678", wins: 5, tokens: 50 },
            { address: "0x8765...4321", wins: 3, tokens: 30 },
            { address: this.walletAddress || "0xabcd...efgh", wins: 2, tokens: 20 },
          ],
        }
      
      default:
        return { 
          success: true, 
          message: `${action} simulated successfully` 
        }
    }
  }
  
  private generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
  
  private generateInitialGameState(matchId: string, roomCode: string, creator: string, wager: number): GameState {
    return {
      status: "awaiting_players",
      roomCode,
      creator,
      wager,
      players: {
        [creator]: {
          address: creator,
          cards: [],
          ready: true,
        }
      },
      currentTurn: null,
      moveHistory: [],
      winner: null,
    }
  }

  private generateMockGameState(identifier: string): GameState {
    const roomCode = identifier.startsWith("match-") ? this.generateRoomCode() : identifier
    const creator = this.walletAddress || "0x1234...5678"
    const opponent = "0x8765...4321"
    const moveHistory: Move[] = [
      {
        player: creator,
        cardIndex: 0,
        targetCardIndex: 1,
        attackType: "normal",
        damage: 10,
        timestamp: Date.now() - 60000,
      },
      {
        player: opponent,
        cardIndex: 2,
        targetCardIndex: 3,
        attackType: "normal",
        damage: 8,
        timestamp: Date.now() - 30000,
      },
    ]
    
    return {
      status: "in_progress",
      roomCode,
      creator,
      wager: 10,
      players: {
        [creator]: {
          address: creator,
          cards: [],
          ready: true,
        },
        [opponent]: {
          address: opponent,
          cards: [],
          ready: true,
        },
      },
      currentTurn: creator,
      moveHistory,
      winner: null,
    }
  }
  
  // Event subscription system
  addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    
    this.eventListeners[event].push(callback)
    
    // Return unsubscribe function
    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback)
    }
  }
  
  private dispatchEvent(event: string, data: any): void {
    if (this.eventListeners[event]) {
      for (const callback of this.eventListeners[event]) {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e)
        }
      }
    }
  }
  
  // Get the number of pending requests
  getPendingRequestCount(): number {
    return Object.keys(this.pendingRequests).length
  }
  
  // Check connection status
  isGatewayConnected(): boolean {
    return this.isConnected
  }

  // API Methods
  async joinGame(): Promise<AoResponse> {
    return this.sendMessage("JoinGame")
  }

  async createGameRoom(wager: number): Promise<AoResponse> {
    return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
  }

  async joinGameRoom(roomCode: string): Promise<AoResponse> {
    return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
  }

  async playCard(
    matchId: string,
    cardIndex: number,
    targetCardIndex: number,
    moveType: "normal" | "special",
  ): Promise<AoResponse> {
    return this.sendMessage("ProcessTurn", {
      MatchID: matchId,
      CardIdx: (cardIndex + 1).toString(), // Convert to 1-based for Lua
      TargetIdx: (targetCardIndex + 1).toString(), // Convert to 1-based for Lua
      MoveType: moveType === "normal" ? "Normal" : "Special",
    })
  }

  async getGameState(matchId: string): Promise<AoResponse> {
    return this.sendMessage("GetMatchState", { MatchID: matchId })
  }

  async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
    return this.sendMessage("GetMatchState", { RoomCode: roomCode })
  }

  async getLeaderboard(): Promise<AoResponse> {
    return this.sendMessage("GetLeaderboard")
  }

  async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
    return this.sendMessage("SyncMatchState", {
      MatchID: matchId,
      MoveData: JSON.stringify(moveData),
    })
  }

  async subscribeToGameUpdates(matchId: string, callback: (data: GameStateUpdate) => void): Promise<() => void> {
    // Create event key for this match
    const eventKey = `gameState:${matchId}`
    
    // Add the event listener
    const removeListener = this.addEventListener(eventKey, callback)
    
    // Initial fetch of game state
    try {
      const initialState = await this.getGameState(matchId)
      if (initialState.status === "success" && initialState.data) {
        // Store the state and send initial update
        this.lastGameStates[matchId] = initialState.data
        callback({
          type: "stateUpdate",
          matchId,
          data: initialState.data
        })
      }
    } catch (error) {
      console.error(`Error fetching initial game state for ${matchId}:`, error)
    }
    
    // Start polling for updates if not already polling
    if (!this.statePollingIntervals[matchId]) {
      this.statePollingIntervals[matchId] = setInterval(async () => {
        if (!this.isConnected) return
        
        try {
          const result = await this.getGameState(matchId)
          if (result.status === "success" && result.data) {
            const newState = result.data
            const currentState = this.lastGameStates[matchId]
            
            // Check if state has changed
            if (!currentState || this.hasStateChanged(currentState, newState)) {
              this.lastGameStates[matchId] = newState
              callback({
                type: "stateUpdate",
                matchId,
                data: newState
              })
            }
          }
        } catch (error) {
          console.error(`Error polling for game state updates for ${matchId}:`, error)
        }
      }, POLLING.GAME_STATE)
    }
    
    // Return combined unsubscribe function
    return () => {
      removeListener()
      
      // Stop polling if this was the last listener
      if (this.eventListeners[eventKey]?.length === 0 && this.statePollingIntervals[matchId]) {
        clearInterval(this.statePollingIntervals[matchId]!)
        this.statePollingIntervals[matchId] = null
      }
    }
  }
  
  // Helper to check if game state has changed in meaningful ways
  private hasStateChanged(oldState: GameState, newState: GameState): boolean {
    // Check status change
    if (oldState.status !== newState.status) return true
    
    // Check turn change
    if (oldState.currentTurn !== newState.currentTurn) return true
    
    // Check winner change
    if (oldState.winner !== newState.winner) return true
    
    // Check move history length change
    if (oldState.moveHistory.length !== newState.moveHistory.length) return true
    
    // Check for new players
    if (Object.keys(oldState.players).length !== Object.keys(newState.players).length) return true
    
    // Deep check would need to check card states, but let's keep it simpler
    
    return false
  }
  
  // Clean up resources
  dispose() {
    // Clear all polling intervals
    for (const matchId in this.statePollingIntervals) {
      if (this.statePollingIntervals[matchId]) {
        clearInterval(this.statePollingIntervals[matchId]!)
      }
    }
    
    // Clear connection check interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
    }
    
    // Clear event listeners
    this.eventListeners = {}
  }
}

export const aoClient = new AoClient()

// Update types.ts for new interfaces
// Add this to your types.ts file:
/*
export interface GameStateUpdate {
  type: "stateUpdate" | "error"
  matchId: string
  data: GameState | null
  error?: string
}
*/




















// // lib/ao-client.ts
// import type { AoMessage, AoResponse, GameState, Move } from "./types"
// import { isWanderAvailable } from "./wallet"

// export class AoClient {
//   private gateway: string
//   private processId: string
//   private scheduler: string
//   private walletAddress: string | null = null

//   constructor() {
//     this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://g8way.io"
//     this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
//     this.scheduler = process.env.NEXT_PUBLIC_AO_SCHEDULER || "eU8XgZWrPTkYRSNV_jOw8BGO_V3bfMzQtpIpDxVlBZw"

//     if (typeof window !== "undefined") {
//       const storedAddress = localStorage.getItem("walletAddress")
//       if (storedAddress) {
//         this.walletAddress = storedAddress
//       }
//     }
//   }

//   setWalletAddress(address: string) {
//     this.walletAddress = address
//     if (typeof window !== "undefined") {
//       localStorage.setItem("walletAddress", address)
//     }
//   }

//   async sendMessage(action: string, tags: Record<string, string> = {}): Promise<AoResponse> {
//     if (!this.walletAddress) {
//       return { status: "error", error: "Wallet not connected" }
//     }

//     if (!this.processId) {
//       return { status: "error", error: "Process ID not set. Please deploy the AO process first." }
//     }

//     try {
//       const message: AoMessage = {
//         Target: this.processId,
//         Action: action,
//         Tags: {
//           Address: this.walletAddress,
//           ...tags,
//         },
//         Data: {}
//       }

//       console.log(`Sending ${action} message to AO process ${this.processId}:`, message)

//       if (isWanderAvailable()) {
//         try {
//           const dataItem = {
//             target: this.processId,
//             tags: [
//               { name: "Action", value: action },
//               { name: "Address", value: this.walletAddress },
//               ...Object.entries(tags).map(([name, value]) => ({ name, value }))
//             ],
//             data: ""
//           }

//           // Non-null assertion after type guard
//           const response = await this.sendRawMessage(dataItem)
//           console.log(`Response from AO (${action}):`, response)
//           return {
//             status: "success",
//             data: response
//           }
//         } catch (error) {
//           console.error("Error sending message to AO:", error)
//           return this.simulateResponse(action, tags)
//         }
//       } else {
//         console.log("Wander wallet not available, using simulated response")
//         return this.simulateResponse(action, tags)
//       }
//     } catch (error) {
//       console.error("Error preparing message for AO:", error)
//       return { status: "error", error: `Failed to prepare message for AO: ${error}` }
//     }
//   }

//   // Helper method to send raw message using Wander
//   private async sendRawMessage(dataItem: any): Promise<any> {
//     if (!isWanderAvailable()) {
//       throw new Error("Wander wallet not available")
//     }

//     try {
//       // Non-null assertion after type guard
//       const signedDataItem = await window.wander!.sign(dataItem)

//       const response = await fetch(`${this.gateway}/message`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(signedDataItem),
//       })

//       if (!response.ok) {
//         const errorText = await response.text()
//         throw new Error(`Gateway error: ${response.status} ${errorText}`)
//       }

//       const result = await response.json()
//       return result
//     } catch (error) {
//       console.error("Error sending raw message:", error)
//       throw error
//     }
//   }

//   // Simulate responses for testing when Wander is not available
//   private simulateResponse(action: string, tags: Record<string, string>): AoResponse {
//     switch (action) {
//       case "JoinGame":
//         return {
//           status: "success",
//           data: {
//             success: true,
//             tokens: 10
//           }
//         }
//       case "CoordinateRoom":
//         if (tags.WagerAmount) {
//           return {
//             status: "success",
//             data: {
//               success: true,
//               roomCode: this.generateRoomCode(),
//               matchId: `match-${Date.now()}`,
//             }
//           }
//         } else if (tags.RoomCode) {
//           return {
//             status: "success",
//             data: {
//               success: true,
//               matchId: `match-${Date.now()}`,
//               opponent: "0x7654...1234",
//             }
//           }
//         }
//         return {
//           status: "error",
//           error: "Invalid room coordination request"
//         }
//       case "ProcessTurn":
//         const damage = Math.floor(Math.random() * 10) + 5
//         return {
//           status: "success",
//           data: {
//             success: true,
//             damage,
//             attackType: tags.MoveType || "Normal",
//             cardDefeated: Math.random() > 0.7,
//           }
//         }
//       case "GetMatchState":
//         return {
//           status: "success",
//           data: this.generateMockGameState(tags.MatchID || tags.RoomCode)
//         }
//       case "GetLeaderboard":
//         return {
//           status: "success",
//           data: {
//             success: true,
//             leaderboard: [
//               { address: "0x1234...5678", wins: 5, tokens: 50 },
//               { address: "0x8765...4321", wins: 3, tokens: 30 },
//               { address: "0xabcd...efgh", wins: 2, tokens: 20 },
//             ],
//           }
//         }
//       default:
//         return {
//           status: "success",
//           data: { success: true, message: `${action} simulated successfully` }
//         }
//     }
//   }

//   private generateRoomCode(): string {
//     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
//     let code = ""
//     for (let i = 0; i < 6; i++) {
//       code += chars.charAt(Math.floor(Math.random() * chars.length))
//     }
//     return code
//   }

//   private generateMockGameState(identifier: string): GameState {
//     const moveHistory: Move[] = [
//       {
//         player: "0x1234...5678",
//         cardIndex: 0,
//         targetCardIndex: 1,
//         attackType: "normal",
//         damage: 10,
//         timestamp: Date.now() - 60000,
//       },
//       {
//         player: "0x8765...4321",
//         cardIndex: 2,
//         targetCardIndex: 3,
//         attackType: "normal",
//         damage: 8,
//         timestamp: Date.now() - 30000,
//       },
//     ]
//     return {
//       status: "in_progress",
//       roomCode: identifier?.startsWith("match-") ? "ABC123" : identifier,
//       creator: "0x1234...5678",
//       wager: 10,
//       players: {
//         "0x1234...5678": {
//           address: "0x1234...5678",
//           cards: [],
//           ready: true,
//         },
//         "0x8765...4321": {
//           address: "0x8765...4321",
//           cards: [],
//           ready: true,
//         },
//       },
//       currentTurn: "0x1234...5678",
//       moveHistory,
//       winner: null,
//     }
//   }

//   async joinGame(): Promise<AoResponse> {
//     return this.sendMessage("JoinGame")
//   }

//   async createGameRoom(wager: number): Promise<AoResponse> {
//     return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
//   }

//   async joinGameRoom(roomCode: string): Promise<AoResponse> {
//     return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
//   }

//   async playCard(
//     matchId: string,
//     cardIndex: number,
//     targetCardIndex: number,
//     moveType: "normal" | "special",
//   ): Promise<AoResponse> {
//     return this.sendMessage("ProcessTurn", {
//       MatchID: matchId,
//       CardIdx: (cardIndex + 1).toString(),
//       TargetIdx: (targetCardIndex + 1).toString(),
//       MoveType: moveType === "normal" ? "Normal" : "Special",
//     })
//   }

//   async getGameState(matchId: string): Promise<AoResponse> {
//     return this.sendMessage("GetMatchState", { MatchID: matchId })
//   }

//   async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
//     return this.sendMessage("GetMatchState", { RoomCode: roomCode })
//   }

//   async getLeaderboard(): Promise<AoResponse> {
//     return this.sendMessage("GetLeaderboard")
//   }

//   async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
//     return this.sendMessage("SyncMatchState", {
//       MatchID: matchId,
//       MoveData: JSON.stringify(moveData),
//     })
//   }

//   async subscribeToGameUpdates(matchId: string, callback: (data: any) => void): Promise<() => void> {
//     const interval = setInterval(async () => {
//       try {
//         const result = await this.getGameState(matchId)
//         if (result.status === "success" && result.data) {
//           callback({
//             type: "stateUpdate",
//             matchId,
//             data: result.data
//           })
//         }
//       } catch (error) {
//         console.error("Error polling for game updates:", error)
//       }
//     }, 5000)

//     return () => clearInterval(interval)
//   }
// }

// export const aoClient = new AoClient()










// // // lib/ao-client.ts
// // import type { AoMessage, AoResponse, GameState, Move } from "./types"
// // import { isWanderAvailable } from "./wallet"

// // export class AoClient {
// //   private gateway: string
// //   private processId: string
// //   private scheduler: string
// //   private walletAddress: string | null = null

// //   constructor() {
// //     this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://g8way.io"
// //     this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
// //     this.scheduler = process.env.NEXT_PUBLIC_AO_SCHEDULER || "eU8XgZWrPTkYRSNV_jOw8BGO_V3bfMzQtpIpDxVlBZw"
    
// //     // Load wallet address from localStorage if available
// //     if (typeof window !== "undefined") {
// //       const storedAddress = localStorage.getItem("walletAddress")
// //       if (storedAddress) {
// //         this.walletAddress = storedAddress
// //       }
// //     }
// //   }

// //   setWalletAddress(address: string) {
// //     this.walletAddress = address
// //     // Save wallet address to localStorage
// //     if (typeof window !== "undefined") {
// //       localStorage.setItem("walletAddress", address)
// //     }
// //   }

// //   async sendMessage(action: string, tags: Record<string, string> = {}): Promise<AoResponse> {
// //     if (!this.walletAddress) {
// //       return { status: "error", error: "Wallet not connected" }
// //     }

// //     if (!this.processId) {
// //       return { status: "error", error: "Process ID not set. Please deploy the AO process first." }
// //     }

// //     try {
// //       // Create the message to send to AO
// //       const message: AoMessage = {
// //         Target: this.processId,
// //         Action: action,
// //         Tags: {
// //           Address: this.walletAddress,
// //           ...tags,
// //         },
// //         Data: {}
// //       }

// //       console.log(`Sending ${action} message to AO process ${this.processId}:`, message)
      
// //       if (isWanderAvailable()) {
// //         // Use Wander wallet to send real transactions
// //         try {
// //           // Prepare the message data
// //           const dataItem = {
// //             target: this.processId,
// //             tags: [
// //               { name: "Action", value: action },
// //               { name: "Address", value: this.walletAddress },
// //               ...Object.entries(tags).map(([name, value]) => ({ name, value }))
// //             ],
// //             data: ""
// //           }
          
// //           // Sign the message with Wander
// //           const response = await this.sendRawMessage(dataItem)
// //           console.log(`Response from AO (${action}):`, response)
          
// //           return { 
// //             status: "success", 
// //             data: response 
// //           }
// //         } catch (error) {
// //           console.error("Error sending message to AO:", error)
// //           return this.simulateResponse(action, tags) // Fall back to simulation if real transaction fails
// //         }
// //       } else {
// //         console.log("Wander wallet not available, using simulated response")
// //         return this.simulateResponse(action, tags)
// //       }
// //     } catch (error) {
// //       console.error("Error preparing message for AO:", error)
// //       return { status: "error", error: `Failed to prepare message for AO: ${error}` }
// //     }
// //   }

// //   // Helper method to send raw message using Wander
// //   private async sendRawMessage(dataItem: any): Promise<any> {
// //     if (!isWanderAvailable()) {
// //       throw new Error("Wander wallet not available")
// //     }
    
// //     try {
// //       // Using Wander to sign and submit the message
// //       const signedDataItem = await window.wander.sign(dataItem)
      
// //       // Now post the signed data item to the gateway
// //       const response = await fetch(`${this.gateway}/message`, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify(signedDataItem),
// //       })
      
// //       if (!response.ok) {
// //         const errorText = await response.text()
// //         throw new Error(`Gateway error: ${response.status} ${errorText}`)
// //       }
      
// //       const result = await response.json()
// //       return result
// //     } catch (error) {
// //       console.error("Error sending raw message:", error)
// //       throw error
// //     }
// //   }

// //   // Simulate responses for testing when Wander is not available
// //   private simulateResponse(action: string, tags: Record<string, string>): AoResponse {
// //     switch (action) {
// //       case "JoinGame":
// //         return { 
// //           status: "success", 
// //           data: { 
// //             success: true, 
// //             tokens: 10 
// //           } 
// //         }

// //       case "CoordinateRoom":
// //         // Check if this is a create or join request
// //         if (tags.WagerAmount) {
// //           // Create room
// //           return { 
// //             status: "success", 
// //             data: {
// //               success: true,
// //               roomCode: this.generateRoomCode(),
// //               matchId: `match-${Date.now()}`,
// //             }
// //           }
// //         } else if (tags.RoomCode) {
// //           // Join room
// //           return { 
// //             status: "success", 
// //             data: {
// //               success: true,
// //               matchId: `match-${Date.now()}`,
// //               opponent: "0x7654...1234",
// //             }
// //           }
// //         }
// //         return { 
// //           status: "error", 
// //           error: "Invalid room coordination request" 
// //         }

// //       case "ProcessTurn":
// //         const damage = Math.floor(Math.random() * 10) + 5
// //         return { 
// //           status: "success", 
// //           data: {
// //             success: true,
// //             damage,
// //             attackType: tags.MoveType || "Normal",
// //             cardDefeated: Math.random() > 0.7,
// //           }
// //         }

// //       case "GetMatchState":
// //         return { 
// //           status: "success", 
// //           data: this.generateMockGameState(tags.MatchID || tags.RoomCode) 
// //         }

// //       case "GetLeaderboard":
// //         return { 
// //           status: "success", 
// //           data: {
// //             success: true,
// //             leaderboard: [
// //               { address: "0x1234...5678", wins: 5, tokens: 50 },
// //               { address: "0x8765...4321", wins: 3, tokens: 30 },
// //               { address: "0xabcd...efgh", wins: 2, tokens: 20 },
// //             ],
// //           }
// //         }

// //       default:
// //         return { 
// //           status: "success", 
// //           data: { success: true, message: `${action} simulated successfully` } 
// //         }
// //     }
// //   }

// //   private generateRoomCode(): string {
// //     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// //     let code = ""
// //     for (let i = 0; i < 6; i++) {
// //       code += chars.charAt(Math.floor(Math.random() * chars.length))
// //     }
// //     return code
// //   }

// //   private generateMockGameState(identifier: string): GameState {
// //     const moveHistory: Move[] = [
// //       {
// //         player: "0x1234...5678",
// //         cardIndex: 0,
// //         targetCardIndex: 1,
// //         attackType: "normal",
// //         damage: 10,
// //         timestamp: Date.now() - 60000,
// //       },
// //       {
// //         player: "0x8765...4321",
// //         cardIndex: 2,
// //         targetCardIndex: 3,
// //         attackType: "normal",
// //         damage: 8,
// //         timestamp: Date.now() - 30000,
// //       },
// //     ]

// //     return {
// //       status: "in_progress",
// //       roomCode: identifier?.startsWith("match-") ? "ABC123" : identifier,
// //       creator: "0x1234...5678",
// //       wager: 10,
// //       players: {
// //         "0x1234...5678": {
// //           address: "0x1234...5678",
// //           cards: [],
// //           ready: true,
// //         },
// //         "0x8765...4321": {
// //           address: "0x8765...4321",
// //           cards: [],
// //           ready: true,
// //         },
// //       },
// //       currentTurn: "0x1234...5678",
// //       moveHistory,
// //       winner: null,
// //     }
// //   }

// //   // Real implementation methods for game actions
// //   async joinGame(): Promise<AoResponse> {
// //     return this.sendMessage("JoinGame")
// //   }

// //   async createGameRoom(wager: number): Promise<AoResponse> {
// //     return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
// //   }

// //   async joinGameRoom(roomCode: string): Promise<AoResponse> {
// //     return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
// //   }

// //   async playCard(
// //     matchId: string,
// //     cardIndex: number,
// //     targetCardIndex: number,
// //     moveType: "normal" | "special",
// //   ): Promise<AoResponse> {
// //     return this.sendMessage("ProcessTurn", {
// //       MatchID: matchId,
// //       CardIdx: (cardIndex + 1).toString(), // Adjust to 1-based indexing for Lua
// //       TargetIdx: (targetCardIndex + 1).toString(), // Adjust to 1-based indexing for Lua
// //       MoveType: moveType === "normal" ? "Normal" : "Special",
// //     })
// //   }

// //   async getGameState(matchId: string): Promise<AoResponse> {
// //     return this.sendMessage("GetMatchState", { MatchID: matchId })
// //   }

// //   async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
// //     return this.sendMessage("GetMatchState", { RoomCode: roomCode })
// //   }

// //   async getLeaderboard(): Promise<AoResponse> {
// //     return this.sendMessage("GetLeaderboard")
// //   }

// //   async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
// //     return this.sendMessage("SyncMatchState", {
// //       MatchID: matchId,
// //       MoveData: JSON.stringify(moveData),
// //     })
// //   }

// //   async subscribeToGameUpdates(matchId: string, callback: (data: any) => void): Promise<() => void> {
// //     // For development, we'll simulate updates every 5 seconds
// //     const interval = setInterval(async () => {
// //       try {
// //         const result = await this.getGameState(matchId)
// //         if (result.status === "success" && result.data) {
// //           callback({
// //             type: "stateUpdate",
// //             matchId,
// //             data: result.data
// //           })
// //         }
// //       } catch (error) {
// //         console.error("Error polling for game updates:", error)
// //       }
// //     }, 5000)

// //     return () => clearInterval(interval)
// //   }
// // }

// // export const aoClient = new AoClient()











// // // import type { AoMessage, AoResponse, GameState, Move } from "./types"

// // // export class AoClient {
// // //   private gateway: string
// // //   private processId: string
// // //   private scheduler: string
// // //   private walletAddress: string | null = null

// // //   constructor() {
// // //     this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://g8way.io"
// // //     this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
// // //     this.scheduler = process.env.NEXT_PUBLIC_AO_SCHEDULER || "eU8XgZWrPTkYRSNV_jOw8BGO_V3bfMzQtpIpDxVlBZw"
    
// // //     // Load wallet address from localStorage if available
// // //     if (typeof window !== "undefined") {
// // //       const storedAddress = localStorage.getItem("walletAddress")
// // //       if (storedAddress) {
// // //         this.walletAddress = storedAddress
// // //       }
// // //     }
// // //   }

// // //   setWalletAddress(address: string) {
// // //     this.walletAddress = address
// // //     // Save wallet address to localStorage
// // //     if (typeof window !== "undefined") {
// // //       localStorage.setItem("walletAddress", address)
// // //     }
// // //   }

// // //   async sendMessage(action: string, tags: Record<string, string> = {}): Promise<AoResponse> {
// // //     if (!this.walletAddress) {
// // //       return { status: "error", error: "Wallet not connected" }
// // //     }

// // //     if (!this.processId) {
// // //       return { status: "error", error: "Process ID not set. Please deploy the AO process first." }
// // //     }

// // //     try {
// // //       // Create the message to send to AO
// // //       const message: AoMessage = {
// // //         Target: this.processId,
// // //         Action: action,
// // //         Tags: {
// // //           Address: this.walletAddress,
// // //           ...tags,
// // //         },
// // //         Data: {}
// // //       }

// // //       console.log(`Sending ${action} message to AO process ${this.processId}:`, message)
      
// // //       // Since we're using Wander, we need to construct the message differently
// // //       if (typeof window !== "undefined" && window.wander) {
// // //         // Prepare the message data
// // //         const dataItem = {
// // //           target: this.processId,
// // //           tags: [
// // //             { name: "Action", value: action },
// // //             { name: "Address", value: this.walletAddress },
// // //             ...Object.entries(tags).map(([name, value]) => ({ name, value }))
// // //           ],
// // //           data: ""
// // //         }
        
// // //         // Sign the message with Wander
// // //         try {
// // //           // Send the message
// // //           const response = await this.sendRawMessage(dataItem)
// // //           console.log(`Response from AO (${action}):`, response)
          
// // //           return { 
// // //             status: "success", 
// // //             data: response 
// // //           }
// // //         } catch (error) {
// // //           console.error("Error sending message to AO:", error)
// // //           return { status: "error", error: `Failed to send message to AO: ${error}` }
// // //         }
// // //       } else {
// // //         return { status: "error", error: "Wander wallet not available" }
// // //       }
// // //     } catch (error) {
// // //       console.error("Error preparing message for AO:", error)
// // //       return { status: "error", error: `Failed to prepare message for AO: ${error}` }
// // //     }
// // //   }

// // //   // Helper method to send raw message using Wander
// // //   private async sendRawMessage(dataItem: any): Promise<any> {
// // //     if (!window.wander) {
// // //       throw new Error("Wander wallet not available")
// // //     }
    
// // //     try {
// // //       // Using Wander to sign and submit the message
// // //       const signedDataItem = await window.wander.sign(dataItem)
      
// // //       // Now post the signed data item to the gateway
// // //       const response = await fetch(`${this.gateway}/message`, {
// // //         method: "POST",
// // //         headers: {
// // //           "Content-Type": "application/json",
// // //         },
// // //         body: JSON.stringify(signedDataItem),
// // //       })
      
// // //       if (!response.ok) {
// // //         const errorText = await response.text()
// // //         throw new Error(`Gateway error: ${response.status} ${errorText}`)
// // //       }
      
// // //       const result = await response.json()
// // //       return result
// // //     } catch (error) {
// // //       console.error("Error sending raw message:", error)
// // //       throw error
// // //     }
// // //   }

// // //   // Real implementation methods for game actions
// // //   async joinGame(): Promise<AoResponse> {
// // //     return this.sendMessage("JoinGame")
// // //   }

// // //   async createGameRoom(wager: number): Promise<AoResponse> {
// // //     return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
// // //   }

// // //   async joinGameRoom(roomCode: string): Promise<AoResponse> {
// // //     return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
// // //   }

// // //   async playCard(
// // //     matchId: string,
// // //     cardIndex: number,
// // //     targetCardIndex: number,
// // //     moveType: "normal" | "special",
// // //   ): Promise<AoResponse> {
// // //     return this.sendMessage("ProcessTurn", {
// // //       MatchID: matchId,
// // //       CardIdx: cardIndex.toString(),
// // //       TargetIdx: targetCardIndex.toString(),
// // //       MoveType: moveType === "normal" ? "Normal" : "Special",
// // //     })
// // //   }

// // //   async getGameState(matchId: string): Promise<AoResponse> {
// // //     return this.sendMessage("GetMatchState", { MatchID: matchId })
// // //   }

// // //   async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
// // //     return this.sendMessage("GetMatchState", { RoomCode: roomCode })
// // //   }

// // //   async getLeaderboard(): Promise<AoResponse> {
// // //     return this.sendMessage("GetLeaderboard")
// // //   }

// // //   async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
// // //     return this.sendMessage("SyncMatchState", {
// // //       MatchID: matchId,
// // //       MoveData: JSON.stringify(moveData),
// // //     })
// // //   }

// // //   async subscribeToGameUpdates(matchId: string, callback: (data: any) => void): Promise<() => void> {
// // //     // In a real implementation, we'd use websockets or polling to get updates
// // //     // For now, we'll poll every 5 seconds
// // //     const interval = setInterval(async () => {
// // //       try {
// // //         const result = await this.getGameState(matchId)
// // //         if (result.status === "success" && result.data) {
// // //           callback({
// // //             type: "stateUpdate",
// // //             matchId,
// // //             data: result.data
// // //           })
// // //         }
// // //       } catch (error) {
// // //         console.error("Error polling for game updates:", error)
// // //       }
// // //     }, 5000)

// // //     return () => clearInterval(interval)
// // //   }
// // // }

// // // export const aoClient = new AoClient()









// // // // import type { AoMessage, AoResponse, GameState, Move } from "./types"

// // // // export class AoClient {
// // // //   private gateway: string
// // // //   private processId: string
// // // //   private walletAddress: string | null = null

// // // //   constructor() {
// // // //     this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://gateway.ao.xyz"
// // // //     this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
// // // //   }

// // // //   setWalletAddress(address: string) {
// // // //     this.walletAddress = address
// // // //   }

// // // //   async sendMessage(action: string, tags: Record<string, string> = {}): Promise<AoResponse> {
// // // //     if (!this.walletAddress) {
// // // //       return { status: "error", error: "Wallet not connected" }
// // // //     }

// // // //     try {
// // // //       const message: AoMessage = {
// // // //         Target: this.processId,
// // // //         Action: action,
// // // //         Tags: {
// // // //           Address: this.walletAddress,
// // // //           ...tags,
// // // //         },
// // // //         Data: {},
// // // //       }

// // // //       // In a real implementation, this would use the AO SDK to sign and send the message
// // // //       // For now, we'll simulate the response
// // // //       console.log("Sending message to AO:", message)

// // // //       // Simulate network delay
// // // //       await new Promise((resolve) => setTimeout(resolve, 1000))

// // // //       return { status: "success", data: this.simulateResponse(action, tags) }
// // // //     } catch (error) {
// // // //       console.error("Error sending message to AO:", error)
// // // //       return { status: "error", error: "Failed to send message to AO" }
// // // //     }
// // // //   }

// // // //   // This is a placeholder for simulation purposes
// // // //   // In a real implementation, this would be replaced with actual AO SDK calls
// // // //   private simulateResponse(action: string, tags: Record<string, string>): any {
// // // //     switch (action) {
// // // //       case "JoinGame":
// // // //         return { success: true, tokens: 10 }

// // // //       case "CoordinateRoom":
// // // //         // Check if this is a create or join request
// // // //         if (tags.WagerAmount) {
// // // //           // Create room
// // // //           return {
// // // //             success: true,
// // // //             roomCode: this.generateRoomCode(),
// // // //             matchId: `match-${Date.now()}`,
// // // //           }
// // // //         } else if (tags.RoomCode) {
// // // //           // Join room
// // // //           return {
// // // //             success: true,
// // // //             matchId: `match-${Date.now()}`,
// // // //             opponent: "0x1234...5678",
// // // //           }
// // // //         }
// // // //         return { success: false, error: "Invalid room coordination request" }

// // // //       case "ProcessTurn":
// // // //         const damage = Math.floor(Math.random() * 10) + 5
// // // //         return {
// // // //           success: true,
// // // //           damage,
// // // //           attackType: tags.MoveType || "Normal",
// // // //           cardDefeated: Math.random() > 0.7,
// // // //         }

// // // //       case "GetMatchState":
// // // //         return this.generateMockGameState(tags.MatchID || tags.RoomCode)

// // // //       case "GetLeaderboard":
// // // //         return {
// // // //           success: true,
// // // //           leaderboard: [
// // // //             { address: "0x1234...5678", wins: 5, tokens: 50 },
// // // //             { address: "0x8765...4321", wins: 3, tokens: 30 },
// // // //             { address: "0xabcd...efgh", wins: 2, tokens: 20 },
// // // //           ],
// // // //         }

// // // //       default:
// // // //         return { success: false, error: "Unknown action" }
// // // //     }
// // // //   }

// // // //   private generateRoomCode(): string {
// // // //     const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// // // //     let code = ""
// // // //     for (let i = 0; i < 6; i++) {
// // // //       code += chars.charAt(Math.floor(Math.random() * chars.length))
// // // //     }
// // // //     return code
// // // //   }

// // // //   private generateMockGameState(identifier: string): GameState {
// // // //     const moveHistory: Move[] = [
// // // //       {
// // // //         player: "0x1234...5678",
// // // //         cardIndex: 0,
// // // //         targetCardIndex: 1,
// // // //         attackType: "normal",
// // // //         damage: 10,
// // // //         timestamp: Date.now() - 60000,
// // // //       },
// // // //       {
// // // //         player: "0x8765...4321",
// // // //         cardIndex: 2,
// // // //         targetCardIndex: 3,
// // // //         attackType: "normal",
// // // //         damage: 8,
// // // //         timestamp: Date.now() - 30000,
// // // //       },
// // // //     ]

// // // //     return {
// // // //       status: "in_progress",
// // // //       roomCode: identifier?.startsWith("match-") ? "ABC123" : identifier,
// // // //       creator: "0x1234...5678",
// // // //       wager: 10,
// // // //       players: {
// // // //         "0x1234...5678": {
// // // //           address: "0x1234...5678",
// // // //           cards: [],
// // // //           ready: true,
// // // //         },
// // // //         "0x8765...4321": {
// // // //           address: "0x8765...4321",
// // // //           cards: [],
// // // //           ready: true,
// // // //         },
// // // //       },
// // // //       currentTurn: "0x1234...5678",
// // // //       moveHistory,
// // // //       winner: null,
// // // //     }
// // // //   }

// // // //   // Real implementation methods (to be implemented with AO SDK)
// // // //   async joinGame(): Promise<AoResponse> {
// // // //     return this.sendMessage("JoinGame")
// // // //   }

// // // //   async createGameRoom(wager: number): Promise<AoResponse> {
// // // //     return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
// // // //   }

// // // //   async joinGameRoom(roomCode: string): Promise<AoResponse> {
// // // //     return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
// // // //   }

// // // //   async playCard(
// // // //     matchId: string,
// // // //     cardIndex: number,
// // // //     targetCardIndex: number,
// // // //     moveType: "normal" | "special",
// // // //   ): Promise<AoResponse> {
// // // //     return this.sendMessage("ProcessTurn", {
// // // //       MatchID: matchId,
// // // //       CardIdx: cardIndex.toString(),
// // // //       TargetIdx: targetCardIndex.toString(),
// // // //       MoveType: moveType === "normal" ? "Normal" : "Special",
// // // //     })
// // // //   }

// // // //   async getGameState(matchId: string): Promise<AoResponse> {
// // // //     return this.sendMessage("GetMatchState", { MatchID: matchId })
// // // //   }

// // // //   async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
// // // //     return this.sendMessage("GetMatchState", { RoomCode: roomCode })
// // // //   }

// // // //   async getLeaderboard(): Promise<AoResponse> {
// // // //     return this.sendMessage("GetLeaderboard")
// // // //   }

// // // //   async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
// // // //     return this.sendMessage("SyncMatchState", {
// // // //       MatchID: matchId,
// // // //       MoveData: JSON.stringify(moveData),
// // // //     })
// // // //   }

// // // //   async subscribeToGameUpdates(matchId: string, callback: (data: any) => void): Promise<() => void> {
// // // //     // In a real implementation, this would use the AO SDK to subscribe to updates
// // // //     // For now, we'll simulate updates every 5 seconds
// // // //     const interval = setInterval(() => {
// // // //       const mockUpdate = {
// // // //         type: "stateUpdate",
// // // //         matchId,
// // // //         data: this.generateMockGameState(matchId),
// // // //       }
// // // //       callback(mockUpdate)
// // // //     }, 5000)

// // // //     return () => clearInterval(interval)
// // // //   }
// // // // }

// // // // export const aoClient = new AoClient()
