"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Loader2, Copy, ArrowRight, Coins, Share2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { aoClient } from "@/lib/ao-client"
import { arweaveWallet } from "@/lib/wallet"

export default function CreateRoomPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [wager, setWager] = useState<number>(10)
  const [isCreating, setIsCreating] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

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
  }, [])

  const handleWagerChange = (value: number[]) => {
    setWager(value[0])
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

    setIsCreating(true)
    try {
      const response = await aoClient.createGameRoom(wager)

      if (response.status === "success" && response.data) {
        setRoomCode(response.data.roomCode)
        setMatchId(response.data.matchId)
        
        toast({
          title: "Room created",
          description: `Room code: ${response.data.roomCode}`,
          variant: "default",
        })
      } else {
        toast({
          title: "Failed to create room",
          description: response.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating room:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the room",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      toast({
        title: "Copied",
        description: "Room code copied to clipboard",
        variant: "default",
      })
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
      router.push(`/arena/${matchId}`)
    }
  }

  const refreshBalance = async () => {
    if (!arweaveWallet.isConnected()) return
    
    setIsLoadingBalance(true)
    try {
      const balance = await arweaveWallet.getBalance()
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

  const maxWager = Math.min(100, Math.max(availableBalance, 10))

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Create Game Room</CardTitle>
          <CardDescription className="text-gray-300">
            Set a wager amount and create a room for your opponent to join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <ConnectWallet />
          </div>

          {!roomCode ? (
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
                disabled={isCreating || !arweaveWallet.isConnected() || wager > availableBalance}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  "Create Room"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-gray-700 rounded-md text-center">
                <div className="text-sm text-gray-400 mb-1">Room Code</div>
                <div className="flex justify-center gap-3 items-center">
                  <div className="text-3xl font-mono tracking-wider text-white">{roomCode}</div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={copyRoomCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={shareRoom}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-300 space-y-2">
                <p>Share this code with your opponent. The game will start once they join.</p>
                <p className="text-xs text-amber-300">You've staked {wager.toFixed(2)} AR for this match.</p>
              </div>
              
              <div className="pt-4">
                <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></div>
                  <span>Waiting for opponent to join...</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        {roomCode && (
          <CardFooter>
            <Button onClick={enterArena} className="w-full bg-cyan-600 hover:bg-cyan-700">
              Enter Arena <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}





// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { ConnectWallet } from "@/components/wallet/connect-wallet"
// import { Loader2, Copy, ArrowRight } from "lucide-react"
// import { aoClient } from "@/lib/ao-client"
// import { arweaveWallet } from "@/lib/wallet"

// export default function CreateRoomPage() {
//   const router = useRouter()
//   const [wager, setWager] = useState<number>(10)
//   const [isCreating, setIsCreating] = useState(false)
//   const [roomCode, setRoomCode] = useState<string | null>(null)
//   const [matchId, setMatchId] = useState<string | null>(null)

//   const handleCreateRoom = async () => {
//     if (!arweaveWallet.isConnected()) {
//       alert("Please connect your wallet first")
//       return
//     }

//     setIsCreating(true)
//     try {
//       const response = await aoClient.createGameRoom(wager)

//       if (response.status === "success" && response.data) {
//         setRoomCode(response.data.roomCode)
//         setMatchId(response.data.matchId)
//       } else {
//         alert("Failed to create room: " + (response.error || "Unknown error"))
//       }
//     } catch (error) {
//       console.error("Error creating room:", error)
//       alert("An error occurred while creating the room")
//     } finally {
//       setIsCreating(false)
//     }
//   }

//   const copyRoomCode = () => {
//     if (roomCode) {
//       navigator.clipboard.writeText(roomCode)
//       alert("Room code copied to clipboard!")
//     }
//   }

//   const enterArena = () => {
//     if (matchId) {
//       router.push(`/arena/${matchId}`)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md bg-gray-800 border-gray-700">
//         <CardHeader>
//           <CardTitle className="text-2xl text-white">Create Game Room</CardTitle>
//           <CardDescription className="text-gray-300">
//             Set a wager amount and create a room for your opponent to join.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           <div className="flex justify-end">
//             <ConnectWallet />
//           </div>

//           {!roomCode ? (
//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="wager" className="text-white">
//                   Wager Amount (AR)
//                 </Label>
//                 <Input
//                   id="wager"
//                   type="number"
//                   min="1"
//                   value={wager}
//                   onChange={(e) => setWager(Number(e.target.value))}
//                   className="bg-gray-700 border-gray-600 text-white"
//                 />
//                 <p className="text-xs text-gray-400">
//                   This amount will be deducted from your wallet when creating the room.
//                 </p>
//               </div>

//               <Button
//                 onClick={handleCreateRoom}
//                 disabled={isCreating || !arweaveWallet.isConnected()}
//                 className="w-full bg-cyan-600 hover:bg-cyan-700"
//               >
//                 {isCreating ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Creating Room...
//                   </>
//                 ) : (
//                   "Create Room"
//                 )}
//               </Button>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="p-4 bg-gray-700 rounded-md">
//                 <div className="text-sm text-gray-400 mb-1">Room Code</div>
//                 <div className="flex items-center justify-between">
//                   <div className="text-2xl font-mono text-white">{roomCode}</div>
//                   <Button variant="ghost" size="icon" onClick={copyRoomCode}>
//                     <Copy className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </div>

//               <div className="text-center text-gray-300">
//                 Share this code with your opponent. The game will start once they join.
//               </div>
//             </div>
//           )}
//         </CardContent>
//         {roomCode && (
//           <CardFooter>
//             <Button onClick={enterArena} className="w-full bg-cyan-600 hover:bg-cyan-700">
//               Enter Arena <ArrowRight className="ml-2 h-4 w-4" />
//             </Button>
//           </CardFooter>
//         )}
//       </Card>
//     </div>
//   )
// }
