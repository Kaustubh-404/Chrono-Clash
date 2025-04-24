"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedCardComponent } from "@/components/game/card-component"
import { ArenaHUD } from "@/components/game/arena-hud"
import { Sword, Shield, ArrowLeft, Trophy, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateCardPool, calculateDamage } from "@/lib/cards"
import { 
  applyMove, 
  createMove, 
  isPlayerTurn, 
  canSelectCard, 
  canAttackCard 
} from "@/lib/game-utils"
import type { GameState, Card as CardType, Move } from "@/lib/types"

interface GameArenaProps {
  gameState: GameState | null
  playerAddress: string
  onExit: () => void
  onMove: (move: Move) => Promise<boolean>
}

export default function GameArena({ gameState, playerAddress, onExit, onMove }: GameArenaProps) {
  const { toast } = useToast()
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [attackType, setAttackType] = useState<"normal" | "special">("normal")
  const [isAttacking, setIsAttacking] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationProps, setAnimationProps] = useState({
    type: "normal" as "normal" | "special",
    sourcePosition: { x: 0, y: 0 },
    targetPosition: { x: 0, y: 0 },
  })
  const [turnTimer, setTurnTimer] = useState(30)
  
  const playerCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
  const opponentCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Get player and opponent cards
  const getPlayerCards = (): CardType[] => {
    if (!gameState) return generateCardPool()
    return gameState.players[playerAddress]?.cards || generateCardPool()
  }

  const getOpponentCards = (): CardType[] => {
    if (!gameState) return generateCardPool()
    const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress)
    if (!opponentAddress) return generateCardPool()
    return gameState.players[opponentAddress]?.cards || generateCardPool()
  }

  const playerCards = getPlayerCards()
  const opponentCards = getOpponentCards()

  // Reset timer when turn changes
  useEffect(() => {
    if (!gameState) return
    setTurnTimer(30)
    
    const timer = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 0) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState?.currentTurn])

  // Handle card selection
  const handleCardSelect = (index: number) => {
    if (!gameState) return
    if (!isPlayerTurn(gameState, playerAddress)) {
      toast({
        title: "Not your turn",
        description: "Please wait for your opponent's move",
        variant: "destructive",
      })
      return
    }
    
    const card = playerCards[index]
    if (!canSelectCard(gameState, playerAddress, card)) {
      if (card.cooldown > 0) {
        toast({
          title: "Card on cooldown",
          description: `This card is on cooldown for ${card.cooldown} more seconds`,
          variant: "destructive",
        })
      } else if (card.defeated) {
        toast({
          title: "Card defeated",
          description: "This card has been defeated and cannot be used",
          variant: "destructive",
        })
      }
      return
    }

    setSelectedCard(index)
    setAttackType(card.usageCount >= 2 ? "special" : "normal")
  }

  // Handle attack
  const handleAttack = async (targetIndex: number) => {
    if (selectedCard === null || isAttacking || !gameState) return
    
    const targetCard = opponentCards[targetIndex]
    if (!canAttackCard(gameState, playerAddress, targetCard)) {
      toast({
        title: "Invalid target",
        description: "This card cannot be targeted",
        variant: "destructive",
      })
      return
    }

    // Get positions for animation
    const sourceElement = playerCardRefs.current[selectedCard]
    const targetElement = opponentCardRefs.current[targetIndex]

    if (sourceElement && targetElement) {
      const sourceRect = sourceElement.getBoundingClientRect()
      const targetRect = targetElement.getBoundingClientRect()

      setAnimationProps({
        type: attackType,
        sourcePosition: {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2,
        },
        targetPosition: {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        },
      })

      setShowAnimation(true)
    }

    setIsAttacking(true)

    try {
      // Create the move
      const move = createMove(
        playerAddress,
        selectedCard,
        targetIndex,
        attackType,
        playerCards[selectedCard],
        opponentCards[targetIndex]
      )

      // Send the move to the parent component
      const success = await onMove(move)
      
      if (!success) {
        throw new Error("Failed to process move")
      }

      // Play sound effect
      const audio = new Audio(attackType === "normal" ? "/sounds/attack.mp3" : "/sounds/special.mp3")
      audio.volume = 0.5
      audio.play().catch(e => console.error("Failed to play sound effect:", e))
      
    } catch (error) {
      console.error("Error processing attack:", error)
      toast({
        title: "Attack failed",
        description: "Failed to process attack. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAttacking(false)
      setSelectedCard(null)
    }
  }

  // Handle animation completion
  const handleAnimationComplete = () => {
    setShowAnimation(false)
  }

  if (!gameState) {
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

  const isPlayerTurnNow = isPlayerTurn(gameState, playerAddress)
  const isGameOver = gameState.status === "completed"
  const isWinner = gameState.winner === playerAddress

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-4">
      {/* Game over modal */}
      {isGameOver && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                {isWinner ? (
                  <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
                ) : (
                  <Shield className="h-16 w-16 text-red-500 mx-auto" />
                )}
              </div>
              <h2 className="text-3xl font-bold mb-4">{isWinner ? "Victory!" : "Defeat!"}</h2>
              <p className="text-gray-300 mb-6">
                {isWinner ? `You've won ${gameState.wager} AR tokens!` : "Better luck next time."}
              </p>
              <Button onClick={onExit} className="w-full bg-cyan-600 hover:bg-cyan-700">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={onExit} className="text-gray-300">
            <ArrowLeft className="h-4 w-4 mr-2" /> Exit Arena
          </Button>
          <h1 className="text-2xl font-bold text-cyan-400">ChronoClash Arena</h1>
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="h-4 w-4" />
            <span>{turnTimer}s</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Opponent Cards */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-300">Opponent</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {opponentCards.map((card, index) => (
                    <div key={index} ref={(el) => { opponentCardRefs.current[index] = el; }}>
                      <EnhancedCardComponent
                        card={card}
                        isPlayerCard={false}
                        isSelectable={false}
                        isSelected={false}
                        isTarget={isPlayerTurnNow && selectedCard !== null && !card.defeated}
                        onAttack={() => handleAttack(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Cards */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-300">Your Cards</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {playerCards.map((card, index) => (
                    <div key={index} ref={(el) => { playerCardRefs.current[index] = el; }}>
                      <EnhancedCardComponent
                        card={card}
                        isPlayerCard={true}
                        isSelectable={isPlayerTurnNow && !card.defeated && card.cooldown === 0}
                        isSelected={selectedCard === index}
                        onSelect={() => handleCardSelect(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Attack Controls */}
              {isPlayerTurnNow && selectedCard !== null && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold mb-4 text-cyan-400">Attack Controls</h2>
                  <Tabs
                    defaultValue={attackType}
                    onValueChange={(value) => setAttackType(value as "normal" | "special")}
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="normal" className="w-1/2">
                        <Sword className="h-4 w-4 mr-2" /> Normal Attack
                      </TabsTrigger>
                      <TabsTrigger
                        value="special"
                        disabled={playerCards[selectedCard].usageCount < 2}
                        className="w-1/2"
                      >
                        <Sword className="h-4 w-4 mr-2 text-amber-500" /> Special Attack
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="normal" className="mt-4">
                      <p className="text-sm text-gray-300 mb-2">
                        Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s normal attack.
                      </p>
                      <div className="flex items-center gap-2">
                        <Sword className="h-5 w-5" />
                        <span>Damage: {playerCards[selectedCard]?.attackPower}</span>
                      </div>
                    </TabsContent>
                    <TabsContent value="special" className="mt-4">
                      <p className="text-sm text-gray-300 mb-2">
                        Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s special attack.
                      </p>
                      <div className="flex items-center gap-2">
                        <Sword className="h-5 w-5 text-amber-500" />
                        <span>Damage: {playerCards[selectedCard]?.specialAttackPower}</span>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </div>

          {/* Game HUD */}
          <div>
            <ArenaHUD gameState={gameState} playerAddress={playerAddress} />
          </div>
        </div>
      </div>
    </div>
  )
}



// "use client"

// import { useState, useEffect, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent } from "@/components/ui/card"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { EnhancedCardComponent } from "@/components/game/card-component"
// import { ArenaHUD } from "@/components/game/arena-hud"
// import { Sword, Shield, ArrowLeft, Trophy, Clock } from "lucide-react"
// import { useToast } from "@/hooks/use-toast"
// import { generateCardPool, calculateDamage } from "@/lib/cards"
// import { 
//   applyMove, 
//   createMove, 
//   isPlayerTurn, 
//   canSelectCard, 
//   canAttackCard 
// } from "@/lib/game-utils"
// import type { GameState, Card as CardType, Move } from "@/lib/types"

// interface GameArenaProps {
//   gameState: GameState | null
//   playerAddress: string
//   onExit: () => void
//   onMove: (move: Move) => Promise<boolean>
// }

// export default function GameArena({ gameState, playerAddress, onExit, onMove }: GameArenaProps) {
//   const { toast } = useToast()
//   const [selectedCard, setSelectedCard] = useState<number | null>(null)
//   const [attackType, setAttackType] = useState<"normal" | "special">("normal")
//   const [isAttacking, setIsAttacking] = useState(false)
//   const [showAnimation, setShowAnimation] = useState(false)
//   const [animationProps, setAnimationProps] = useState({
//     type: "normal" as "normal" | "special",
//     sourcePosition: { x: 0, y: 0 },
//     targetPosition: { x: 0, y: 0 },
//   })
//   const [turnTimer, setTurnTimer] = useState(30)
  
//   const playerCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
//   const opponentCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

//   // Get player and opponent cards
//   const getPlayerCards = (): CardType[] => {
//     if (!gameState) return generateCardPool()
//     return gameState.players[playerAddress]?.cards || generateCardPool()
//   }

//   const getOpponentCards = (): CardType[] => {
//     if (!gameState) return generateCardPool()
//     const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress)
//     if (!opponentAddress) return generateCardPool()
//     return gameState.players[opponentAddress]?.cards || generateCardPool()
//   }

//   const playerCards = getPlayerCards()
//   const opponentCards = getOpponentCards()

//   // Reset timer when turn changes
//   useEffect(() => {
//     if (!gameState) return
//     setTurnTimer(30)
    
//     const timer = setInterval(() => {
//       setTurnTimer(prev => {
//         if (prev <= 0) return 0
//         return prev - 1
//       })
//     }, 1000)

//     return () => clearInterval(timer)
//   }, [gameState?.currentTurn])

//   // Handle card selection
//   const handleCardSelect = (index: number) => {
//     if (!gameState) return
//     if (!isPlayerTurn(gameState, playerAddress)) {
//       toast({
//         title: "Not your turn",
//         description: "Please wait for your opponent's move",
//         variant: "destructive",
//       })
//       return
//     }
    
//     const card = playerCards[index]
//     if (!canSelectCard(gameState, playerAddress, card)) {
//       if (card.cooldown > 0) {
//         toast({
//           title: "Card on cooldown",
//           description: `This card is on cooldown for ${card.cooldown} more seconds`,
//           variant: "destructive",
//         })
//       } else if (card.defeated) {
//         toast({
//           title: "Card defeated",
//           description: "This card has been defeated and cannot be used",
//           variant: "destructive",
//         })
//       }
//       return
//     }

//     setSelectedCard(index)
//     setAttackType(card.usageCount >= 2 ? "special" : "normal")
//   }

//   // Handle attack
//   const handleAttack = async (targetIndex: number) => {
//     if (selectedCard === null || isAttacking || !gameState) return
    
//     const targetCard = opponentCards[targetIndex]
//     if (!canAttackCard(gameState, playerAddress, targetCard)) {
//       toast({
//         title: "Invalid target",
//         description: "This card cannot be targeted",
//         variant: "destructive",
//       })
//       return
//     }

//     // Get positions for animation
//     const sourceElement = playerCardRefs.current[selectedCard]
//     const targetElement = opponentCardRefs.current[targetIndex]

//     if (sourceElement && targetElement) {
//       const sourceRect = sourceElement.getBoundingClientRect()
//       const targetRect = targetElement.getBoundingClientRect()

//       setAnimationProps({
//         type: attackType,
//         sourcePosition: {
//           x: sourceRect.left + sourceRect.width / 2,
//           y: sourceRect.top + sourceRect.height / 2,
//         },
//         targetPosition: {
//           x: targetRect.left + targetRect.width / 2,
//           y: targetRect.top + targetRect.height / 2,
//         },
//       })

//       setShowAnimation(true)
//     }

//     setIsAttacking(true)

//     try {
//       // Create the move
//       const move = createMove(
//         playerAddress,
//         selectedCard,
//         targetIndex,
//         attackType,
//         playerCards[selectedCard],
//         opponentCards[targetIndex]
//       )

//       // Send the move to the parent component
//       const success = await onMove(move)
      
//       if (!success) {
//         throw new Error("Failed to process move")
//       }

//       // Play sound effect
//       const audio = new Audio(attackType === "normal" ? "/sounds/attack.mp3" : "/sounds/special.mp3")
//       audio.volume = 0.5
//       audio.play().catch(e => console.error("Failed to play sound effect:", e))
      
//     } catch (error) {
//       console.error("Error processing attack:", error)
//       toast({
//         title: "Attack failed",
//         description: "Failed to process attack. Please try again.",
//         variant: "destructive",
//       })
//     } finally {
//       setIsAttacking(false)
//       setSelectedCard(null)
//     }
//   }

//   // Handle animation completion
//   const handleAnimationComplete = () => {
//     setShowAnimation(false)
//   }

//   if (!gameState) {
//     return (
//       <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
//           <h2 className="text-xl font-semibold text-white">Loading Arena...</h2>
//           <p className="text-gray-400">Connecting to the AO process</p>
//         </div>
//       </div>
//     )
//   }

//   const isPlayerTurnNow = isPlayerTurn(gameState, playerAddress)
//   const isGameOver = gameState.status === "completed"
//   const isWinner = gameState.winner === playerAddress

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-4">
//       {/* Game over modal */}
//       {isGameOver && (
//         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
//           <Card className="w-full max-w-md bg-gray-800 border-gray-700">
//             <CardContent className="p-8 text-center">
//               <div className="mb-6">
//                 {isWinner ? (
//                   <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
//                 ) : (
//                   <Shield className="h-16 w-16 text-red-500 mx-auto" />
//                 )}
//               </div>
//               <h2 className="text-3xl font-bold mb-4">{isWinner ? "Victory!" : "Defeat!"}</h2>
//               <p className="text-gray-300 mb-6">
//                 {isWinner ? `You've won ${gameState.wager} AR tokens!` : "Better luck next time."}
//               </p>
//               <Button onClick={onExit} className="w-full bg-cyan-600 hover:bg-cyan-700">
//                 Return to Home
//               </Button>
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       <div className="container mx-auto max-w-6xl">
//         <div className="flex justify-between items-center mb-6">
//           <Button variant="outline" onClick={onExit} className="text-gray-300">
//             <ArrowLeft className="h-4 w-4 mr-2" /> Exit Arena
//           </Button>
//           <h1 className="text-2xl font-bold text-cyan-400">ChronoClash Arena</h1>
//           <div className="flex items-center gap-2 text-gray-300">
//             <Clock className="h-4 w-4" />
//             <span>{turnTimer}s</span>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <div className="lg:col-span-2">
//             <div className="space-y-8">
//               {/* Opponent Cards */}
//               <div className="bg-gray-800/50 p-4 rounded-lg">
//                 <h2 className="text-lg font-semibold mb-4 text-gray-300">Opponent</h2>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   {opponentCards.map((card, index) => (
//                     <div key={index} ref={(el) => { opponentCardRefs.current[index] = el; }}>
//                       <EnhancedCardComponent
//                         card={card}
//                         isPlayerCard={false}
//                         isSelectable={false}
//                         isSelected={false}
//                         isTarget={isPlayerTurnNow && selectedCard !== null && !card.defeated}
//                         onAttack={() => handleAttack(index)}
//                       />
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Player Cards */}
//               <div className="bg-gray-800/50 p-4 rounded-lg">
//                 <h2 className="text-lg font-semibold mb-4 text-gray-300">Your Cards</h2>
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   {playerCards.map((card, index) => (
//                     <div key={index} ref={(el) => { playerCardRefs.current[index] = el; }}>
//                       <EnhancedCardComponent
//                         card={card}
//                         isPlayerCard={true}
//                         isSelectable={isPlayerTurnNow && !card.defeated && card.cooldown === 0}
//                         isSelected={selectedCard === index}
//                         onSelect={() => handleCardSelect(index)}
//                       />
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Attack Controls */}
//               {isPlayerTurnNow && selectedCard !== null && (
//                 <div className="bg-gray-800 p-4 rounded-lg">
//                   <h2 className="text-lg font-semibold mb-4 text-cyan-400">Attack Controls</h2>
//                   <Tabs
//                     defaultValue={attackType}
//                     onValueChange={(value) => setAttackType(value as "normal" | "special")}
//                   >
//                     <TabsList className="w-full">
//                       <TabsTrigger value="normal" className="w-1/2">
//                         <Sword className="h-4 w-4 mr-2" /> Normal Attack
//                       </TabsTrigger>
//                       <TabsTrigger
//                         value="special"
//                         disabled={playerCards[selectedCard].usageCount < 2}
//                         className="w-1/2"
//                       >
//                         <Sword className="h-4 w-4 mr-2 text-amber-500" /> Special Attack
//                       </TabsTrigger>
//                     </TabsList>
//                     <TabsContent value="normal" className="mt-4">
//                       <p className="text-sm text-gray-300 mb-2">
//                         Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s normal attack.
//                       </p>
//                       <div className="flex items-center gap-2">
//                         <Sword className="h-5 w-5" />
//                         <span>Damage: {playerCards[selectedCard]?.attackPower}</span>
//                       </div>
//                     </TabsContent>
//                     <TabsContent value="special" className="mt-4">
//                       <p className="text-sm text-gray-300 mb-2">
//                         Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s special attack.
//                       </p>
//                       <div className="flex items-center gap-2">
//                         <Sword className="h-5 w-5 text-amber-500" />
//                         <span>Damage: {playerCards[selectedCard]?.specialAttackPower}</span>
//                       </div>
//                     </TabsContent>
//                   </Tabs>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Game HUD */}
//           <div>
//             <ArenaHUD gameState={gameState} playerAddress={playerAddress} />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }









// // "use client"

// // import { useState, useEffect, useRef } from "react"
// // import { Button } from "@/components/ui/button"
// // import { Card, CardContent } from "@/components/ui/card"
// // import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// // import { EnhancedCardComponent } from "@/components/game/card-component"
// // import { ArenaHUD } from "@/components/game/arena-hud"
// // import { Sword, Shield, ArrowLeft, Trophy, Clock } from "lucide-react"
// // import { useToast } from "@/hooks/use-toast"
// // import { generateCardPool, calculateDamage } from "@/lib/cards"
// // import { 
// //   applyMove, 
// //   createMove, 
// //   isPlayerTurn, 
// //   canSelectCard, 
// //   canAttackCard 
// // } from "@/lib/game-utils"
// // import type { GameState, Card as CardType, Move } from "@/lib/types"

// // interface GameArenaProps {
// //   gameState: GameState | null
// //   playerAddress: string
// //   onExit: () => void
// //   onMove: (move: Move) => Promise<boolean>
// // }

// // export default function GameArena({ gameState, playerAddress, onExit, onMove }: GameArenaProps) {
// //   const { toast } = useToast()
// //   const [selectedCard, setSelectedCard] = useState<number | null>(null)
// //   const [attackType, setAttackType] = useState<"normal" | "special">("normal")
// //   const [isAttacking, setIsAttacking] = useState(false)
// //   const [showAnimation, setShowAnimation] = useState(false)
// //   const [animationProps, setAnimationProps] = useState({
// //     type: "normal" as "normal" | "special",
// //     sourcePosition: { x: 0, y: 0 },
// //     targetPosition: { x: 0, y: 0 },
// //   })
// //   const [turnTimer, setTurnTimer] = useState(30)
  
// //   const playerCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
// //   const opponentCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

// //   // Get player and opponent cards
// //   const getPlayerCards = (): CardType[] => {
// //     if (!gameState) return generateCardPool()
// //     return gameState.players[playerAddress]?.cards || generateCardPool()
// //   }

// //   const getOpponentCards = (): CardType[] => {
// //     if (!gameState) return generateCardPool()
// //     const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress)
// //     if (!opponentAddress) return generateCardPool()
// //     return gameState.players[opponentAddress]?.cards || generateCardPool()
// //   }

// //   const playerCards = getPlayerCards()
// //   const opponentCards = getOpponentCards()

// //   // Reset timer when turn changes
// //   useEffect(() => {
// //     if (!gameState) return
// //     setTurnTimer(30)
    
// //     const timer = setInterval(() => {
// //       setTurnTimer(prev => {
// //         if (prev <= 0) return 0
// //         return prev - 1
// //       })
// //     }, 1000)

// //     return () => clearInterval(timer)
// //   }, [gameState?.currentTurn])

// //   // Handle card selection
// //   const handleCardSelect = (index: number) => {
// //     if (!gameState) return
// //     if (!isPlayerTurn(gameState, playerAddress)) {
// //       toast({
// //         title: "Not your turn",
// //         description: "Please wait for your opponent's move",
// //         variant: "destructive",
// //       })
// //       return
// //     }
    
// //     const card = playerCards[index]
// //     if (!canSelectCard(gameState, playerAddress, card)) {
// //       if (card.cooldown > 0) {
// //         toast({
// //           title: "Card on cooldown",
// //           description: `This card is on cooldown for ${card.cooldown} more seconds`,
// //           variant: "destructive",
// //         })
// //       } else if (card.defeated) {
// //         toast({
// //           title: "Card defeated",
// //           description: "This card has been defeated and cannot be used",
// //           variant: "destructive",
// //         })
// //       }
// //       return
// //     }

// //     setSelectedCard(index)
// //     setAttackType(card.usageCount >= 2 ? "special" : "normal")
// //   }

// //   // Handle attack
// //   const handleAttack = async (targetIndex: number) => {
// //     if (selectedCard === null || isAttacking || !gameState) return
    
// //     const targetCard = opponentCards[targetIndex]
// //     if (!canAttackCard(gameState, playerAddress, targetCard)) {
// //       toast({
// //         title: "Invalid target",
// //         description: "This card cannot be targeted",
// //         variant: "destructive",
// //       })
// //       return
// //     }

// //     // Get positions for animation
// //     const sourceElement = playerCardRefs.current[selectedCard]
// //     const targetElement = opponentCardRefs.current[targetIndex]

// //     if (sourceElement && targetElement) {
// //       const sourceRect = sourceElement.getBoundingClientRect()
// //       const targetRect = targetElement.getBoundingClientRect()

// //       setAnimationProps({
// //         type: attackType,
// //         sourcePosition: {
// //           x: sourceRect.left + sourceRect.width / 2,
// //           y: sourceRect.top + sourceRect.height / 2,
// //         },
// //         targetPosition: {
// //           x: targetRect.left + targetRect.width / 2,
// //           y: targetRect.top + targetRect.height / 2,
// //         },
// //       })

// //       setShowAnimation(true)
// //     }

// //     setIsAttacking(true)

// //     try {
// //       // Create the move
// //       const move = createMove(
// //         playerAddress,
// //         selectedCard,
// //         targetIndex,
// //         attackType,
// //         playerCards[selectedCard],
// //         opponentCards[targetIndex]
// //       )

// //       // Send the move to the parent component
// //       const success = await onMove(move)
      
// //       if (!success) {
// //         throw new Error("Failed to process move")
// //       }

// //       // Play sound effect
// //       const audio = new Audio(attackType === "normal" ? "/sounds/attack.mp3" : "/sounds/special.mp3")
// //       audio.volume = 0.5
// //       audio.play().catch(e => console.error("Failed to play sound effect:", e))
      
// //     } catch (error) {
// //       console.error("Error processing attack:", error)
// //       toast({
// //         title: "Attack failed",
// //         description: "Failed to process attack. Please try again.",
// //         variant: "destructive",
// //       })
// //     } finally {
// //       setIsAttacking(false)
// //       setSelectedCard(null)
// //     }
// //   }

// //   // Handle animation completion
// //   const handleAnimationComplete = () => {
// //     setShowAnimation(false)
// //   }

// //   if (!gameState) {
// //     return (
// //       <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
// //           <h2 className="text-xl font-semibold text-white">Loading Arena...</h2>
// //           <p className="text-gray-400">Connecting to the AO process</p>
// //         </div>
// //       </div>
// //     )
// //   }

// //   const isPlayerTurnNow = isPlayerTurn(gameState, playerAddress)
// //   const isGameOver = gameState.status === "completed"
// //   const isWinner = gameState.winner === playerAddress

// //   return (
// //     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-4">
// //       {/* Game over modal */}
// //       {isGameOver && (
// //         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
// //           <Card className="w-full max-w-md bg-gray-800 border-gray-700">
// //             <CardContent className="p-8 text-center">
// //               <div className="mb-6">
// //                 {isWinner ? (
// //                   <Trophy className="h-16 w-16 text-amber-500 mx-auto" />
// //                 ) : (
// //                   <Shield className="h-16 w-16 text-red-500 mx-auto" />
// //                 )}
// //               </div>
// //               <h2 className="text-3xl font-bold mb-4">{isWinner ? "Victory!" : "Defeat!"}</h2>
// //               <p className="text-gray-300 mb-6">
// //                 {isWinner ? `You've won ${gameState.wager} AR tokens!` : "Better luck next time."}
// //               </p>
// //               <Button onClick={onExit} className="w-full bg-cyan-600 hover:bg-cyan-700">
// //                 Return to Home
// //               </Button>
// //             </CardContent>
// //           </Card>
// //         </div>
// //       )}

// //       <div className="container mx-auto max-w-6xl">
// //         <div className="flex justify-between items-center mb-6">
// //           <Button variant="outline" onClick={onExit} className="text-gray-300">
// //             <ArrowLeft className="h-4 w-4 mr-2" /> Exit Arena
// //           </Button>
// //           <h1 className="text-2xl font-bold text-cyan-400">ChronoClash Arena</h1>
// //           <div className="flex items-center gap-2 text-gray-300">
// //             <Clock className="h-4 w-4" />
// //             <span>{turnTimer}s</span>
// //           </div>
// //         </div>

// //         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
// //           <div className="lg:col-span-2">
// //             <div className="space-y-8">
// //               {/* Opponent Cards */}
// //               <div className="bg-gray-800/50 p-4 rounded-lg">
// //                 <h2 className="text-lg font-semibold mb-4 text-gray-300">Opponent</h2>
// //                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //                   {opponentCards.map((card, index) => (
// //                     <div key={index} ref={(el) => (opponentCardRefs.current[index] = el)}>
// //                       <EnhancedCardComponent
// //                         card={card}
// //                         isPlayerCard={false}
// //                         isSelectable={false}
// //                         isSelected={false}
// //                         isTarget={isPlayerTurnNow && selectedCard !== null && !card.defeated}
// //                         onAttack={() => handleAttack(index)}
// //                       />
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Player Cards */}
// //               <div className="bg-gray-800/50 p-4 rounded-lg">
// //                 <h2 className="text-lg font-semibold mb-4 text-gray-300">Your Cards</h2>
// //                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
// //                   {playerCards.map((card, index) => (
// //                     <div key={index} ref={(el) => (playerCardRefs.current[index] = el)}>
// //                       <EnhancedCardComponent
// //                         card={card}
// //                         isPlayerCard={true}
// //                         isSelectable={isPlayerTurnNow && !card.defeated && card.cooldown === 0}
// //                         isSelected={selectedCard === index}
// //                         onSelect={() => handleCardSelect(index)}
// //                       />
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Attack Controls */}
// //               {isPlayerTurnNow && selectedCard !== null && (
// //                 <div className="bg-gray-800 p-4 rounded-lg">
// //                   <h2 className="text-lg font-semibold mb-4 text-cyan-400">Attack Controls</h2>
// //                   <Tabs
// //                     defaultValue={attackType}
// //                     onValueChange={(value) => setAttackType(value as "normal" | "special")}
// //                   >
// //                     <TabsList className="w-full">
// //                       <TabsTrigger value="normal" className="w-1/2">
// //                         <Sword className="h-4 w-4 mr-2" /> Normal Attack
// //                       </TabsTrigger>
// //                       <TabsTrigger
// //                         value="special"
// //                         disabled={playerCards[selectedCard].usageCount < 2}
// //                         className="w-1/2"
// //                       >
// //                         <Sword className="h-4 w-4 mr-2 text-amber-500" /> Special Attack
// //                       </TabsTrigger>
// //                     </TabsList>
// //                     <TabsContent value="normal" className="mt-4">
// //                       <p className="text-sm text-gray-300 mb-2">
// //                         Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s normal attack.
// //                       </p>
// //                       <div className="flex items-center gap-2">
// //                         <Sword className="h-5 w-5" />
// //                         <span>Damage: {playerCards[selectedCard]?.attackPower}</span>
// //                       </div>
// //                     </TabsContent>
// //                     <TabsContent value="special" className="mt-4">
// //                       <p className="text-sm text-gray-300 mb-2">
// //                         Select an opponent's card to attack with {playerCards[selectedCard]?.name}'s special attack.
// //                       </p>
// //                       <div className="flex items-center gap-2">
// //                         <Sword className="h-5 w-5 text-amber-500" />
// //                         <span>Damage: {playerCards[selectedCard]?.specialAttackPower}</span>
// //                       </div>
// //                     </TabsContent>
// //                   </Tabs>
// //                 </div>
// //               )}
// //             </div>
// //           </div>

// //           {/* Game HUD */}
// //           <div>
// //             <ArenaHUD gameState={gameState} playerAddress={playerAddress} />
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }