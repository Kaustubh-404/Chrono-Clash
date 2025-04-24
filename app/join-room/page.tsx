"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, ArrowRight, RefreshCw, AlertTriangle, Shield, Swords, WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { enhancedAoClient } from "@/lib/ao-client-enhanced"
import { arweaveWallet } from "@/lib/wallet"
import { TokenTransaction } from "@/components/wallet/token-transaction"
import { PokemonLogoAnimation } from "@/components/game/pokemon-logo-animation"

// Type for join flow steps
type JoinStep = "connect" | "input" | "wager" | "joining" | "ready"

export default function JoinRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [roomCode, setRoomCode] = useState("")
  const [matchId, setMatchId] = useState<string | null>(null)
  const [roomInfo, setRoomInfo] = useState<{ creator: string; wager: number } | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isCheckingRoom, setIsCheckingRoom] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [step, setStep] = useState<JoinStep>("connect")
  const [isOffline, setIsOffline] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  // References for input fields
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null, null])

  // Check if wallet is connected on load
  useEffect(() => {
    if (arweaveWallet.isConnected()) {
      setStep("input")
    }
    
    const unsub = arweaveWallet.addConnectionListener((address) => {
      if (address) {
        setStep("input")
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    
    // Update the room code
    const newRoomCode = [...roomCode]
    if (value) {
      newRoomCode[index] = value[0]
    } else {
      newRoomCode[index] = ''
    }
    setRoomCode(newRoomCode.join(''))
    
    // Move to next input if a character was entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Check room info if 6 characters entered
    if (newRoomCode.join('').length === 6) {
      checkRoomInfo(newRoomCode.join(''))
    } else {
      setRoomInfo(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !roomCode[index] && index > 0) {
      // Move to previous input when backspace is pressed on an empty input
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      // Move to previous input on left arrow
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      // Move to next input on right arrow
      inputRefs.current[index + 1]?.focus()
    }
  }

  const checkRoomInfo = async (code: string) => {
    if (code.length !== 6) return
    
    setIsCheckingRoom(true)
    try {
      // Skip API call if offline
      if (isOffline || enhancedAoClient.isOffline()) {
        setIsCheckingRoom(false)
        
        toast({
          title: "You're offline",
          description: "Cannot check room status while offline",
          variant: "destructive",
        })
        return
      }
      
      const response = await enhancedAoClient.getGameStateByRoomCode(code)
      if (response.status === "success" && response.data) {
        // Play sound effect for room found
        const audio = new Audio("/sounds/room-found.mp3")
        audio.volume = 0.3
        audio.play().catch(e => console.log("Couldn't play sound", e))
        
        setRoomInfo({
          creator: response.data.creator || "Unknown",
          wager: response.data.wager || 0,
        })
      } else {
        setRoomInfo(null)
        
        // Play error sound
        const audio = new Audio("/sounds/error.mp3")
        audio.volume = 0.3
        audio.play().catch(e => console.log("Couldn't play sound", e))
        
        toast({
          title: "Room not found",
          description: "Invalid room code or room no longer exists",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking room:", error)
      setRoomInfo(null)
    } finally {
      setIsCheckingRoom(false)
    }
  }

  const handleConnectWallet = async () => {
    try {
      await arweaveWallet.connect()
      setStep("input")
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      toast({
        title: "Connection Failed",
        description: "Could not connect to your wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleJoinRoom = async () => {
    if (!arweaveWallet.isConnected()) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    if (!roomCode || roomCode.length !== 6) {
      toast({
        title: "Invalid room code",
        description: "Please enter a valid 6-character room code",
        variant: "destructive",
      })
      return
    }
    
    if (roomInfo && roomInfo.wager > availableBalance) {
      toast({
        title: "Insufficient balance",
        description: `You need at least ${roomInfo.wager} AR to join this room`,
        variant: "destructive",
      })
      return
    }
    
    // Show transaction confirmation
    setShowTransactionDialog(true)
  }
  
  const handleTransactionSuccess = async (txId: string) => {
    setShowTransactionDialog(false)
    setStep("joining")
    setTxError(null)
    
    try {
      // Check if we're offline
      if (isOffline || enhancedAoClient.isOffline()) {
        toast({
          title: "You're offline",
          description: "Cannot join room while offline",
          variant: "destructive",
        })
        setStep("input")
        return
      }
      
      const response = await enhancedAoClient.joinGameRoom(roomCode)

      if (response.status === "success" && response.data) {
        console.log("Room joined:", response.data)
        
        // Play sound effect
        const audio = new Audio("/sounds/join-success.mp3")
        audio.volume = 0.5
        audio.play().catch(e => console.log("Couldn't play sound", e))
        
        setMatchId(response.data.matchId)
        setStep("ready")
        
        toast({
          title: "Room joined",
          description: "Successfully joined the game room",
          variant: "default",
        })
      } else {
        setStep("input")
        toast({
          title: "Failed to join room",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error joining room:", error)
      setStep("input")
      toast({
        title: "Error",
        description: "An unexpected error occurred while joining the room",
        variant: "destructive",
      })
    }
  }
  
  const handleTransactionError = (error: string) => {
    setTxError(error)
    setTimeout(() => setShowTransactionDialog(false), 3000)
  }

  const enterArena = () => {
    if (matchId) {
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
  
  const resetForm = () => {
    setRoomCode("")
    setRoomInfo(null)
    inputRefs.current[0]?.focus()
  }

  // Create an array to represent the 6 characters of the room code
  const roomCodeArray = roomCode.padEnd(6, ' ').split('')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center justify-between">
            <span>Join Game Room</span>
            {step !== "connect" && <ConnectWallet />}
          </CardTitle>
          <CardDescription className="text-gray-300">
            Enter the room code to join an existing game.
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
                  Connect your Wander wallet to join a game room and battle opponents.
                </p>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4 w-full">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <div className="rounded-full bg-purple-600/20 p-2 mr-3">
                      <Swords className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Join Battles</h4>
                      <p className="text-xs text-gray-400">Challenge others to strategic combat</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="rounded-full bg-amber-600/20 p-2 mr-3">
                      <Shield className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Win Rewards</h4>
                      <p className="text-xs text-gray-400">Defeat opponents to earn AR tokens</p>
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

          {step === "input" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="roomCode" className="text-white">
                  Room Code
                </Label>
                
                <div className="grid grid-cols-6 gap-2">
                  {roomCodeArray.map((char, index) => (
                    <Input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      value={char === ' ' ? '' : char}
                      onChange={(e) => handleInputChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      maxLength={1}
                      className="bg-gray-700 border-gray-600 text-white text-center text-xl font-mono h-14"
                      autoFocus={index === 0}
                      disabled={isOffline}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Enter the 6-character code to join the game
                </p>
                
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={resetForm} className="text-gray-400 hover:text-white">
                    Clear
                  </Button>
                </div>
              </div>
              
              {isCheckingRoom && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                </div>
              )}
              
              {roomInfo && (
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">Creator:</div>
                    <div className="font-mono text-cyan-400">
                      {roomInfo.creator.substring(0, 6)}...{roomInfo.creator.substring(roomInfo.creator.length - 4)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">Wager Amount:</div>
                    <div className="font-mono text-amber-400">{roomInfo.wager.toFixed(2)} AR</div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                    <div className="text-sm text-gray-300">Your Balance:</div>
                    <div className="flex items-center gap-2">
                      {isLoadingBalance ? (
                        <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                      ) : (
                        <span className="font-mono text-white">{availableBalance.toFixed(4)} AR</span>
                      )}
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={refreshBalance}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {roomInfo.wager > availableBalance && (
                    <div className="flex items-center gap-2 text-red-400 text-xs mt-2 bg-red-900/20 p-2 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Insufficient balance to join this game</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleJoinRoom}
                disabled={
                  !arweaveWallet.isConnected() || 
                  roomCode.length !== 6 || 
                  !roomInfo ||
                  roomInfo.wager > availableBalance ||
                  isOffline
                }
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                Join Room
              </Button>
              
              {isOffline && (
                <p className="text-xs text-center text-red-400">
                  You must be online to join a room
                </p>
              )}
            </div>
          )}
          
          {step === "joining" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
              <h3 className="text-xl font-bold text-white">Joining Room...</h3>
              <p className="text-gray-400 text-center">
                Connecting to the battle arena.
                <br />This may take a few moments.
              </p>
              
              {isReconnecting && (
                <div className="text-sm text-amber-400 animate-pulse">
                  Reconnecting to server...
                </div>
              )}
            </div>
          )}
          
          {step === "ready" && (
            <div className="flex flex-col items-center py-6 space-y-6">
              <PokemonLogoAnimation text="Ready for Battle!" />
              
              <div className="text-center text-gray-300 py-4 space-y-4">
                <div className="text-xl font-bold text-white mb-2">Room Joined Successfully!</div>
                <p>You've successfully joined the game. Click below to enter the arena.</p>
              </div>
              
              {roomInfo && (
                <div className="w-full bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-sm mb-1 text-gray-400">Wagered Amount:</div>
                  <div className="text-amber-400 text-3xl font-mono">{roomInfo.wager.toFixed(2)} AR</div>
                  <div className="mt-2 text-xs text-gray-400">Winner takes entire prize pool</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        {matchId && step === "ready" && (
          <CardFooter>
            <Button 
              onClick={enterArena} 
              className="w-full bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center h-12 text-lg"
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
              You're about to stake {roomInfo?.wager || 0} AR tokens to join this game room.
            </DialogDescription>
          </DialogHeader>
          
          {txError ? (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
              <h4 className="font-medium text-white mb-1">Transaction Failed</h4>
              <p className="text-sm text-red-300">{txError}</p>
            </div>
          ) : (
            <TokenTransaction
              amount={roomInfo?.wager || 0}
              purpose="Game Room Join"
              onSuccess={handleTransactionSuccess}
              onError={handleTransactionError}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}










