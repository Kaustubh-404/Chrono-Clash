"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sword, Clock } from "lucide-react"
import type { GameState, Move } from "@/lib/types"

interface ArenaHUDProps {
  gameState: GameState
  playerAddress: string
}

export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
  const [timeLeft, setTimeLeft] = useState(30)

  // Reset timer when turn changes
  useEffect(() => {
    setTimeLeft(30)
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState.currentTurn])

  const isPlayerTurn = gameState.currentTurn === playerAddress
  const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
          <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <Progress
            value={(timeLeft / 30) * 100}
            className="w-24 h-2 bg-gray-700"
            indicatorClassName={timeLeft < 10 ? "bg-red-500" : "bg-green-500"}
          />
          <span className="text-sm">{timeLeft}s</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PlayerInfo name={`You (${playerAddress.substring(0, 6)}...)`} isCurrentTurn={isPlayerTurn} />

        <PlayerInfo name={`Opponent (${opponent ? opponent.substring(0, 6) : ""}...)`} isCurrentTurn={!isPlayerTurn} />
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2">Move History</h3>
        <div className="bg-gray-900 rounded-md p-2 h-32 overflow-y-auto">
          {gameState.moveHistory.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No moves yet</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {gameState.moveHistory.map((move, index) => (
                <MoveHistoryItem key={index} move={move} playerAddress={playerAddress} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerInfo({ name, isCurrentTurn }: { name: string; isCurrentTurn: boolean }) {
  return (
    <Card className={`border ${isCurrentTurn ? "border-cyan-500" : "border-gray-700"}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {isCurrentTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
          <h3 className="font-medium">{name}</h3>
          {isCurrentTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}

function MoveHistoryItem({ move, playerAddress }: { move: Move; playerAddress: string }) {
  const isPlayerMove = move.player === playerAddress
  const icon =
    move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />

  return (
    <li className={`flex items-center gap-2 ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
      {icon}
      <span>
        {isPlayerMove ? "You" : "Opponent"} used card {move.cardIndex + 1}({move.attackType}) on card{" "}
        {move.targetCardIndex + 1} for {move.damage} damage
      </span>
    </li>
  )
}
