// components/game/battle-arena-hud.tsx
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sword, 
  Shield, 
  History, 
  Trophy, 
  Users, 
  Target, 
  Zap,
  Timer,
  Flame
} from "lucide-react"
import { getPlayerStatus } from "@/lib/game-utils"
import type { GameState, Card as CardType, Move } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BattleArenaHUDProps {
  gameState: GameState
  playerAddress: string
  selectedCard: CardType | null
  attackType: "normal" | "special"
}

export function BattleArenaHUD({ 
  gameState, 
  playerAddress,
  selectedCard,
  attackType
}: BattleArenaHUDProps) {
  const [activeTab, setActiveTab] = useState("battle")
  const [animateDamage, setAnimateDamage] = useState(false)
  
  // Get player and opponent info
  const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)
  const opponentName = opponent 
    ? opponent.substring(0, 6) + "..." + opponent.substring(opponent.length - 4) 
    : "Waiting..."
  const playerName = playerAddress.substring(0, 6) + "..." + playerAddress.substring(playerAddress.length - 4)
  const isPlayerTurn = gameState.currentTurn === playerAddress
  const playerStatus = getPlayerStatus(gameState, playerAddress)
  
  // Calculate expected damage if a card is selected
  const [expectedDamage, setExpectedDamage] = useState<number | null>(null)
  
  useEffect(() => {
    // Calculate expected damage when card and attack type change
    if (selectedCard) {
      let damage = attackType === "normal" 
        ? selectedCard.attackPower 
        : selectedCard.specialAttackPower
      
      // Apply random variation (like in Pokemon)
      const variation = Math.random() * 0.2 - 0.1 // -10% to +10%
      damage = Math.floor(damage * (1 + variation))
      
      // Animate damage display
      setAnimateDamage(true)
      setExpectedDamage(damage)
      
      const timer = setTimeout(() => {
        setAnimateDamage(false)
      }, 300)
      
      return () => clearTimeout(timer)
    } else {
      setExpectedDamage(null)
    }
  }, [selectedCard, attackType])

  // Calculate battle statistics
  const calculateTotalDamage = (moves: Move[], address: string): number => {
    return moves
      .filter(move => move.player === address)
      .reduce((total, move) => total + move.damage, 0)
  }

  const calculateAverageDamage = (moves: Move[], address: string): number => {
    const playerMoves = moves.filter(move => move.player === address)
    if (playerMoves.length === 0) return 0
    return Math.round(calculateTotalDamage(moves, address) / playerMoves.length)
  }

  const calculateSpecialAttacks = (moves: Move[], address: string): number => {
    return moves
      .filter(move => move.player === address && move.attackType === "special")
      .length
  }

  const calculateCardsDefeated = (moves: Move[], address: string): number => {
    // Improved logic to detect defeated cards
    const defeatedCards = new Set<number>()
    let opponentHP = [100, 100, 100, 100] // Simplified HP tracking
    
    // Find the opponent address
    const opponentAddr = Object.keys(gameState.players).find(addr => addr !== address)
    if (!opponentAddr) return 0
    
    // Get all moves by this player
    const playerMoves = moves.filter(move => move.player === address)
    
    // Calculate defeated cards
    for (const move of playerMoves) {
      const targetIdx = move.targetCardIndex
      
      // Reduce HP and check if defeated
      opponentHP[targetIdx] -= move.damage
      if (opponentHP[targetIdx] <= 0) {
        defeatedCards.add(targetIdx)
      }
    }
    
    return defeatedCards.size
  }
  
  // Get actual defeated cards count from game state
  const getActualDefeatedCards = (playerAddr: string): number => {
    // Find opponent address
    const opponentAddr = Object.keys(gameState.players).find(addr => addr !== playerAddr)
    if (!opponentAddr || !gameState.players[opponentAddr].cards) return 0
    
    // Count defeated cards
    return gameState.players[opponentAddr].cards.filter(card => card.defeated).length
  }

  return (
    <Card className="bg-gray-800/80 text-gray-100 h-full backdrop-blur-sm border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-cyan-400">Battle Info</CardTitle>
      </CardHeader>
      <Tabs defaultValue="battle" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="battle"><Flame className="h-4 w-4 mr-2" /> Battle</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> Moves</TabsTrigger>
          <TabsTrigger value="stats"><Trophy className="h-4 w-4 mr-2" /> Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="battle" className="mt-4 space-y-4">
          {/* Room Info */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
            <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
            <Badge className={gameState.status === "completed" ? "bg-green-600" : "bg-blue-600"}>
              {gameState.status === "completed" ? "Completed" : "In Progress"}
            </Badge>
          </div>
          
          {/* Selected Card Info */}
          {selectedCard ? (
            <div className="bg-gray-700/70 rounded-md p-3 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-md overflow-hidden mr-2">
                    <img 
                      src={selectedCard.image} 
                      alt={selectedCard.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{selectedCard.name}</h3>
                    <div className="text-xs text-gray-300">{selectedCard.type}</div>
                  </div>
                </div>
                <Badge className={attackType === "normal" ? "bg-blue-600" : "bg-amber-600"}>
                  {attackType === "normal" ? "Normal" : "Special"} Attack
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800/70 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Attack</div>
                  <div className="flex items-center justify-center gap-1">
                    <Sword className="h-3.5 w-3.5 text-blue-400" />
                    <span className="font-bold">{selectedCard.attackPower}</span>
                  </div>
                </div>
                
                <div className="bg-gray-800/70 p-2 rounded-md">
                  <div className="text-xs text-gray-400">Special</div>
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-bold">{selectedCard.specialAttackPower}</span>
                  </div>
                </div>
                
                <div className="bg-gray-800/70 p-2 rounded-md">
                  <div className="text-xs text-gray-400">HP</div>
                  <div className="flex items-center justify-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-bold">{selectedCard.hp}/{selectedCard.maxHp}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-300">Expected Damage:</div>
                <div 
                  className={cn(
                    "font-bold text-lg transition-all duration-300",
                    animateDamage ? "text-red-400 scale-125" : "text-white"
                  )}
                >
                  {expectedDamage}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/70 rounded-md p-3 text-center py-8">
              <div className="text-lg text-gray-300 mb-1">
                {isPlayerTurn ? "Select a card to attack" : "Waiting for opponent's move"}
              </div>
              <div className="text-sm text-gray-400">
                {isPlayerTurn 
                  ? "Choose one of your cards below to attack your opponent" 
                  : "Your opponent is planning their next move"}
              </div>
            </div>
          )}
          
          {/* Battle Status */}
          <div className="pt-3 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <span>Battle Status</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Player Status Card */}
              <div className={`bg-gray-700/70 p-3 rounded-md border-l-4 ${isPlayerTurn ? "border-cyan-500" : "border-gray-700"}`}>
                <div className="text-xs text-gray-400 mb-1">You</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img src="/images/player-avatar.png" alt="You" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-sm text-white font-semibold">{playerName}</div>
                </div>
                <div className="mt-2 text-xs flex items-center justify-between">
                  <span className="text-gray-300">Cards:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400 font-medium">
                      {gameState.players[playerAddress]?.cards?.filter(c => !c.defeated).length || 0}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span>{gameState.players[playerAddress]?.cards?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Opponent Status Card */}
              <div className={`bg-gray-700/70 p-3 rounded-md border-l-4 ${!isPlayerTurn ? "border-red-500" : "border-gray-700"}`}>
                <div className="text-xs text-gray-400 mb-1">Opponent</div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img src="/images/opponent-avatar.png" alt="Opponent" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-sm text-white font-semibold">{opponentName}</div>
                </div>
                <div className="mt-2 text-xs flex items-center justify-between">
                  <span className="text-gray-300">Cards:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400 font-medium">
                      {opponent ? gameState.players[opponent]?.cards?.filter(c => !c.defeated).length || 0 : 0}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span>{opponent ? gameState.players[opponent]?.cards?.length || 0 : 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Battle Progress */}
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <div className="text-xs text-gray-400">Battle Progress</div>
                <div className="text-xs text-gray-400">
                  Round {Math.ceil(gameState.moveHistory.length / 2)}
                </div>
              </div>
              <div className="relative h-8 bg-gray-900/50 rounded-md overflow-hidden">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-gray-700"></div>
                </div>
                <div className="relative h-full flex">
                  <div 
                    className={`h-full bg-cyan-900/30 border-r border-cyan-500 flex items-center justify-center text-xs text-cyan-400 font-medium`}
                    style={{ width: `${(4 - getActualDefeatedCards(opponent || "")) * 25}%` }}
                  >
                    {gameState.players[opponent || ""]?.cards?.filter(c => !c.defeated).length || 0}/4
                  </div>
                  <div 
                    className={`h-full bg-red-900/30 flex items-center justify-center text-xs text-red-400 font-medium`}
                    style={{ width: `${(4 - getActualDefeatedCards(playerAddress)) * 25}%` }}
                  >
                    {gameState.players[playerAddress]?.cards?.filter(c => !c.defeated).length || 0}/4
                  </div>
                </div>
                <div className="absolute inset-x-0 top-1 flex justify-center">
                  <div className="px-2 py-0.5 bg-gray-800 rounded-full text-xs">
                    {getActualDefeatedCards(opponent || "")} : {getActualDefeatedCards(playerAddress)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Battle Timer */}
            <div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1 text-gray-300">
                  <Timer className="h-4 w-4" />
                  <span>Battle Time</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {formatTimeElapsed(Date.now() - (gameState.startTime || Date.now()))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Prize Pool */}
          <div className="mt-4 bg-gradient-to-r from-amber-900/30 to-amber-700/30 p-3 rounded-md border border-amber-700/50">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-300">
              <Trophy className="h-4 w-4" />
              <span>Prize Pool</span>
            </h3>
            <div className="mt-2 flex justify-between items-center">
              <div className="text-gray-300">Total Prize:</div>
              <div className="text-2xl font-bold text-amber-400">{gameState.wager * 2} AR</div>
            </div>
            <div className="mt-1 text-xs text-gray-400 text-center">
              Winner takes the entire prize pool
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <span>Move History</span>
          </h3>
          <div className="bg-gray-900/70 rounded-md p-2 h-80 overflow-y-auto">
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
                    gameState={gameState}
                  />
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="stats" className="mt-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-400" />
              <span>Battle Stats</span>
            </h3>
            
            <div className="bg-gray-700/70 rounded-md p-3">
              <h4 className="text-xs text-gray-400 mb-2">Your Performance</h4>
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
                  icon={<Zap className="h-4 w-4 text-purple-400" />}
                />
                <StatsCard
                  title="Cards Defeated"
                  value={getActualDefeatedCards(opponent || "")}
                  icon={<Shield className="h-4 w-4 text-green-400" />}
                />
              </div>
            </div>
            
            {opponent && (
              <div className="bg-gray-700/70 rounded-md p-3">
                <h4 className="text-xs text-gray-400 mb-2">Opponent's Performance</h4>
                <div className="grid grid-cols-2 gap-2">
                  <StatsCard
                    title="Total Damage"
                    value={calculateTotalDamage(gameState.moveHistory, opponent)}
                    icon={<Sword className="h-4 w-4 text-red-400" />}
                  />
                  <StatsCard
                    title="Avg. Damage"
                    value={calculateAverageDamage(gameState.moveHistory, opponent)}
                    icon={<Target className="h-4 w-4 text-amber-400" />}
                  />
                  <StatsCard
                    title="Special Attacks"
                    value={calculateSpecialAttacks(gameState.moveHistory, opponent)}
                    icon={<Zap className="h-4 w-4 text-purple-400" />}
                  />
                  <StatsCard
                    title="Cards Defeated"
                    value={getActualDefeatedCards(playerAddress)}
                    icon={<Shield className="h-4 w-4 text-green-400" />}
                  />
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-cyan-900/30 to-cyan-700/30 p-3 rounded-md border border-cyan-700/50">
              <h4 className="text-xs text-cyan-400 mb-2 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                <span>Current Advantage</span>
              </h4>
              
              <div className="relative pt-2">
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${getAdvantageColor(getAdvantageScore(gameState, playerAddress))}`} 
                    style={{ width: `${Math.abs(getAdvantageScore(gameState, playerAddress)) * 50 + 50}%`, 
                            marginLeft: getAdvantageScore(gameState, playerAddress) < 0 ? '0%' : 'auto',
                            marginRight: getAdvantageScore(gameState, playerAddress) > 0 ? '0%' : 'auto' }}
                  ></div>
                </div>
                <div className="absolute inset-x-0 top-0 flex justify-center">
                  <div className="text-xs px-2 py-0.5 bg-gray-800 rounded-full">
                    {getAdvantageText(getAdvantageScore(gameState, playerAddress))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

// Helper components and functions
function MoveHistoryItem({ 
  move, 
  playerAddress, 
  index,
  gameState 
}: { 
  move: Move; 
  playerAddress: string; 
  index: number;
  gameState: GameState;
}) {
  const isPlayerMove = move.player === playerAddress
  const icon = move.attackType === "special" 
    ? <Zap className="h-3 w-3 text-amber-500" /> 
    : <Sword className="h-3 w-3" />
  const timestamp = new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  
  // Get card names
  const getCardName = (player: string, cardIndex: number): string => {
    if (gameState.players[player]?.cards?.[cardIndex]) {
      return gameState.players[player].cards[cardIndex].name
    }
    return `Card ${cardIndex + 1}`
  }
  
  const attackerName = getCardName(move.player, move.cardIndex)
  
  // Find target player
  const targetPlayer = Object.keys(gameState.players).find(player => player !== move.player) || ""
  const targetName = getCardName(targetPlayer, move.targetCardIndex)

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
          {attackerName} used {move.attackType} attack on {targetName} for{" "}
          <span className="text-amber-400 font-medium">{move.damage}</span> damage
        </span>
      </div>
    </li>
  )
}

function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800/70 p-2 rounded-md">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-300">{title}</div>
        {icon}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  )
}

// Calculate advantage score (-1 to 1) for a player
function getAdvantageScore(gameState: GameState, playerAddress: string): number {
  // Count active cards for each player
  const playerCards = gameState.players[playerAddress]?.cards || []
  const playerActiveCards = playerCards.filter(card => !card.defeated).length
  
  // Find opponent
  const opponent = Object.keys(gameState.players).find(addr => addr !== playerAddress)
  if (!opponent) return 0
  
  const opponentCards = gameState.players[opponent]?.cards || []
  const opponentActiveCards = opponentCards.filter(card => !card.defeated).length
  
  // If any player has no cards, they lost
  if (playerActiveCards === 0) return -1
  if (opponentActiveCards === 0) return 1
  
  // Calculate HP advantage
  const playerTotalHP = playerCards.reduce((sum, card) => sum + card.hp, 0)
  const opponentTotalHP = opponentCards.reduce((sum, card) => sum + card.hp, 0)
  
  const playerMaxHP = playerCards.reduce((sum, card) => sum + card.maxHp, 0)
  const opponentMaxHP = opponentCards.reduce((sum, card) => sum + card.maxHp, 0)
  
  const playerHPRatio = playerTotalHP / playerMaxHP
  const opponentHPRatio = opponentTotalHP / opponentMaxHP
  
  // Calculate advantage score (between -1 and 1)
  const cardAdvantage = (playerActiveCards - opponentActiveCards) / 4
  const hpAdvantage = playerHPRatio - opponentHPRatio
  
  // Weighted average
  return cardAdvantage * 0.6 + hpAdvantage * 0.4
}

function getAdvantageColor(score: number): string {
  if (score > 0.5) return "bg-green-500"
  if (score > 0.2) return "bg-green-400"
  if (score > 0.1) return "bg-cyan-400"
  if (score > -0.1) return "bg-gray-400"
  if (score > -0.2) return "bg-orange-400"
  if (score > -0.5) return "bg-red-400"
  return "bg-red-500"
}

function getAdvantageText(score: number): string {
  if (score > 0.5) return "Strong Advantage"
  if (score > 0.2) return "Advantage"
  if (score > 0.1) return "Slight Advantage"
  if (score > -0.1) return "Even"
  if (score > -0.2) return "Slight Disadvantage"
  if (score > -0.5) return "Disadvantage"
  return "Strong Disadvantage"
}

function formatTimeElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
// import { cn } from "@/lib/utils"

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
//             {/* Fixed: Use className instead of indicatorClassName */}
//             <Progress
//               value={(timeLeft / 30) * 100}
//               className="h-2 bg-gray-700"
//             >
//               <div 
//                 className={cn(
//                   "h-full transition-all", 
//                   timeLeft < 10 ? "bg-red-500" : "bg-green-500"
//                 )} 
//                 style={{ width: `${(timeLeft / 30) * 100}%` }}
//               />
//             </Progress>
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
// // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// // import { Badge } from "@/components/ui/badge"
// // import { Progress } from "@/components/ui/progress"
// // import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// // import { Sword, Clock, History, Trophy, Users, Target, Shield } from "lucide-react"
// // import { getPlayerStatus } from "@/lib/game-utils"
// // import type { GameState, Move } from "@/lib/types"

// // interface ArenaHUDProps {
// //   gameState: GameState
// //   playerAddress: string
// // }

// // export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
// //   const [timeLeft, setTimeLeft] = useState(30)
// //   const [activeTab, setActiveTab] = useState("info")

// //   // Reset timer when turn changes
// //   useEffect(() => {
// //     setTimeLeft(30)
// //     const timer = setInterval(() => {
// //       setTimeLeft((prev) => Math.max(0, prev - 1))
// //     }, 1000)

// //     return () => clearInterval(timer)
// //   }, [gameState.currentTurn])

// //   // Get player and opponent info
// //   const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)
// //   const opponentName = opponent ? opponent.substring(0, 6) + "..." + opponent.substring(opponent.length - 4) : "Waiting..."
// //   const playerName = playerAddress.substring(0, 6) + "..." + playerAddress.substring(playerAddress.length - 4)
// //   const isPlayerTurn = gameState.currentTurn === playerAddress
// //   const playerStatus = getPlayerStatus(gameState, playerAddress)

// //   // Calculate battle statistics
// //   const calculateTotalDamage = (moves: Move[], address: string): number => {
// //     return moves
// //       .filter(move => move.player === address)
// //       .reduce((total, move) => total + move.damage, 0);
// //   };

// //   const calculateAverageDamage = (moves: Move[], address: string): number => {
// //     const playerMoves = moves.filter(move => move.player === address);
// //     if (playerMoves.length === 0) return 0;
// //     return Math.round(calculateTotalDamage(moves, address) / playerMoves.length);
// //   };

// //   const calculateSpecialAttacks = (moves: Move[], address: string): number => {
// //     return moves
// //       .filter(move => move.player === address && move.attackType === "special")
// //       .length;
// //   };

// //   const calculateCardsDefeated = (moves: Move[], address: string): number => {
// //     // This is an approximation since we don't track defeated cards directly in moves
// //     // In a real implementation, you would need to track this separately
// //     return moves
// //       .filter(move => move.player === address)
// //       .filter(move => move.damage >= 20) // Assuming high damage might have defeated a card
// //       .length;
// //   };

// //   return (
// //     <Card className="bg-gray-800 text-gray-100 h-full">
// //       <CardHeader className="pb-2">
// //         <CardTitle className="text-xl text-cyan-400">Battle Information</CardTitle>
// //       </CardHeader>
// //       <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
// //         <TabsList className="w-full grid grid-cols-3">
// //           <TabsTrigger value="info"><Users className="h-4 w-4 mr-2" /> Info</TabsTrigger>
// //           <TabsTrigger value="history"><History className="h-4 w-4 mr-2" /> History</TabsTrigger>
// //           <TabsTrigger value="stats"><Trophy className="h-4 w-4 mr-2" /> Stats</TabsTrigger>
// //         </TabsList>
        
// //         <TabsContent value="info" className="mt-4 space-y-4">
// //           {/* Room Info */}
// //           <div className="flex flex-wrap gap-2 mb-4">
// //             <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
// //             <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
// //             <Badge className={gameState.status === "completed" ? "bg-green-600" : "bg-blue-600"}>
// //               {gameState.status === "completed" ? "Completed" : "In Progress"}
// //             </Badge>
// //           </div>
          
// //           {/* Turn Timer */}
// //           <div className="space-y-1">
// //             <div className="flex justify-between items-center">
// //               <span className="text-sm font-medium">Turn Timer</span>
// //               <span className="text-sm">{timeLeft}s</span>
// //             </div>
// //             <Progress
// //               value={(timeLeft / 30) * 100}
// //               className="h-2 bg-gray-700"
// //               indicatorClassName={timeLeft < 10 ? "bg-red-500" : "bg-green-500"}
// //             />
// //           </div>
          
// //           {/* Player Status */}
// //           <div className="pt-2">
// //             <span className="text-sm font-medium">Status</span>
// //             <div className="text-lg font-semibold mt-1">
// //               {playerStatus}
// //             </div>
// //           </div>
          
// //           {/* Turn Indicator */}
// //           <div className="grid grid-cols-2 gap-2 mt-2">
// //             <Card className={`border ${isPlayerTurn ? "border-cyan-500" : "border-gray-700"}`}>
// //               <CardContent className="p-3">
// //                 <div className="flex items-center gap-2">
// //                   {isPlayerTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
// //                   <div className="text-sm font-medium">You</div>
// //                   {isPlayerTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
// //                 </div>
// //               </CardContent>
// //             </Card>

// //             <Card className={`border ${!isPlayerTurn ? "border-red-500" : "border-gray-700"}`}>
// //               <CardContent className="p-3">
// //                 <div className="flex items-center gap-2">
// //                   {!isPlayerTurn && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
// //                   <div className="text-sm font-medium">Opponent</div>
// //                   {!isPlayerTurn && <Badge className="ml-auto bg-red-600">Their Turn</Badge>}
// //                 </div>
// //               </CardContent>
// //             </Card>
// //           </div>
          
// //           {/* Players */}
// //           <div className="pt-2">
// //             <div className="flex items-center justify-between mb-1">
// //               <span className="text-sm font-medium">Players</span>
// //               <span className="text-xs text-gray-400">{Object.keys(gameState.players).length} / 2</span>
// //             </div>
// //             {Object.entries(gameState.players).map(([address, player]) => (
// //               <div key={address} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-0">
// //                 <div className={`text-sm ${address === playerAddress ? "text-cyan-400" : "text-gray-300"}`}>
// //                   {address === playerAddress ? "You" : "Opponent"}
// //                 </div>
// //                 <div className="text-sm text-gray-400">
// //                   {address.substring(0, 6)}...{address.substring(address.length - 4)}
// //                 </div>
// //               </div>
// //             ))}
// //           </div>
// //         </TabsContent>
        
// //         <TabsContent value="history" className="mt-4">
// //           <h3 className="text-sm font-semibold mb-2">Move History</h3>
// //           <div className="bg-gray-900 rounded-md p-2 h-64 overflow-y-auto">
// //             {gameState.moveHistory.length === 0 ? (
// //               <div className="text-gray-500 text-center py-4">No moves yet</div>
// //             ) : (
// //               <ul className="space-y-2 text-sm">
// //                 {[...gameState.moveHistory].reverse().map((move, index) => (
// //                   <MoveHistoryItem 
// //                     key={index} 
// //                     move={move} 
// //                     playerAddress={playerAddress} 
// //                     index={gameState.moveHistory.length - index}
// //                   />
// //                 ))}
// //               </ul>
// //             )}
// //           </div>
// //         </TabsContent>
        
// //         <TabsContent value="stats" className="mt-4">
// //           <div className="space-y-4">
// //             <h3 className="text-sm font-semibold mb-2">Battle Stats</h3>
// //             <div className="grid grid-cols-2 gap-2">
// //               <StatsCard
// //                 title="Total Damage"
// //                 value={calculateTotalDamage(gameState.moveHistory, playerAddress)}
// //                 icon={<Sword className="h-4 w-4 text-red-400" />}
// //               />
// //               <StatsCard
// //                 title="Avg. Damage"
// //                 value={calculateAverageDamage(gameState.moveHistory, playerAddress)}
// //                 icon={<Target className="h-4 w-4 text-amber-400" />}
// //               />
// //               <StatsCard
// //                 title="Special Attacks"
// //                 value={calculateSpecialAttacks(gameState.moveHistory, playerAddress)}
// //                 icon={<Sword className="h-4 w-4 text-purple-400" />}
// //               />
// //               <StatsCard
// //                 title="Cards Defeated"
// //                 value={calculateCardsDefeated(gameState.moveHistory, playerAddress)}
// //                 icon={<Shield className="h-4 w-4 text-green-400" />}
// //               />
// //             </div>
            
// //             <div className="mt-6">
// //               <h3 className="text-sm font-semibold mb-2">Potential Rewards</h3>
// //               <Card className="bg-gray-700 border-amber-500/30">
// //                 <CardContent className="p-3">
// //                   <div className="flex justify-between items-center">
// //                     <div className="text-sm">Wagered Amount:</div>
// //                     <div className="font-mono font-semibold text-amber-400">{gameState.wager} AR</div>
// //                   </div>
// //                   <div className="flex justify-between items-center mt-1">
// //                     <div className="text-sm">Potential Win:</div>
// //                     <div className="font-mono font-semibold text-green-400">{gameState.wager * 2} AR</div>
// //                   </div>
// //                 </CardContent>
// //               </Card>
// //             </div>
// //           </div>
// //         </TabsContent>
// //       </Tabs>
// //     </Card>
// //   )
// // }

// // // Helper components
// // function MoveHistoryItem({ move, playerAddress, index }: { move: Move; playerAddress: string; index: number }) {
// //   const isPlayerMove = move.player === playerAddress
// //   const icon =
// //     move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />
// //   const timestamp = new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// //   return (
// //     <li className="flex items-start gap-2 p-2 rounded bg-gray-800/60">
// //       <div className="flex-shrink-0 mt-0.5">{icon}</div>
// //       <div className="flex-1">
// //         <div className="flex justify-between items-center mb-1">
// //           <span className={`text-xs font-medium ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
// //             {isPlayerMove ? "You" : "Opponent"}
// //           </span>
// //           <span className="text-xs text-gray-500">{timestamp}</span>
// //         </div>
// //         <span className="text-xs">
// //           Used card {move.cardIndex + 1} ({move.attackType}) on card {move.targetCardIndex + 1} for{" "}
// //           <span className="text-amber-400 font-medium">{move.damage}</span> damage
// //         </span>
// //       </div>
// //     </li>
// //   )
// // }

// // function StatsCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
// //   return (
// //     <Card className="bg-gray-700">
// //       <CardContent className="p-3">
// //         <div className="flex items-center justify-between">
// //           <div className="text-xs text-gray-300">{title}</div>
// //           {icon}
// //         </div>
// //         <div className="text-xl font-bold mt-1">{value}</div>
// //       </CardContent>
// //     </Card>
// //   )
// // }









// // // "use client"

// // // import { useState, useEffect } from "react"
// // // import { Card, CardContent } from "@/components/ui/card"
// // // import { Badge } from "@/components/ui/badge"
// // // import { Progress } from "@/components/ui/progress"
// // // import { Sword, Clock } from "lucide-react"
// // // import type { GameState, Move } from "@/lib/types"

// // // interface ArenaHUDProps {
// // //   gameState: GameState
// // //   playerAddress: string
// // // }

// // // export function ArenaHUD({ gameState, playerAddress }: ArenaHUDProps) {
// // //   const [timeLeft, setTimeLeft] = useState(30)

// // //   // Reset timer when turn changes
// // //   useEffect(() => {
// // //     setTimeLeft(30)
// // //     const timer = setInterval(() => {
// // //       setTimeLeft((prev) => Math.max(0, prev - 1))
// // //     }, 1000)

// // //     return () => clearInterval(timer)
// // //   }, [gameState.currentTurn])

// // //   const isPlayerTurn = gameState.currentTurn === playerAddress
// // //   const opponent = Object.keys(gameState.players).find((addr) => addr !== playerAddress)

// // //   return (
// // //     <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
// // //       <div className="flex justify-between items-center mb-4">
// // //         <div className="flex items-center gap-2">
// // //           <Badge className="bg-cyan-600">Room: {gameState.roomCode}</Badge>
// // //           <Badge className="bg-amber-600">Wager: {gameState.wager} AR</Badge>
// // //         </div>

// // //         <div className="flex items-center gap-2">
// // //           <Clock className="h-4 w-4" />
// // //           <Progress
// // //             value={(timeLeft / 30) * 100}
// // //             className="w-24 h-2 bg-gray-700"
// // //             indicatorClassName={timeLeft < 10 ? "bg-red-500" : "bg-green-500"}
// // //           />
// // //           <span className="text-sm">{timeLeft}s</span>
// // //         </div>
// // //       </div>

// // //       <div className="grid grid-cols-2 gap-4">
// // //         <PlayerInfo name={`You (${playerAddress.substring(0, 6)}...)`} isCurrentTurn={isPlayerTurn} />

// // //         <PlayerInfo name={`Opponent (${opponent ? opponent.substring(0, 6) : ""}...)`} isCurrentTurn={!isPlayerTurn} />
// // //       </div>

// // //       <div className="mt-4">
// // //         <h3 className="text-sm font-semibold mb-2">Move History</h3>
// // //         <div className="bg-gray-900 rounded-md p-2 h-32 overflow-y-auto">
// // //           {gameState.moveHistory.length === 0 ? (
// // //             <div className="text-gray-500 text-center py-4">No moves yet</div>
// // //           ) : (
// // //             <ul className="space-y-1 text-sm">
// // //               {gameState.moveHistory.map((move, index) => (
// // //                 <MoveHistoryItem key={index} move={move} playerAddress={playerAddress} />
// // //               ))}
// // //             </ul>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   )
// // // }

// // // function PlayerInfo({ name, isCurrentTurn }: { name: string; isCurrentTurn: boolean }) {
// // //   return (
// // //     <Card className={`border ${isCurrentTurn ? "border-cyan-500" : "border-gray-700"}`}>
// // //       <CardContent className="p-3">
// // //         <div className="flex items-center gap-2">
// // //           {isCurrentTurn && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
// // //           <h3 className="font-medium">{name}</h3>
// // //           {isCurrentTurn && <Badge className="ml-auto bg-cyan-600">Your Turn</Badge>}
// // //         </div>
// // //       </CardContent>
// // //     </Card>
// // //   )
// // // }

// // // function MoveHistoryItem({ move, playerAddress }: { move: Move; playerAddress: string }) {
// // //   const isPlayerMove = move.player === playerAddress
// // //   const icon =
// // //     move.attackType === "special" ? <Sword className="h-3 w-3 text-amber-500" /> : <Sword className="h-3 w-3" />

// // //   return (
// // //     <li className={`flex items-center gap-2 ${isPlayerMove ? "text-cyan-400" : "text-red-400"}`}>
// // //       {icon}
// // //       <span>
// // //         {isPlayerMove ? "You" : "Opponent"} used card {move.cardIndex + 1}({move.attackType}) on card{" "}
// // //         {move.targetCardIndex + 1} for {move.damage} damage
// // //       </span>
// // //     </li>
// // //   )
// // // }
