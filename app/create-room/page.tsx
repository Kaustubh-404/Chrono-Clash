"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnectWallet } from "@/components/wallet/connect-wallet"
import { Loader2, Copy, ArrowRight } from "lucide-react"
import { aoClient } from "@/lib/ao-client"
import { arweaveWallet } from "@/lib/wallet"

export default function CreateRoomPage() {
  const router = useRouter()
  const [wager, setWager] = useState<number>(10)
  const [isCreating, setIsCreating] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)

  const handleCreateRoom = async () => {
    if (!arweaveWallet.isConnected()) {
      alert("Please connect your wallet first")
      return
    }

    setIsCreating(true)
    try {
      const response = await aoClient.createGameRoom(wager)

      if (response.status === "success" && response.data) {
        setRoomCode(response.data.roomCode)
        setMatchId(response.data.matchId)
      } else {
        alert("Failed to create room: " + (response.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Error creating room:", error)
      alert("An error occurred while creating the room")
    } finally {
      setIsCreating(false)
    }
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      alert("Room code copied to clipboard!")
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wager" className="text-white">
                  Wager Amount (AR)
                </Label>
                <Input
                  id="wager"
                  type="number"
                  min="1"
                  value={wager}
                  onChange={(e) => setWager(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400">
                  This amount will be deducted from your wallet when creating the room.
                </p>
              </div>

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || !arweaveWallet.isConnected()}
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
              <div className="p-4 bg-gray-700 rounded-md">
                <div className="text-sm text-gray-400 mb-1">Room Code</div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-mono text-white">{roomCode}</div>
                  <Button variant="ghost" size="icon" onClick={copyRoomCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-center text-gray-300">
                Share this code with your opponent. The game will start once they join.
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
