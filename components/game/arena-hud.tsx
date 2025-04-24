"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sword, Clock, History, Trophy, Users, Target, Shield } from "lucide-react"
import { getPlayerStatus } from "@/lib/game-utils"
import type { GameState, Move } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ArenaHUDProps {
  gameState: GameState
  playerAddress: string
}

export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [activeTab, setActiveTab] = useState("info")

  // Reset timer when turn changes
  useEffect(() => {
    setTimeLeft(30)
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState.currentTurn])

  // Get player and opponent info
  const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)
  const opponentName = opponent ? opponent.substring(0, 6) + "..." + opponent.substring(opponent.length - 4) : "Waiting..."
  const playerName = playerAddress.substring(0, 6) + "..." + playerAddress.substring(playerAddress.length - 4)
  const isPlayerTurn = gameState.currentTurn === playerAddress
  const playerStatus = getPlayerStatus(gameState, playerAddress)

  // Calculate battle statistics
  const calculateTotalDamage = (moves: Move[], address: string): number => {
    return moves
      .filter(move => move.player === address)
      .reduce((total, move) => total + move.damage, 0);
  };

  const calculateAverageDamage = (moves: Move[], address: string): number => {
    const playerMoves = moves.filter(move => move.player === address);
    if (playerMoves.length === 0) return 0;
    return Math.round(calculateTotalDamage(moves, address) / playerMoves.length);
  };

  const calculateSpecialAttacks = (moves: Move[], address: string): number => {
    return moves
      .filter(move => move.player === address && move.attackType === "special")
      .length;
  };

  const calculateCardsDefeated = (moves: Move[], address: string): number => {
    // This is an approximation since we don't track defeated cards directly in moves
    // In a real implementation, you would need to track this separately
    return moves
      .filter(move => move.player === address)
      .filter(move => move.damage >= 20) // Assuming high damage might have defeated a card
      .length;
  };

  return (
    <Card className="bg-gray-800 text-gray-100 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-cyan-400">Battle Information</CardTitle>
      </CardHeader>
      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="info"><Users className="h-4 w-4 mr-2" /> Info</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> History</TabsTrigger>
          <TabsTrigger value="stats"><Trophy className="h-4 w-4 mr-2" /> Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="mt-4 space-y-4">
          {/* Room Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
            <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
            <Badge className={gameState.status === "completed" ? "bg-green-600" : "bg-blue-600"}>
              {gameState.status === "completed" ? "Completed" : "In Progress"}
            </Badge>
          </div>
          
          {/* Turn Timer */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Turn Timer</span>
              <span className="text-sm">{timeLeft}s</span>
            </div>
            {/* Fixed: Use className instead of indicatorClassName */}
            <Progress
              value={(timeLeft / 30) * 100}
              className="h-2 bg-gray-700"
            >
              <div 
                className={cn(
                  "h-full transition-all", 
                  timeLeft < 10 ? "bg-red-500" : "bg-green-500"
                )} 
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
            </Progress>
          </div>
          
          {/* Player Status */}
          <div className="pt-2">
            <span className="text-sm font-medium">Status</span>
            <div className="text-lg font-semibold mt-1">
              {playerStatus}
            </div>
          </div>
          
          {/* Turn Indicator */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Card className={`border ${isPlayerTurn ? "border-cyan-500" : "border-gray-700"}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {isPlayerTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
                  <div className="text-sm font-medium">You</div>
                  {isPlayerTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
                </div>
              </CardContent>
            </Card>

            <Card className={`border ${!isPlayerTurn ? "border-red-500" : "border-gray-700"}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {!isPlayerTurn && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                  <div className="text-sm font-medium">Opponent</div>
                  {!isPlayerTurn && <Badge className="ml-auto bg-red-600">Their Turn</Badge>}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Players */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Players</span>
              <span className="text-xs text-gray-400">{Object.keys(gameState.players).length} / 2</span>
            </div>
            {Object.entries(gameState.players).map(([address, player]) => (
              <div key={address} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-0">
                <div className={`text-sm ${address === playerAddress ? "text-cyan-400" : "text-gray-300"}`}>
                  {address === playerAddress ? "You" : "Opponent"}
                </div>
                <div className="text-sm text-gray-400">
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Move History</h3>
          <div className="bg-gray-900 rounded-md p-2 h-64 overflow-y-auto">
            {gameState.moveHistory.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No moves yet</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...gameState.moveHistory].reverse().map((move, index) => (
                  <MoveHistoryItem 
                    key={index} 
                    move={move} 
                    playerAddress={playerAddress} 
                    index={gameState.moveHistory.length - index}
                  />
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="stats" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold mb-2">Battle Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <StatsCard
                title="Total Damage"
                value={calculateTotalDamage(gameState.moveHistory, playerAddress)}
                icon={<Sword className="h-4 w-4 text-red-400" />}
              />
              <StatsCard
                title="Avg. Damage"
                value={calculateAverageDamage(gameState.moveHistory, playerAddress)}
                icon={<Target className="h-4 w-4 text-amber-400" />}
              />
              <StatsCard
                title="Special Attacks"
                value={calculateSpecialAttacks(gameState.moveHistory, playerAddress)}
                icon={<Sword className="h-4 w-4 text-purple-400" />}
              />
              <StatsCard
                title="Cards Defeated"
                value={calculateCardsDefeated(gameState.moveHistory, playerAddress)}
                icon={<Shield className="h-4 w-4 text-green-400" />}
              />
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Potential Rewards</h3>
              <Card className="bg-gray-700 border-amber-500/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">Wagered Amount:</div>
                    <div className="font-mono font-semibold text-amber-400">{gameState.wager} AR</div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-sm">Potential Win:</div>
                    <div className="font-mono font-semibold text-green-400">{gameState.wager * 2} AR</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// Helper components
function MoveHistoryItem({ move, playerAddress, index }: { move: Move; playerAddress: string; index: number }) {
  const isPlayerMove = move.player === playerAddress
  const icon =
    move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />
  const timestamp = new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <li className="flex items-start gap-2 p-2 rounded bg-gray-800/60">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-xs font-medium ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
            {isPlayerMove ? "You" : "Opponent"}
          </span>
          <span className="text-xs text-gray-500">{timestamp}</span>
        </div>
        <span className="text-xs">
          Used card {move.cardIndex + 1} ({move.attackType}) on card {move.targetCardIndex + 1} for{" "}
          <span className="text-amber-400 font-medium">{move.damage}</span> damage
        </span>
      </div>
    </li>
  )
}

function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="bg-gray-700">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-300">{title}</div>
          {icon}
        </div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}











// "use client"

// import { useState, useEffect } from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Progress } from "@/components/ui/progress"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Sword, Clock, History, Trophy, Users, Target, Shield } from "lucide-react"
// import { getPlayerStatus } from "@/lib/game-utils"
// import type { GameState, Move } from "@/lib/types"

// interface ArenaHUDProps {
//   gameState: GameState
//   playerAddress: string
// }

// export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
//   const [timeLeft, setTimeLeft] = useState(30)
//   const [activeTab, setActiveTab] = useState("info")

//   // Reset timer when turn changes
//   useEffect(() => {
//     setTimeLeft(30)
//     const timer = setInterval(() => {
//       setTimeLeft((prev) => Math.max(0, prev - 1))
//     }, 1000)

//     return () => clearInterval(timer)
//   }, [gameState.currentTurn])

//   // Get player and opponent info
//   const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)
//   const opponentName = opponent ? opponent.substring(0, 6) + "..." + opponent.substring(opponent.length - 4) : "Waiting..."
//   const playerName = playerAddress.substring(0, 6) + "..." + playerAddress.substring(playerAddress.length - 4)
//   const isPlayerTurn = gameState.currentTurn === playerAddress
//   const playerStatus = getPlayerStatus(gameState, playerAddress)

//   // Calculate battle statistics
//   const calculateTotalDamage = (moves: Move[], address: string): number => {
//     return moves
//       .filter(move => move.player === address)
//       .reduce((total, move) => total + move.damage, 0);
//   };

//   const calculateAverageDamage = (moves: Move[], address: string): number => {
//     const playerMoves = moves.filter(move => move.player === address);
//     if (playerMoves.length === 0) return 0;
//     return Math.round(calculateTotalDamage(moves, address) / playerMoves.length);
//   };

//   const calculateSpecialAttacks = (moves: Move[], address: string): number => {
//     return moves
//       .filter(move => move.player === address && move.attackType === "special")
//       .length;
//   };

//   const calculateCardsDefeated = (moves: Move[], address: string): number => {
//     // This is an approximation since we don't track defeated cards directly in moves
//     // In a real implementation, you would need to track this separately
//     return moves
//       .filter(move => move.player === address)
//       .filter(move => move.damage >= 20) // Assuming high damage might have defeated a card
//       .length;
//   };

//   return (
//     <Card className="bg-gray-800 text-gray-100 h-full">
//       <CardHeader className="pb-2">
//         <CardTitle className="text-xl text-cyan-400">Battle Information</CardTitle>
//       </CardHeader>
//       <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
//         <TabsList className="w-full grid grid-cols-3">
//           <TabsTrigger value="info"><Users className="h-4 w-4 mr-2" /> Info</TabsTrigger>
//           <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> History</TabsTrigger>
//           <TabsTrigger value="stats"><Trophy className="h-4 w-4 mr-2" /> Stats</TabsTrigger>
//         </TabsList>
        
//         <TabsContent value="info" className="mt-4 space-y-4">
//           {/* Room Info */}
//           <div className="flex flex-wrap gap-2 mb-4">
//             <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
//             <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
//             <Badge className={gameState.status === "completed" ? "bg-green-600" : "bg-blue-600"}>
//               {gameState.status === "completed" ? "Completed" : "In Progress"}
//             </Badge>
//           </div>
          
//           {/* Turn Timer */}
//           <div className="space-y-1">
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium">Turn Timer</span>
//               <span className="text-sm">{timeLeft}s</span>
//             </div>
//             <Progress
//               value={(timeLeft / 30) * 100}
//               className="h-2 bg-gray-700"
//               indicatorClassName={timeLeft < 10 ? "bg-red-500" : "bg-green-500"}
//             />
//           </div>
          
//           {/* Player Status */}
//           <div className="pt-2">
//             <span className="text-sm font-medium">Status</span>
//             <div className="text-lg font-semibold mt-1">
//               {playerStatus}
//             </div>
//           </div>
          
//           {/* Turn Indicator */}
//           <div className="grid grid-cols-2 gap-2 mt-2">
//             <Card className={`border ${isPlayerTurn ? "border-cyan-500" : "border-gray-700"}`}>
//               <CardContent className="p-3">
//                 <div className="flex items-center gap-2">
//                   {isPlayerTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
//                   <div className="text-sm font-medium">You</div>
//                   {isPlayerTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className={`border ${!isPlayerTurn ? "border-red-500" : "border-gray-700"}`}>
//               <CardContent className="p-3">
//                 <div className="flex items-center gap-2">
//                   {!isPlayerTurn && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
//                   <div className="text-sm font-medium">Opponent</div>
//                   {!isPlayerTurn && <Badge className="ml-auto bg-red-600">Their Turn</Badge>}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
          
//           {/* Players */}
//           <div className="pt-2">
//             <div className="flex items-center justify-between mb-1">
//               <span className="text-sm font-medium">Players</span>
//               <span className="text-xs text-gray-400">{Object.keys(gameState.players).length} / 2</span>
//             </div>
//             {Object.entries(gameState.players).map(([address, player]) => (
//               <div key={address} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-0">
//                 <div className={`text-sm ${address === playerAddress ? "text-cyan-400" : "text-gray-300"}`}>
//                   {address === playerAddress ? "You" : "Opponent"}
//                 </div>
//                 <div className="text-sm text-gray-400">
//                   {address.substring(0, 6)}...{address.substring(address.length - 4)}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </TabsContent>
        
//         <TabsContent value="history" className="mt-4">
//           <h3 className="text-sm font-semibold mb-2">Move History</h3>
//           <div className="bg-gray-900 rounded-md p-2 h-64 overflow-y-auto">
//             {gameState.moveHistory.length === 0 ? (
//               <div className="text-gray-500 text-center py-4">No moves yet</div>
//             ) : (
//               <ul className="space-y-2 text-sm">
//                 {[...gameState.moveHistory].reverse().map((move, index) => (
//                   <MoveHistoryItem 
//                     key={index} 
//                     move={move} 
//                     playerAddress={playerAddress} 
//                     index={gameState.moveHistory.length - index}
//                   />
//                 ))}
//               </ul>
//             )}
//           </div>
//         </TabsContent>
        
//         <TabsContent value="stats" className="mt-4">
//           <div className="space-y-4">
//             <h3 className="text-sm font-semibold mb-2">Battle Stats</h3>
//             <div className="grid grid-cols-2 gap-2">
//               <StatsCard
//                 title="Total Damage"
//                 value={calculateTotalDamage(gameState.moveHistory, playerAddress)}
//                 icon={<Sword className="h-4 w-4 text-red-400" />}
//               />
//               <StatsCard
//                 title="Avg. Damage"
//                 value={calculateAverageDamage(gameState.moveHistory, playerAddress)}
//                 icon={<Target className="h-4 w-4 text-amber-400" />}
//               />
//               <StatsCard
//                 title="Special Attacks"
//                 value={calculateSpecialAttacks(gameState.moveHistory, playerAddress)}
//                 icon={<Sword className="h-4 w-4 text-purple-400" />}
//               />
//               <StatsCard
//                 title="Cards Defeated"
//                 value={calculateCardsDefeated(gameState.moveHistory, playerAddress)}
//                 icon={<Shield className="h-4 w-4 text-green-400" />}
//               />
//             </div>
            
//             <div className="mt-6">
//               <h3 className="text-sm font-semibold mb-2">Potential Rewards</h3>
//               <Card className="bg-gray-700 border-amber-500/30">
//                 <CardContent className="p-3">
//                   <div className="flex justify-between items-center">
//                     <div className="text-sm">Wagered Amount:</div>
//                     <div className="font-mono font-semibold text-amber-400">{gameState.wager} AR</div>
//                   </div>
//                   <div className="flex justify-between items-center mt-1">
//                     <div className="text-sm">Potential Win:</div>
//                     <div className="font-mono font-semibold text-green-400">{gameState.wager * 2} AR</div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           </div>
//         </TabsContent>
//       </Tabs>
//     </Card>
//   )
// }

// // Helper components
// function MoveHistoryItem({ move, playerAddress, index }: { move: Move; playerAddress: string; index: number }) {
//   const isPlayerMove = move.player === playerAddress
//   const icon =
//     move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />
//   const timestamp = new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

//   return (
//     <li className="flex items-start gap-2 p-2 rounded bg-gray-800/60">
//       <div className="flex-shrink-0 mt-0.5">{icon}</div>
//       <div className="flex-1">
//         <div className="flex justify-between items-center mb-1">
//           <span className={`text-xs font-medium ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
//             {isPlayerMove ? "You" : "Opponent"}
//           </span>
//           <span className="text-xs text-gray-500">{timestamp}</span>
//         </div>
//         <span className="text-xs">
//           Used card {move.cardIndex + 1} ({move.attackType}) on card {move.targetCardIndex + 1} for{" "}
//           <span className="text-amber-400 font-medium">{move.damage}</span> damage
//         </span>
//       </div>
//     </li>
//   )
// }

// function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
//   return (
//     <Card className="bg-gray-700">
//       <CardContent className="p-3">
//         <div className="flex items-center justify-between">
//           <div className="text-xs text-gray-300">{title}</div>
//           {icon}
//         </div>
//         <div className="text-xl font-bold mt-1">{value}</div>
//       </CardContent>
//     </Card>
//   )
// }









// // "use client"

// // import { useState, useEffect } from "react"
// // import { Card, CardContent } from "@/components/ui/card"
// // import { Badge } from "@/components/ui/badge"
// // import { Progress } from "@/components/ui/progress"
// // import { Sword, Clock } from "lucide-react"
// // import type { GameState, Move } from "@/lib/types"

// // interface ArenaHUDProps {
// //   gameState: GameState
// //   playerAddress: string
// // }

// // export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
// //   const [timeLeft, setTimeLeft] = useState(30)

// //   // Reset timer when turn changes
// //   useEffect(() => {
// //     setTimeLeft(30)
// //     const timer = setInterval(() => {
// //       setTimeLeft((prev) => Math.max(0, prev - 1))
// //     }, 1000)

// //     return () => clearInterval(timer)
// //   }, [gameState.currentTurn])

// //   const isPlayerTurn = gameState.currentTurn === playerAddress
// //   const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)

// //   return (
// //     <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
// //       <div className="flex justify-between items-center mb-4">
// //         <div className="flex items-center gap-2">
// //           <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
// //           <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
// //         </div>

// //         <div className="flex items-center gap-2">
// //           <Clock className="h-4 w-4" />
// //           <Progress
// //             value={(timeLeft / 30) * 100}
// //             className="w-24 h-2 bg-gray-700"
// //             indicatorClassName={timeLeft < 10 ? "bg-red-500" : "bg-green-500"}
// //           />
// //           <span className="text-sm">{timeLeft}s</span>
// //         </div>
// //       </div>

// //       <div className="grid grid-cols-2 gap-4">
// //         <PlayerInfo name={`You (${playerAddress.substring(0, 6)}...)`} isCurrentTurn={isPlayerTurn} />

// //         <PlayerInfo name={`Opponent (${opponent ? opponent.substring(0, 6) : ""}...)`} isCurrentTurn={!isPlayerTurn} />
// //       </div>

// //       <div className="mt-4">
// //         <h3 className="text-sm font-semibold mb-2">Move History</h3>
// //         <div className="bg-gray-900 rounded-md p-2 h-32 overflow-y-auto">
// //           {gameState.moveHistory.length === 0 ? (
// //             <div className="text-gray-500 text-center py-4">No moves yet</div>
// //           ) : (
// //             <ul className="space-y-1 text-sm">
// //               {gameState.moveHistory.map((move, index) => (
// //                 <MoveHistoryItem key={index} move={move} playerAddress={playerAddress} />
// //               ))}
// //             </ul>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// // function PlayerInfo({ name, isCurrentTurn }: { name: string; isCurrentTurn: boolean }) {
// //   return (
// //     <Card className={`border ${isCurrentTurn ? "border-cyan-500" : "border-gray-700"}`}>
// //       <CardContent className="p-3">
// //         <div className="flex items-center gap-2">
// //           {isCurrentTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
// //           <h3 className="font-medium">{name}</h3>
// //           {isCurrentTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
// //         </div>
// //       </CardContent>
// //     </Card>
// //   )
// // }

// // function MoveHistoryItem({ move, playerAddress }: { move: Move; playerAddress: string }) {
// //   const isPlayerMove = move.player === playerAddress
// //   const icon =
// //     move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />

// //   return (
// //     <li className={`flex items-center gap-2 ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
// //       {icon}
// //       <span>
// //         {isPlayerMove ? "You" : "Opponent"} used card {move.cardIndex + 1}({move.attackType}) on card{" "}
// //         {move.targetCardIndex + 1} for {move.damage} damage
// //       </span>
// //     </li>
// //   )
// // }
