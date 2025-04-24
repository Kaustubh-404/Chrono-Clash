"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Copy, ArrowRight, Coins, Share2, RefreshCw, Wand2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { enhancedAoClient } from "@/lib/ao-client-enhanced" // Updated to enhanced client
import { arweaveWallet } from "@/lib/wallet"
import { WalletBalance } from "@/components/wallet/wallet-balance"
import { TokenTransaction } from "@/components/wallet/token-transaction"
import { PokemonLogoAnimation } from "@/components/game/pokemon-logo-animation"

// Type for room creation steps
type CreationStep = "connect" | "configure" | "wager" | "creating" | "waiting" | "ready"

export default function CreateRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [wager, setWager] = useState<number>(10)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [step, setStep] = useState<CreationStep>("connect")
  const [joinInterval, setJoinInterval] = useState<NodeJS.Timeout | null>(null)
  const [waitingTime, setWaitingTime] = useState(0)
  const [animateRoomCode, setAnimateRoomCode] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  // Check if wallet is connected on load
  useEffect(() => {
    if (arweaveWallet.isConnected()) {
      setStep("configure")
    }
    
    const unsub = arweaveWallet.addConnectionListener((address) => {
      if (address) {
        setStep("configure")
      } else {
        setStep("connect")
      }
    })
    
    return () => unsub()
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleConnectionChange = () => {
      setIsOffline(!navigator.onLine)
    }
    
    // Set initial state
    setIsOffline(!navigator.onLine)
    
    // Listen for connection changes
    window.addEventListener('online', handleConnectionChange)
    window.addEventListener('offline', handleConnectionChange)
    
    // Listen for AO client connection changes 
    const connectionListener = enhancedAoClient.addEventListener('connection', (status) => {
      if (status.status === 'connected' && isReconnecting) {
        setIsReconnecting(false)
        toast({
          title: "Connection restored",
          description: "You're back online",
          variant: "default"
        })
      }
    })
    
    return () => {
      window.removeEventListener('online', handleConnectionChange)
      window.removeEventListener('offline', handleConnectionChange)
      connectionListener()
    }
  }, [isReconnecting, toast])

  // Get balance when wallet is connected
  useEffect(() => {
    const getBalance = async () => {
      if (arweaveWallet.isConnected()) {
        setIsLoadingBalance(true)
        try {
          const balance = await arweaveWallet.getBalance()
          setAvailableBalance(balance)
        } catch (error) {
          console.error("Failed to get wallet balance", error)
          setAvailableBalance(0)
        } finally {
          setIsLoadingBalance(false)
        }
      }
    }

    getBalance()
    
    const unsub = arweaveWallet.addBalanceListener((balance) => {
      setAvailableBalance(balance)
    })
    
    return () => unsub()
  }, [])
  
  // Timer for waiting room
  useEffect(() => {
    if (step === "waiting") {
      const interval = setInterval(() => {
        setWaitingTime((prev) => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    } else {
      setWaitingTime(0)
    }
  }, [step])
  
  // Check for opponent join
  useEffect(() => {
    if (step === "waiting" && matchId && roomCode) {
      // Set up polling to check if opponent has joined
      const interval = setInterval(async () => {
        try {
          if (isOffline) return // Skip polling if offline
          
          const response = await enhancedAoClient.getGameState(matchId)
          if (response.status === "success" && response.data) {
            const gameState = response.data
            
            // If we have more than one player or game is in progress, opponent has joined
            if (gameState.status === "in_progress" || Object.keys(gameState.players).length > 1) {
              clearInterval(interval)
              setJoinInterval(null)
              setStep("ready")
              
              // Play sound effect
              const audio = new Audio("/sounds/opponent-joined.mp3")
              audio.volume = 0.5
              audio.play().catch(e => console.log("Couldn't play sound", e))
              
              toast({
                title: "Opponent has joined!",
                description: "Get ready for battle!",
                variant: "default",
              })
            }
          }
        } catch (error) {
          console.error("Error checking for opponent:", error)
        }
      }, 3000)
      
      setJoinInterval(interval)
      
      return () => {
        clearInterval(interval)
        setJoinInterval(null)
      }
    }
  }, [step, matchId, roomCode, toast, isOffline])

  const handleWagerChange = (value: number[]) => {
    setWager(value[0])
  }

  const handleConnectWallet = async () => {
    try {
      await arweaveWallet.connect()
      setStep("configure")
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      toast({
        title: "Connection Failed",
        description: "Could not connect to your wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateRoom = async () => {
    if (!arweaveWallet.isConnected()) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (wager > availableBalance) {
      toast({
        title: "Insufficient balance",
        description: `You need at least ${wager} AR to create this room`,
        variant: "destructive",
      })
      return
    }
    
    // Show transaction confirmation
    setShowTransactionDialog(true)
  }
  
  const handleTransactionSuccess = async (txId: string) => {
    setShowTransactionDialog(false)
    setStep("creating")
    setTxError(null)
    
    try {
      // Check if we're offline
      if (isOffline || enhancedAoClient.isOffline()) {
        toast({
          title: "You're offline",
          description: "Game room will be created when you're back online",
          variant: "default",
        })
        
        // In a real implementation, you would queue this request for later
        // For now, we'll simulate a failure to create room while offline
        
        if (isOffline) {
          setStep("configure")
          toast({
            title: "Cannot create room while offline",
            description: "Please try again when you're online",
            variant: "destructive",
          })
          return
        }
      }
      
      const response = await enhancedAoClient.createGameRoom(wager)

      if (response.status === "success" && response.data) {
        console.log("Game room created:", response.data)
        
        // Play sound effect
        const audio = new Audio("/sounds/room-created.mp3")
        audio.volume = 0.5
        audio.play().catch(e => console.log("Couldn't play sound", e))
        
        setRoomCode(response.data.roomCode)
        setMatchId(response.data.matchId)
        setStep("waiting")
        setAnimateRoomCode(true)
        
        // Stop room code animation after a few seconds
        setTimeout(() => setAnimateRoomCode(false), 2000)
        
        toast({
          title: "Room created",
          description: `Share room code: ${response.data.roomCode} with your opponent`,
          variant: "default",
        })
      } else {
        // Handle error
        setStep("configure")
        toast({
          title: "Failed to create room",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating room:", error)
      setStep("configure")
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the room",
        variant: "destructive",
      })
    }
  }
  
  const handleTransactionError = (error: string) => {
    setTxError(error)
    setTimeout(() => setShowTransactionDialog(false), 3000)
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      toast({
        title: "Copied",
        description: "Room code copied to clipboard",
        variant: "default",
      })
      
      // Play sound effect
      const audio = new Audio("/sounds/copy.mp3")
      audio.volume = 0.3
      audio.play().catch(e => console.log("Couldn't play sound", e))
    }
  }
  
  const shareRoom = async () => {
    if (roomCode) {
      // Check if web share API is available
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Join my ChronoClash game!',
            text: `Join my game with room code: ${roomCode}`,
            url: window.location.origin
          })
        } catch (error) {
          console.error('Error sharing:', error)
          copyRoomCode() // Fallback to copying
        }
      } else {
        // Fallback for browsers that don't support sharing
        copyRoomCode()
      }
    }
  }

  const enterArena = () => {
    if (matchId) {
      // Clear any polling interval
      if (joinInterval) {
        clearInterval(joinInterval)
        setJoinInterval(null)
      }
      
      router.push(`/arena/${matchId}`)
    }
  }

  const refreshBalance = async () => {
    if (!arweaveWallet.isConnected()) return
    
    setIsLoadingBalance(true)
    try {
      const balance = await arweaveWallet.getBalance(true)
      setAvailableBalance(balance)
      toast({
        title: "Balance updated",
        description: `Current balance: ${balance.toFixed(4)} AR`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to refresh balance", error)
      toast({
        title: "Error",
        description: "Failed to refresh wallet balance",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBalance(false)
    }
  }
  
  const cancelRoom = () => {
    // Clear any polling interval
    if (joinInterval) {
      clearInterval(joinInterval)
      setJoinInterval(null)
    }
    
    // Reset state and go back to configure step
    setRoomCode(null)
    setMatchId(null)
    setStep("configure")
    
    toast({
      title: "Room cancelled",
      description: "Your game room has been cancelled",
      variant: "default",
    })
  }

  const maxWager = Math.min(100, Math.max(availableBalance, 1))
  
  // Format waiting time
  const formatWaitingTime = () => {
    const minutes = Math.floor(waitingTime / 60)
    const seconds = waitingTime % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center justify-between">
            <span>Create Game Room</span>
            {step !== "connect" && <ConnectWallet />}
          </CardTitle>
          <CardDescription className="text-gray-300">
            Set a wager amount and create a room for your opponent to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isOffline && (
            <div className="bg-red-900/30 border border-red-700 rounded-md p-3 text-sm text-red-300 animate-pulse">
              You're currently offline. Some features may be limited.
            </div>
          )}
        
          {step === "connect" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-300">
                  Connect your Wander wallet to create a game room and challenge opponents.
                </p>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4 w-full">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-cyan-600/20 p-2 mr-3">
                      <Coins className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Wager Tokens</h4>
                      <p className="text-xs text-gray-400">Bet AR tokens on your victory</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="rounded-full bg-purple-600/20 p-2 mr-3">
                      <Wand2 className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Claim Prizes</h4>
                      <p className="text-xs text-gray-400">Winners take the entire prize pool</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleConnectWallet} 
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={isOffline}
              >
                Connect Wallet
              </Button>
              
              {isOffline && (
                <p className="text-xs text-gray-400">
                  You must be online to connect your wallet
                </p>
              )}
            </div>
          )}

          {step === "configure" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="wager" className="text-white">
                    Wager Amount (AR)
                  </Label>
                  <div className="text-sm flex items-center gap-2">
                    <span className="text-gray-400">Balance:</span>
                    {isLoadingBalance ? (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    ) : (
                      <span className="text-cyan-400 font-mono">{availableBalance.toFixed(4)} AR</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refreshBalance}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <Slider
                    defaultValue={[10]}
                    max={maxWager}
                    min={1}
                    step={1}
                    value={[wager]}
                    onValueChange={handleWagerChange}
                    className="flex-1"
                  />
                  <Input
                    id="wager"
                    type="number"
                    min="1"
                    max={maxWager}
                    value={wager}
                    onChange={(e) => setWager(Number(e.target.value))}
                    className="bg-gray-700 border-gray-600 text-white w-20 text-right"
                  />
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  This amount will be deducted from your wallet when creating the room. 
                  Winner takes the entire prize pool.
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-300">Your Stake:</div>
                  <div className="font-mono text-amber-400">{wager.toFixed(2)} AR</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-300">Opponent's Stake:</div>
                  <div className="font-mono text-amber-400">{wager.toFixed(2)} AR</div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                  <div className="text-sm font-medium text-gray-200">Total Prize Pool:</div>
                  <div className="font-mono text-green-400 font-bold">{(wager * 2).toFixed(2)} AR</div>
                </div>
              </div>

              <Button
                onClick={handleCreateRoom}
                disabled={isLoadingBalance || !arweaveWallet.isConnected() || wager > availableBalance || isOffline}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                Create Room
              </Button>
              
              {isOffline && (
                <p className="text-xs text-center text-red-400">
                  You must be online to create a room
                </p>
              )}
            </div>
          )}
          
          {step === "creating" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
              <h3 className="text-xl font-bold text-white">Creating Room...</h3>
              <p className="text-gray-400 text-center">
                Setting up your battle arena with the AO process.
                <br />This may take a few moments.
              </p>
              
              {isReconnecting && (
                <div className="text-sm text-amber-400 animate-pulse">
                  Reconnecting to server...
                </div>
              )}
            </div>
          )}
          
          {step === "waiting" && roomCode && (
            <div className="space-y-6">
              <div className="p-6 bg-gray-700 rounded-md text-center relative overflow-hidden">
                {animateRoomCode && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-20 w-20 text-amber-500 animate-pulse" />
                  </div>
                )}
                <div className="text-sm text-gray-400 mb-1">Room Code</div>
                <div className={`flex justify-center gap-3 items-center transition-all duration-500 ${animateRoomCode ? 'scale-125' : ''}`}>
                  <div className="text-3xl font-mono tracking-wider text-white">{roomCode}</div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={copyRoomCode} className="hover:bg-gray-600">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={shareRoom} className="hover:bg-gray-600">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-300 space-y-2">
                <p>Share this code with your opponent. The game will start once they join.</p>
                <p className="text-xs text-amber-300">You've staked {wager.toFixed(2)} AR for this match.</p>
              </div>
              
              <div className="flex flex-col items-center pt-4 space-y-2">
                <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
                  <span>Waiting for opponent to join... ({formatWaitingTime()})</span>
                </div>
                
                <div className="w-full mt-4">
                  <Button variant="outline" onClick={cancelRoom} className="w-full">
                    Cancel Room
                  </Button>
                </div>
              </div>
              
              {isOffline && (
                <div className="bg-amber-900/30 border border-amber-700 rounded-md p-3 text-sm text-amber-300">
                  <p className="font-semibold mb-1">You're currently offline</p>
                  <p className="text-xs">
                    Your room is still valid! When you're back online, opponents will be able to join.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {step === "ready" && (
            <div className="flex flex-col items-center py-6 space-y-6">
              <div className="text-center">
                <PokemonLogoAnimation text="Opponent Found!" />
                <p className="text-gray-300 mt-4">
                  Your opponent has joined the battle arena! Prepare for combat!
                </p>
              </div>
              
              <div className="w-full bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                <span className="text-gray-400 text-sm mb-2">Total Prize Pool</span>
                <span className="text-green-400 text-3xl font-bold font-mono">{(wager * 2).toFixed(2)} AR</span>
              </div>
            </div>
          )}
        </CardContent>
        
        {(step === "ready" || step === "waiting") && matchId && (
          <CardFooter>
            <Button 
              onClick={enterArena} 
              className="w-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center h-12 text-lg"
              disabled={isOffline && step === "waiting"}
            >
              Enter Arena <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Wager</DialogTitle>
            <DialogDescription>
              You're about to stake {wager} AR tokens to create a game room.
            </DialogDescription>
          </DialogHeader>
          
          {txError ? (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
              <h4 className="font-medium text-white mb-1">Transaction Failed</h4>
              <p className="text-sm text-red-300">{txError}</p>
            </div>
          ) : (
            <TokenTransaction
              amount={wager}
              purpose="Game Room Creation"
              onSuccess={handleTransactionSuccess}
              onError={handleTransactionError}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}












// "use client"

// import { useState, useEffect } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Slider } from "@/components/ui/slider"
// import { ConnectWallet } from "@/components/wallet/connect-wallet"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// import { Loader2, Copy, ArrowRight, Coins, Share2, RefreshCw, Wand2, Sparkles } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { aoClient } from "@/lib/ao-client"
// import { arweaveWallet } from "@/lib/wallet"
// import { WalletBalance } from "@/components/wallet/wallet-balance"
// import { TokenTransaction } from "@/components/wallet/token-transaction"
// import { PokemonLogoAnimation } from "@/components/game/pokemon-logo-animation"

// // Type for room creation steps
// type CreationStep = "connect" | "configure" | "wager" | "creating" | "waiting" | "ready"

// export default function CreateRoomPage() {
//   const router = useRouter()
//   const { toast } = useToast()
//   const [wager, setWager] = useState<number>(10)
//   const [roomCode, setRoomCode] = useState<string | null>(null)
//   const [matchId, setMatchId] = useState<string | null>(null)
//   const [availableBalance, setAvailableBalance] = useState<number>(0)
//   const [isLoadingBalance, setIsLoadingBalance] = useState(false)
//   const [showTransactionDialog, setShowTransactionDialog] = useState(false)
//   const [txError, setTxError] = useState<string | null>(null)
//   const [step, setStep] = useState<CreationStep>("connect")
//   const [joinInterval, setJoinInterval] = useState<NodeJS.Timeout | null>(null)
//   const [waitingTime, setWaitingTime] = useState(0)
//   const [animateRoomCode, setAnimateRoomCode] = useState(false)
  
//   // Check if wallet is connected on load
//   useEffect(() => {
//     if (arweaveWallet.isConnected()) {
//       setStep("configure")
//     }
    
//     const unsub = arweaveWallet.addConnectionListener((address) => {
//       if (address) {
//         setStep("configure")
//       } else {
//         setStep("connect")
//       }
//     })
    
//     return () => unsub()
//   }, [])

//   // Get balance when wallet is connected
//   useEffect(() => {
//     const getBalance = async () => {
//       if (arweaveWallet.isConnected()) {
//         setIsLoadingBalance(true)
//         try {
//           const balance = await arweaveWallet.getBalance()
//           setAvailableBalance(balance)
//         } catch (error) {
//           console.error("Failed to get wallet balance", error)
//           setAvailableBalance(0)
//         } finally {
//           setIsLoadingBalance(false)
//         }
//       }
//     }

//     getBalance()
    
//     const unsub = arweaveWallet.addBalanceListener((balance) => {
//       setAvailableBalance(balance)
//     })
    
//     return () => unsub()
//   }, [])
  
//   // Timer for waiting room
//   useEffect(() => {
//     if (step === "waiting") {
//       const interval = setInterval(() => {
//         setWaitingTime((prev) => prev + 1)
//       }, 1000)
      
//       return () => clearInterval(interval)
//     } else {
//       setWaitingTime(0)
//     }
//   }, [step])
  
//   // Check for opponent join
//   useEffect(() => {
//     if (step === "waiting" && matchId && roomCode) {
//       // Set up polling to check if opponent has joined
//       const interval = setInterval(async () => {
//         try {
//           const response = await aoClient.getGameState(matchId)
//           if (response.status === "success" && response.data) {
//             const gameState = response.data
            
//             // If we have more than one player or game is in progress, opponent has joined
//             if (gameState.status === "in_progress" || Object.keys(gameState.players).length > 1) {
//               clearInterval(interval)
//               setJoinInterval(null)
//               setStep("ready")
              
//               // Play sound effect
//               const audio = new Audio("/sounds/opponent-joined.mp3")
//               audio.volume = 0.5
//               audio.play().catch(e => console.log("Couldn't play sound", e))
              
//               toast({
//                 title: "Opponent has joined!",
//                 description: "Get ready for battle!",
//                 variant: "default",
//               })
//             }
//           }
//         } catch (error) {
//           console.error("Error checking for opponent:", error)
//         }
//       }, 3000)
      
//       setJoinInterval(interval)
      
//       return () => {
//         clearInterval(interval)
//         setJoinInterval(null)
//       }
//     }
//   }, [step, matchId, roomCode, toast])

//   const handleWagerChange = (value: number[]) => {
//     setWager(value[0])
//   }

//   const handleConnectWallet = async () => {
//     try {
//       await arweaveWallet.connect()
//       setStep("configure")
//     } catch (error) {
//       console.error("Failed to connect wallet:", error)
//       toast({
//         title: "Connection Failed",
//         description: "Could not connect to your wallet. Please try again.",
//         variant: "destructive",
//       })
//     }
//   }

//   const handleCreateRoom = async () => {
//     if (!arweaveWallet.isConnected()) {
//       toast({
//         title: "Wallet not connected",
//         description: "Please connect your wallet first",
//         variant: "destructive",
//       })
//       return
//     }

//     if (wager > availableBalance) {
//       toast({
//         title: "Insufficient balance",
//         description: `You need at least ${wager} AR to create this room`,
//         variant: "destructive",
//       })
//       return
//     }
    
//     // Show transaction confirmation
//     setShowTransactionDialog(true)
//   }
  
//   const handleTransactionSuccess = async (txId: string) => {
//     setShowTransactionDialog(false)
//     setStep("creating")
//     setTxError(null)
    
//     try {
//       const response = await aoClient.createGameRoom(wager)

//       if (response.status === "success" && response.data) {
//         console.log("Game room created:", response.data)
        
//         // Play sound effect
//         const audio = new Audio("/sounds/room-created.mp3")
//         audio.volume = 0.5
//         audio.play().catch(e => console.log("Couldn't play sound", e))
        
//         setRoomCode(response.data.roomCode)
//         setMatchId(response.data.matchId)
//         setStep("waiting")
//         setAnimateRoomCode(true)
        
//         // Stop room code animation after a few seconds
//         setTimeout(() => setAnimateRoomCode(false), 2000)
        
//         toast({
//           title: "Room created",
//           description: `Share room code: ${response.data.roomCode} with your opponent`,
//           variant: "default",
//         })
//       } else {
//         // Handle error
//         setStep("configure")
//         toast({
//           title: "Failed to create room",
//           description: response.error || "Unknown error occurred",
//           variant: "destructive",
//         })
//       }
//     } catch (error) {
//       console.error("Error creating room:", error)
//       setStep("configure")
//       toast({
//         title: "Error",
//         description: "An unexpected error occurred while creating the room",
//         variant: "destructive",
//       })
//     }
//   }
  
//   const handleTransactionError = (error: string) => {
//     setTxError(error)
//     setTimeout(() => setShowTransactionDialog(false), 3000)
//   }

//   const copyRoomCode = () => {
//     if (roomCode) {
//       navigator.clipboard.writeText(roomCode)
//       toast({
//         title: "Copied",
//         description: "Room code copied to clipboard",
//         variant: "default",
//       })
      
//       // Play sound effect
//       const audio = new Audio("/sounds/copy.mp3")
//       audio.volume = 0.3
//       audio.play().catch(e => console.log("Couldn't play sound", e))
//     }
//   }
  
//   const shareRoom = async () => {
//     if (roomCode) {
//       // Check if web share API is available
//       if (navigator.share) {
//         try {
//           await navigator.share({
//             title: 'Join my ChronoClash game!',
//             text: `Join my game with room code: ${roomCode}`,
//             url: window.location.origin
//           })
//         } catch (error) {
//           console.error('Error sharing:', error)
//           copyRoomCode() // Fallback to copying
//         }
//       } else {
//         // Fallback for browsers that don't support sharing
//         copyRoomCode()
//       }
//     }
//   }

//   const enterArena = () => {
//     if (matchId) {
//       // Clear any polling interval
//       if (joinInterval) {
//         clearInterval(joinInterval)
//         setJoinInterval(null)
//       }
      
//       router.push(`/arena/${matchId}`)
//     }
//   }

//   const refreshBalance = async () => {
//     if (!arweaveWallet.isConnected()) return
    
//     setIsLoadingBalance(true)
//     try {
//       const balance = await arweaveWallet.getBalance(true)
//       setAvailableBalance(balance)
//       toast({
//         title: "Balance updated",
//         description: `Current balance: ${balance.toFixed(4)} AR`,
//         variant: "default",
//       })
//     } catch (error) {
//       console.error("Failed to refresh balance", error)
//       toast({
//         title: "Error",
//         description: "Failed to refresh wallet balance",
//         variant: "destructive",
//       })
//     } finally {
//       setIsLoadingBalance(false)
//     }
//   }
  
//   const cancelRoom = () => {
//     // Clear any polling interval
//     if (joinInterval) {
//       clearInterval(joinInterval)
//       setJoinInterval(null)
//     }
    
//     // Reset state and go back to configure step
//     setRoomCode(null)
//     setMatchId(null)
//     setStep("configure")
    
//     toast({
//       title: "Room cancelled",
//       description: "Your game room has been cancelled",
//       variant: "default",
//     })
//   }

//   const maxWager = Math.min(100, Math.max(availableBalance, 1))
  
//   // Format waiting time
//   const formatWaitingTime = () => {
//     const minutes = Math.floor(waitingTime / 60)
//     const seconds = waitingTime % 60
//     return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md bg-gray-800 border-gray-700">
//         <CardHeader>
//           <CardTitle className="text-2xl text-white flex items-center justify-between">
//             <span>Create Game Room</span>
//             {step !== "connect" && <ConnectWallet />}
//           </CardTitle>
//           <CardDescription className="text-gray-300">
//             Set a wager amount and create a room for your opponent to join.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           {step === "connect" && (
//             <div className="flex flex-col items-center justify-center py-6 space-y-6">
//               <div className="text-center">
//                 <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
//                 <p className="text-gray-300">
//                   Connect your Wander wallet to create a game room and challenge opponents.
//                 </p>
//               </div>
              
//               <div className="bg-gray-700/50 rounded-lg p-4 w-full">
//                 <div className="flex flex-col space-y-4">
//                   <div className="flex items-center">
//                     <div className="rounded-full bg-cyan-600/20 p-2 mr-3">
//                       <Coins className="h-5 w-5 text-cyan-400" />
//                     </div>
//                     <div>
//                       <h4 className="font-medium text-white">Wager Tokens</h4>
//                       <p className="text-xs text-gray-400">Bet AR tokens on your victory</p>
//                     </div>
//                   </div>
                  
//                   <div className="flex items-center">
//                     <div className="rounded-full bg-purple-600/20 p-2 mr-3">
//                       <Wand2 className="h-5 w-5 text-purple-400" />
//                     </div>
//                     <div>
//                       <h4 className="font-medium text-white">Claim Prizes</h4>
//                       <p className="text-xs text-gray-400">Winners take the entire prize pool</p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               <Button onClick={handleConnectWallet} className="w-full bg-cyan-600 hover:bg-cyan-700">
//                 Connect Wallet
//               </Button>
//             </div>
//           )}

//           {step === "configure" && (
//             <div className="space-y-6">
//               <div className="space-y-2">
//                 <div className="flex justify-between items-center">
//                   <Label htmlFor="wager" className="text-white">
//                     Wager Amount (AR)
//                   </Label>
//                   <div className="text-sm flex items-center gap-2">
//                     <span className="text-gray-400">Balance:</span>
//                     {isLoadingBalance ? (
//                       <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
//                     ) : (
//                       <span className="text-cyan-400 font-mono">{availableBalance.toFixed(4)} AR</span>
//                     )}
//                     <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refreshBalance}>
//                       <RefreshCw className="h-3 w-3" />
//                     </Button>
//                   </div>
//                 </div>
                
//                 <div className="flex items-center gap-4">
//                   <Coins className="h-5 w-5 text-amber-500" />
//                   <Slider
//                     defaultValue={[10]}
//                     max={maxWager}
//                     min={1}
//                     step={1}
//                     value={[wager]}
//                     onValueChange={handleWagerChange}
//                     className="flex-1"
//                   />
//                   <Input
//                     id="wager"
//                     type="number"
//                     min="1"
//                     max={maxWager}
//                     value={wager}
//                     onChange={(e) => setWager(Number(e.target.value))}
//                     className="bg-gray-700 border-gray-600 text-white w-20 text-right"
//                   />
//                 </div>
                
//                 <p className="text-xs text-gray-400 mt-2">
//                   This amount will be deducted from your wallet when creating the room. 
//                   Winner takes the entire prize pool.
//                 </p>
//               </div>

//               <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
//                 <div className="flex justify-between items-center">
//                   <div className="text-sm text-gray-300">Your Stake:</div>
//                   <div className="font-mono text-amber-400">{wager.toFixed(2)} AR</div>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <div className="text-sm text-gray-300">Opponent's Stake:</div>
//                   <div className="font-mono text-amber-400">{wager.toFixed(2)} AR</div>
//                 </div>
//                 <div className="flex justify-between items-center pt-1 border-t border-gray-600">
//                   <div className="text-sm font-medium text-gray-200">Total Prize Pool:</div>
//                   <div className="font-mono text-green-400 font-bold">{(wager * 2).toFixed(2)} AR</div>
//                 </div>
//               </div>

//               <Button
//                 onClick={handleCreateRoom}
//                 disabled={isLoadingBalance || !arweaveWallet.isConnected() || wager > availableBalance}
//                 className="w-full bg-cyan-600 hover:bg-cyan-700"
//               >
//                 Create Room
//               </Button>
//             </div>
//           )}
          
//           {step === "creating" && (
//             <div className="flex flex-col items-center justify-center py-8 space-y-4">
//               <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
//               <h3 className="text-xl font-bold text-white">Creating Room...</h3>
//               <p className="text-gray-400 text-center">
//                 Setting up your battle arena with the AO process.
//                 <br />This may take a few moments.
//               </p>
//             </div>
//           )}
          
//           {step === "waiting" && roomCode && (
//             <div className="space-y-6">
//               <div className="p-6 bg-gray-700 rounded-md text-center relative overflow-hidden">
//                 {animateRoomCode && (
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <Sparkles className="h-20 w-20 text-amber-500 animate-pulse" />
//                   </div>
//                 )}
//                 <div className="text-sm text-gray-400 mb-1">Room Code</div>
//                 <div className={`flex justify-center gap-3 items-center transition-all duration-500 ${animateRoomCode ? 'scale-125' : ''}`}>
//                   <div className="text-3xl font-mono tracking-wider text-white">{roomCode}</div>
//                   <div className="flex gap-2">
//                     <Button variant="ghost" size="icon" onClick={copyRoomCode} className="hover:bg-gray-600">
//                       <Copy className="h-4 w-4" />
//                     </Button>
//                     <Button variant="ghost" size="icon" onClick={shareRoom} className="hover:bg-gray-600">
//                       <Share2 className="h-4 w-4" />
//                     </Button>
//                   </div>
//                 </div>
//               </div>

//               <div className="text-center text-gray-300 space-y-2">
//                 <p>Share this code with your opponent. The game will start once they join.</p>
//                 <p className="text-xs text-amber-300">You've staked {wager.toFixed(2)} AR for this match.</p>
//               </div>
              
//               <div className="flex flex-col items-center pt-4 space-y-2">
//                 <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
//                   <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
//                   <span>Waiting for opponent to join... ({formatWaitingTime()})</span>
//                 </div>
                
//                 <div className="w-full mt-4">
//                   <Button variant="outline" onClick={cancelRoom} className="w-full">
//                     Cancel Room
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           )}
          
//           {step === "ready" && (
//             <div className="flex flex-col items-center py-6 space-y-6">
//               <div className="text-center">
//                 <PokemonLogoAnimation text="Opponent Found!" />
//                 <p className="text-gray-300 mt-4">
//                   Your opponent has joined the battle arena! Prepare for combat!
//                 </p>
//               </div>
              
//               <div className="w-full bg-gray-700 rounded-lg p-4 flex flex-col items-center">
//                 <span className="text-gray-400 text-sm mb-2">Total Prize Pool</span>
//                 <span className="text-green-400 text-3xl font-bold font-mono">{(wager * 2).toFixed(2)} AR</span>
//               </div>
//             </div>
//           )}
//         </CardContent>
        
//         {(step === "ready" || step === "waiting") && matchId && (
//           <CardFooter>
//             <Button 
//               onClick={enterArena} 
//               className="w-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center h-12 text-lg"
//             >
//               Enter Arena <ArrowRight className="ml-2 h-5 w-5" />
//             </Button>
//           </CardFooter>
//         )}
//       </Card>
      
//       <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Wager</DialogTitle>
//             <DialogDescription>
//               You're about to stake {wager} AR tokens to create a game room.
//             </DialogDescription>
//           </DialogHeader>
          
//           {txError ? (
//             <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
//               <h4 className="font-medium text-white mb-1">Transaction Failed</h4>
//               <p className="text-sm text-red-300">{txError}</p>
//             </div>
//           ) : (
//             <TokenTransaction
//               amount={wager}
//               purpose="Game Room Creation"
//               onSuccess={handleTransactionSuccess}
//               onError={handleTransactionError}
//             />
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

















