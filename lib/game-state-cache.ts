// lib/game-state-cache.ts
import type { GameState, Move } from "./types";

/**
 * GameStateCache handles local caching of game states for offline support
 * and quick recovery from network issues
 */
export class GameStateCache {
  private static STORAGE_PREFIX = "chronoclash_game_";
  private static CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  /**
   * Save game state to local storage
   */
  static saveGameState(matchId: string, gameState: GameState): void {
    if (!matchId || !gameState) return;
    
    try {
      const cacheEntry = {
        timestamp: Date.now(),
        gameState,
        lastSyncedMoveCount: gameState.moveHistory.length
      };
      
      localStorage.setItem(
        `${this.STORAGE_PREFIX}${matchId}`, 
        JSON.stringify(cacheEntry)
      );
      
      // Update the active games list
      this.updateActiveGamesList(matchId, gameState);
    } catch (error) {
      console.error("Failed to cache game state:", error);
    }
  }
  
  /**
   * Load game state from local storage
   */
  static loadGameState(matchId: string): {
    gameState: GameState | null,
    lastSyncedMoveCount: number
  } {
    if (!matchId) return { gameState: null, lastSyncedMoveCount: 0 };
    
    try {
      const cacheEntry = localStorage.getItem(`${this.STORAGE_PREFIX}${matchId}`);
      if (!cacheEntry) return { gameState: null, lastSyncedMoveCount: 0 };
      
      const { timestamp, gameState, lastSyncedMoveCount } = JSON.parse(cacheEntry);
      
      // Check if the cache has expired
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        this.clearGameState(matchId);
        return { gameState: null, lastSyncedMoveCount: 0 };
      }
      
      return { gameState, lastSyncedMoveCount: lastSyncedMoveCount || 0 };
    } catch (error) {
      console.error("Failed to load cached game state:", error);
      return { gameState: null, lastSyncedMoveCount: 0 };
    }
  }
  
  /**
   * Clear a specific game state from local storage
   */
  static clearGameState(matchId: string): void {
    if (!matchId) return;
    
    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${matchId}`);
      this.removeFromActiveGamesList(matchId);
    } catch (error) {
      console.error("Failed to clear cached game state:", error);
    }
  }
  
  /**
   * Save pending moves that need to be synced when connection is restored
   */
  static savePendingMove(matchId: string, move: Move): void {
    if (!matchId || !move) return;
    
    try {
      const pendingMovesKey = `${this.STORAGE_PREFIX}${matchId}_pending_moves`;
      const existingMoves = this.getPendingMoves(matchId);
      
      existingMoves.push(move);
      
      localStorage.setItem(
        pendingMovesKey,
        JSON.stringify(existingMoves)
      );
    } catch (error) {
      console.error("Failed to cache pending move:", error);
    }
  }
  
  /**
   * Get all pending moves for a match
   */
  static getPendingMoves(matchId: string): Move[] {
    if (!matchId) return [];
    
    try {
      const pendingMovesKey = `${this.STORAGE_PREFIX}${matchId}_pending_moves`;
      const pendingMoves = localStorage.getItem(pendingMovesKey);
      
      if (!pendingMoves) return [];
      
      return JSON.parse(pendingMoves);
    } catch (error) {
      console.error("Failed to get pending moves:", error);
      return [];
    }
  }
  
  /**
   * Clear pending moves after they've been synced
   */
  static clearPendingMoves(matchId: string): void {
    if (!matchId) return;
    
    try {
      const pendingMovesKey = `${this.STORAGE_PREFIX}${matchId}_pending_moves`;
      localStorage.removeItem(pendingMovesKey);
    } catch (error) {
      console.error("Failed to clear pending moves:", error);
    }
  }
  
  /**
   * Maintain a list of active games for the current user
   */
  private static updateActiveGamesList(matchId: string, gameState: GameState): void {
    try {
      const activeGamesKey = `${this.STORAGE_PREFIX}active_games`;
      let activeGames = this.getActiveGames();
      
      // Update or add the game entry
      activeGames = activeGames.filter(game => game.matchId !== matchId);
      
      activeGames.push({
        matchId,
        roomCode: gameState.roomCode,
        lastUpdated: Date.now(),
        status: gameState.status,
        wager: gameState.wager,
        creator: gameState.creator,
        opponentCount: Object.keys(gameState.players).length - 1
      });
      
      // Sort by last updated (most recent first)
      activeGames.sort((a, b) => b.lastUpdated - a.lastUpdated);
      
      // Store only the 10 most recent games
      activeGames = activeGames.slice(0, 10);
      
      localStorage.setItem(activeGamesKey, JSON.stringify(activeGames));
    } catch (error) {
      console.error("Failed to update active games list:", error);
    }
  }
  
  /**
   * Remove a game from the active games list
   */
  private static removeFromActiveGamesList(matchId: string): void {
    try {
      const activeGamesKey = `${this.STORAGE_PREFIX}active_games`;
      let activeGames = this.getActiveGames();
      
      activeGames = activeGames.filter(game => game.matchId !== matchId);
      
      localStorage.setItem(activeGamesKey, JSON.stringify(activeGames));
    } catch (error) {
      console.error("Failed to remove from active games list:", error);
    }
  }
  
  /**
   * Get list of active games
   */
  static getActiveGames(): Array<{
    matchId: string;
    roomCode: string;
    lastUpdated: number;
    status: string;
    wager: number;
    creator: string;
    opponentCount: number;
  }> {
    try {
      const activeGamesKey = `${this.STORAGE_PREFIX}active_games`;
      const activeGamesJson = localStorage.getItem(activeGamesKey);
      
      if (!activeGamesJson) return [];
      
      const activeGames = JSON.parse(activeGamesJson);
      
      // Filter out expired games
      const now = Date.now();
      return activeGames.filter((game: any) => 
        now - game.lastUpdated < this.CACHE_EXPIRY
      );
    } catch (error) {
      console.error("Failed to get active games:", error);
      return [];
    }
  }
  
  /**
   * Cleanup expired game states
   */
  static cleanupExpiredGameStates(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const now = Date.now();
      const prefix = this.STORAGE_PREFIX;
      
      // Iterate through localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        
        // Skip non-game state entries
        if (key.includes('_pending_moves') || key === `${prefix}active_games`) continue;
        
        try {
          const cacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          if (now - cacheEntry.timestamp > this.CACHE_EXPIRY) {
            localStorage.removeItem(key);
            
            // Also remove associated pending moves
            const matchId = key.replace(prefix, '');
            localStorage.removeItem(`${prefix}${matchId}_pending_moves`);
          }
        } catch (e) {
          // Skip invalid entries
          console.warn("Invalid cache entry:", key);
        }
      }
      
      // Clean up active games list too
      this.getActiveGames(); // This already filters out expired games
    } catch (error) {
      console.error("Failed to cleanup expired game states:", error);
    }
  }
}

// Call cleanup on module load
if (typeof window !== 'undefined') {
  // Wait until after page load to avoid blocking rendering
  setTimeout(() => {
    GameStateCache.cleanupExpiredGameStates();
  }, 2000);
}