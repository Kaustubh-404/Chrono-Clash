"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Loader2, ArrowRight } from "lucide-react"
import { aoClient } from "@/lib/ao-client"
import { arweaveWallet } from "@/lib/wallet"

export default function JoinRoomPage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)

  const handleJoinRoom = async () => {
    if (!arweaveWallet.isConnected()) {
      alert("Please connect your wallet first")
      return
    }

    if (!roomCode || roomCode.length !== 6) {
      alert("Please enter a valid room code")
      return
    }

    setIsJoining(true)
    try {
      const response = await aoClient.joinGameRoom(roomCode)

      if (response.status === "success" && response.data) {
        setMatchId(response.data.matchId)
      } else {
        alert("Failed to join room: " + (response.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error joining room:", error)
      alert("An error occurred while joining the room")
    } finally {
      setIsJoining(false)
    }
  }

  const enterArena = () => {
    if (matchId) {
      router.push(`/arena/${matchId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Join Game Room</CardTitle>
          <CardDescription className="text-gray-300">Enter the room code provided by your opponent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <ConnectWallet />
          </div>

          {!matchId ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode" className="text-white">
                  Room Code
                </Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="bg-gray-700 border-gray-600 text-white text-center text-xl tracking-widest font-mono"
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                disabled={isJoining || !arweaveWallet.isConnected() || roomCode.length !== 6}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining Room...
                  </>
                ) : (
                  "Join Room"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-300 py-4">
              <div className="text-xl font-bold text-white mb-2">Room Joined Successfully!</div>
              <p>You've successfully joined the game. Click below to enter the arena.</p>
            </div>
          )}
        </CardContent>
        {matchId && (
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
