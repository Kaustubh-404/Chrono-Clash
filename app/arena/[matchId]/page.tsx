"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import GameArena from "@/components/game/game-arena"
import { ConnectionManager } from "@/components/game/connection-manager"
import { useToast } from "@/hooks/use-toast"
import { generateCardPool } from "@/lib/cards"
import { enhancedAoClient } from "@/lib/ao-client-enhanced" // Use enhanced client
import { arweaveWallet } from "@/lib/wallet"
import type { GameState, Move } from "@/lib/types"
import { LoadingScreen } from "@/components/ui/loading-screen"

export default function ArenaPage({ params }: { params: { matchId: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const matchId = params.matchId
  
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  
  // Get player address from wallet
  const [playerAddress, setPlayerAddress] = useState<string>("")

  // Initialize player address
  useEffect(() => {
    const getWalletAddress = async () => {
      try {
        // Check if wallet is connected
        if (!arweaveWallet.isConnected()) {
          try {
            // Attempt to connect wallet silently
            await arweaveWallet.connect(false) // false means no UI prompt
          } catch (error) {
            console.log("Silent wallet connection failed, will use default address")
          }
        }
        
        // Get the wallet address or use a placeholder
        const address = arweaveWallet.getAddress()
        if (address) {
          setPlayerAddress(address)
          console.log("Using wallet address:", address)
        } else {
          // Use a default address if wallet not connected
          setPlayerAddress("player-" + Math.random().toString(36).substring(2, 9))
          console.log("Using default player address")
        }
      } catch (error) {
        console.error("Error getting wallet address:", error)
        // Default player address as fallback
        setPlayerAddress("player-" + Math.random().toString(36).substring(2, 9))
      }
    }
    
    getWalletAddress()
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleConnectionChange = () => {
      setIsOffline(!navigator.onLine)
    }
    
    // Set initial status
    setIsOffline(!navigator.onLine)
    
    // Add listeners
    window.addEventListener('online', handleConnectionChange)
    window.addEventListener('offline', handleConnectionChange)
    
    // Add AO client connection listener
    const connectionListener = enhancedAoClient.addEventListener('connection', (status) => {
      if (status.status === 'connected' && isReconnecting) {
        setIsReconnecting(false)
      }
    })
    
    return () => {
      window.removeEventListener('online', handleConnectionChange)
      window.removeEventListener('offline', handleConnectionChange)
      connectionListener()
    }
  }, [isReconnecting])

  // Initialize game state
  useEffect(() => {
    const initializeGame = async () => {
      if (!playerAddress) return // Wait for player address to be set
      
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch game state using enhanced client with offline support
        const response = await enhancedAoClient.getGameState(matchId)
        
        if (response.status === "success" && response.data) {
          console.log("Game state fetched:", response.data)
          
          // Create game state and initialize cards if needed
          let initialGameState = response.data as GameState
          
          // Initialize players structure if it doesn't exist
          if (!initialGameState.players) {
            initialGameState.players = {}
          }
          
          // Ensure current player is in the game state
          if (!initialGameState.players[playerAddress]) {
            initialGameState.players[playerAddress] = {
              address: playerAddress,
              cards: [],
              ready: true
            }
          }
          
          // If players don't have cards initialized, do it now
          Object.keys(initialGameState.players).forEach(playerAddr => {
            if (!initialGameState.players?.[playerAddr].cards || 
                initialGameState.players[playerAddr].cards.length === 0) {
              if (initialGameState.players) {
                initialGameState.players[playerAddr].cards = generateCardPool()
              }
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
        setIsInitialLoad(false)
      }
    }
    
    if (playerAddress) {
      initializeGame()
    }
    
    // Subscribe to game updates with enhanced client
    let unsubscribeFunc: (() => void) | undefined
    
    const setupSubscription = async () => {
      if (!playerAddress) return // Wait for player address
      
      try {
        // Await the Promise to get the unsubscribe function
        const unsubscribe = await enhancedAoClient.subscribeToGameUpdates(matchId, (update) => {
          if (update.type === "stateUpdate") {
            console.log("Game state updated:", update.data)
            setGameState(prevState => {
              if (!prevState) return update.data as GameState
              
              // Make sure cards are preserved between updates
              const mergedState = {...update.data} as GameState
              
              // Ensure players object exists
              if (!mergedState.players) {
                mergedState.players = {}
              }
              
              // Ensure current player is in the game state
              if (!mergedState.players[playerAddress]) {
                mergedState.players[playerAddress] = {
                  address: playerAddress,
                  cards: [],
                  ready: true
                }
              }
              
              if (mergedState.players) {
                Object.keys(mergedState.players).forEach(playerAddr => {
                  if (!mergedState.players?.[playerAddr].cards || 
                      mergedState.players[playerAddr].cards.length === 0) {
                    
                    // Try to get cards from previous state
                    if (prevState.players?.[playerAddr]?.cards) {
                      if (mergedState.players) {
                        mergedState.players[playerAddr].cards = prevState.players[playerAddr].cards
                      }
                    } else {
                      // Initialize with new cards if none exist
                      if (mergedState.players) {
                        mergedState.players[playerAddr].cards = generateCardPool()
                      }
                    }
                  }
                })
              }
              
              return mergedState
            })
          } else if (update.type === "connection") {
            // Handle connection state updates
            // The update.data here has a connection status, not a game status
            if (update.data && typeof update.data === 'object' && 'status' in update.data) {
              const connectionStatus = update.data.status as string;
              setIsOffline(connectionStatus === "disconnected")
            }
          }
        })
        
        unsubscribeFunc = unsubscribe
      } catch (error) {
        console.error("Error setting up subscription:", error)
      }
    }
    
    if (playerAddress) {
      setupSubscription()
    }
    
    // Listen for connection changes
    const connectionListener = enhancedAoClient.addEventListener('connection', (status) => {
      const connectionStatus = status.status as string;
      
      if (connectionStatus === 'connected' && isReconnecting) {
        // Force sync when reconnecting
        enhancedAoClient.forceSyncGameState(matchId).then(() => {
          setIsReconnecting(false)
          toast({
            title: "Reconnected",
            description: "Game state has been synchronized",
            variant: "default",
          })
        })
      }
      
      setIsOffline(connectionStatus === 'disconnected')
    })
    
    // Handle online/offline events
    const handleConnectionChange = () => {
      if (navigator.onLine && isOffline) {
        setIsReconnecting(true)
        toast({
          title: "Reconnecting",
          description: "Attempting to restore connection...",
          variant: "default",
        })
      }
    }
    
    window.addEventListener('online', handleConnectionChange)
    
    return () => {
      // Cleanup function
      if (unsubscribeFunc) {
        unsubscribeFunc()
      }
      
      connectionListener()
      window.removeEventListener('online', handleConnectionChange)
    }
  }, [matchId, toast, isOffline, isReconnecting, playerAddress])

  // Handle player moves with offline support
  const handlePlayerMove = async (move: Move): Promise<boolean> => {
    if (!gameState || !playerAddress) return false
    
    try {
      // Use enhanced client for move processing with offline support
      const result = await enhancedAoClient.playCard(
        matchId,
        playerAddress,
        move.cardIndex,
        move.targetCardIndex,
        move.attackType,
        gameState
      )
      
      if (!result.success) {
        toast({
          title: "Move failed",
          description: "Failed to process your move. Please try again.",
          variant: "destructive",
        })
        return false
      }
      
      // If we get an updated state, use it
      if (result.gameState) {
        setGameState(result.gameState)
      }
      
      // Show "offline mode" message if needed
      if (enhancedAoClient.isOffline()) {
        toast({
          title: "Offline mode",
          description: "Your move will be synchronized when you're back online",
          variant: "default",
        })
      }
      
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

  // Retry connection when offline
  const handleRetryConnection = async () => {
    if (!isOffline) return
    
    setIsReconnecting(true)
    
    try {
      // Force sync with server
      const success = await enhancedAoClient.forceSyncGameState(matchId)
      
      if (success) {
        toast({
          title: "Connection restored",
          description: "Game state has been synchronized",
          variant: "default",
        })
        
        setIsOffline(false)
      } else {
        toast({
          title: "Still offline",
          description: "Could not connect to the game server. Please try again later.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error retrying connection:", error)
      toast({
        title: "Connection failed",
        description: "Could not connect to the game server",
        variant: "destructive",
      })
    } finally {
      setIsReconnecting(false)
    }
  }

  // Wait for player address to be set
  if (!playerAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Initializing Wallet...</h2>
          <p className="text-gray-400">Connecting to your Wander wallet</p>
        </div>
      </div>
    )
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
    <>
      <GameArena 
        gameState={gameState}
        playerAddress={playerAddress}
        onExit={handleExit}
        onMove={handlePlayerMove}
        isOffline={isOffline}
        onRetryConnection={handleRetryConnection}
        isReconnecting={isReconnecting}
      />
      
      {/* Connection manager for offline handling */}
      <ConnectionManager />
    </>
  )
}



