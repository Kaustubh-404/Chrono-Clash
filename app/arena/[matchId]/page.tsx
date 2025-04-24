"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import GameArena from "@/components/game/game-arena"
import { AttackAnimation } from "@/components/game/attack-animation"
import { useToast } from "@/hooks/use-toast"
import { generateCardPool } from "@/lib/cards"
import { applyMove } from "@/lib/game-utils"
import { aoClient } from "@/lib/ao-client"
import { arweaveWallet } from "@/lib/wallet"
import type { GameState, Card as CardType, Move } from "@/lib/types"

// Component no longer uses params from the props
// Instead, it gets matchId directly from the layout via props
export default function ArenaPage({ matchId }: { matchId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Get player address from wallet
  const playerAddress = arweaveWallet.getAddress() || "0x1234...5678"

  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch game state from AO
        const response = await aoClient.getGameState(matchId)
        
        if (response.status === "success" && response.data) {
          console.log("Game state fetched:", response.data)
          
          // Create game state and initialize cards if needed
          let initialGameState = response.data as GameState
          
          // If players don't have cards initialized, do it now
          Object.keys(initialGameState.players).forEach(playerAddr => {
            if (!initialGameState.players[playerAddr].cards || 
                initialGameState.players[playerAddr].cards.length === 0) {
              initialGameState.players[playerAddr].cards = generateCardPool()
            }
          })
          
          setGameState(initialGameState)
        } else {
          // Handle error
          setError(response.error || "Failed to load game state")
          toast({
            title: "Failed to load game",
            description: response.error || "Could not load the game state",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error initializing game:", error)
        setError("An unexpected error occurred")
        toast({
          title: "Error",
          description: "Failed to connect to the game server",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initializeGame()
    
    // Subscribe to game updates
    let unsubscribeFunc: (() => void) | undefined
    
    const setupSubscription = async () => {
      try {
        // Await the Promise to get the unsubscribe function
        const unsubscribe = await aoClient.subscribeToGameUpdates(matchId, (update) => {
          if (update.type === "stateUpdate") {
            console.log("Game state updated:", update.data)
            setGameState(prevState => {
              if (!prevState) return update.data
              
              // Make sure cards are preserved between updates
              const mergedState = {...update.data}
              
              Object.keys(mergedState.players).forEach(playerAddr => {
                if (!mergedState.players[playerAddr].cards || 
                    mergedState.players[playerAddr].cards.length === 0) {
                  
                  // Try to get cards from previous state
                  if (prevState.players[playerAddr]?.cards) {
                    mergedState.players[playerAddr].cards = prevState.players[playerAddr].cards
                  } else {
                    // Initialize with new cards if none exist
                    mergedState.players[playerAddr].cards = generateCardPool()
                  }
                }
              })
              
              return mergedState
            })
          }
        })
        
        unsubscribeFunc = unsubscribe
      } catch (error) {
        console.error("Error setting up subscription:", error)
      }
    }
    
    setupSubscription()
    
    return () => {
      // Cleanup function
      if (unsubscribeFunc) {
        unsubscribeFunc()
      }
    }
  }, [matchId, toast])

  // Handle player moves
  const handlePlayerMove = async (move: Move): Promise<boolean> => {
    if (!gameState) return false
    
    try {
      // Apply move locally for immediate feedback
      const updatedGameState = applyMove(gameState, move)
      setGameState(updatedGameState)
      
      // Send move to AO
      const response = await aoClient.playCard(
        matchId, 
        move.cardIndex,
        move.targetCardIndex, 
        move.attackType
      )
      
      if (response.status !== "success") {
        // Revert state if move fails on AO
        toast({
          title: "Move failed",
          description: response.error || "Failed to process your move",
          variant: "destructive",
        })
        return false
      }
      
      console.log("Move processed:", response.data)
      
      // If move was successful, sync state with AO
      await aoClient.syncMatchState(matchId, { 
        Damage: move.damage,
        CardIdx: move.cardIndex + 1, // Adjust to 1-based for Lua
        TargetIdx: move.targetCardIndex + 1 // Adjust to 1-based for Lua
      })
      
      return true
    } catch (error) {
      console.error("Error processing move:", error)
      toast({
        title: "Error",
        description: "Failed to process your move. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  // Exit arena and return to home
  const handleExit = () => {
    router.push("/")
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Loading Arena...</h2>
          <p className="text-gray-400">Connecting to the AO process</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Game</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={handleExit}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameArena 
      gameState={gameState}
      playerAddress={playerAddress}
      onExit={handleExit}
      onMove={handlePlayerMove}
    />
  )
}



