"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CardComponent } from "@/components/game/card-component"
import { ArenaHUD } from "@/components/game/arena-hud"
import { AttackAnimation } from "@/components/game/attack-animation"
import { Sword, Shield, ArrowLeft, Trophy } from "lucide-react"
import { aoClient } from "@/lib/ao-client"
import { arweaveWallet } from "@/lib/wallet"
import { generateCardPool, calculateDamage } from "@/lib/cards"
import type { GameState, Card as CardType, Move } from "@/lib/types"

interface ArenaPageProps {
  params: {
    matchId: string
  }
}

export default function ArenaPage({ params }: ArenaPageProps) {
  const router = useRouter()
  const { matchId } = params
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerCards, setPlayerCards] = useState<CardType[]>(generateCardPool())
  const [opponentCards, setOpponentCards] = useState<CardType[]>(generateCardPool())
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [attackType, setAttackType] = useState<"normal" | "special">("normal")
  const [isAttacking, setIsAttacking] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationProps, setAnimationProps] = useState({
    type: "normal" as "normal" | "special",
    sourcePosition: { x: 0, y: 0 },
    targetPosition: { x: 0, y: 0 },
  })

  const playerCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])
  const opponentCardRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Simulate player address
  const playerAddress = arweaveWallet.getAddress() || "0x1234...5678"

  // Initialize game state
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await aoClient.getGameState(matchId)
        if (response.status === "success" && response.data) {
          setGameState(response.data)
        }
      } catch (error) {
        console.error("Error fetching game state:", error)
      }
    }

    fetchGameState()

    // Subscribe to game updates
    const unsubscribe = aoClient.subscribeToGameUpdates(matchId, (update) => {
      if (update.type === "stateUpdate") {
        setGameState(update.data)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [matchId])

  // Process cooldowns
  useEffect(() => {
    if (!gameState || gameState.currentTurn !== playerAddress) return

    const interval = setInterval(() => {
      setPlayerCards((cards) =>
        cards.map((card) => ({
          ...card,
          cooldown: Math.max(0, card.cooldown - 1),
        })),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [gameState, playerAddress])

  // Handle card selection
  const handleCardSelect = (index: number) => {
    if (playerCards[index].cooldown > 0) return

    setSelectedCard(index)
    setAttackType(playerCards[index].usageCount >= 2 ? "special" : "normal")
  }

  // Handle attack
  const handleAttack = async (targetIndex: number) => {
    if (selectedCard === null || isAttacking) return

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
      // Calculate damage locally
      const damage = calculateDamage(playerCards[selectedCard], opponentCards[targetIndex], attackType)

      // Update local state immediately for responsive UI
      const updatedPlayerCards = [...playerCards]
      updatedPlayerCards[selectedCard].usageCount += 1
      updatedPlayerCards[selectedCard].cooldown = updatedPlayerCards[selectedCard].maxCooldown
      setPlayerCards(updatedPlayerCards)

      const updatedOpponentCards = [...opponentCards]
      updatedOpponentCards[targetIndex].hp = Math.max(0, updatedOpponentCards[targetIndex].hp - damage)
      if (updatedOpponentCards[targetIndex].hp <= 0) {
        updatedOpponentCards[targetIndex].defeated = true
      }
      setOpponentCards(updatedOpponentCards)

      // Add move to history
      if (gameState) {
        const newMove: Move = {
          player: playerAddress,
          cardIndex: selectedCard,
          targetCardIndex: targetIndex,
          attackType,
          damage,
          timestamp: Date.now(),
        }

        setGameState({
          ...gameState,
          moveHistory: [...gameState.moveHistory, newMove],
          currentTurn: Object.keys(gameState.players).find((addr) => addr !== playerAddress) || null,
        })
      }

      // Send move to AO
      const response = await aoClient.playCard(matchId, selectedCard, targetIndex, attackType)

      if (response.status !== "success") {
        throw new Error(response.error || "Failed to process move")
      }

      // Check for game over
      const allDefeated = updatedOpponentCards.every((card) => card.defeated)
      if (allDefeated && gameState) {
        setGameState({
          ...gameState,
          status: "completed",
          winner: playerAddress,
        })
      }
    } catch (error) {
      console.error("Error processing attack:", error)
      alert("Failed to process attack. Please try again.")
    } finally {
      setIsAttacking(false)
      setSelectedCard(null)
    }
  }

  // Handle animation completion
  const handleAnimationComplete = () => {
    setShowAnimation(false)
  }

  // Exit arena
  const exitArena = () => {
    router.push("/")
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

  const isPlayerTurn = gameState.currentTurn === playerAddress
  const isGameOver = gameState.status === "completed"
  const isWinner = gameState.winner === playerAddress

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 p-4">
      {showAnimation && (
        <AttackAnimation
          type={animationProps.type}
          sourcePosition={animationProps.sourcePosition}
          targetPosition={animationProps.targetPosition}
          onComplete={handleAnimationComplete}
        />
      )}

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
              <Button onClick={exitArena} className="w-full bg-cyan-600 hover:bg-cyan-700">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={exitArena} className="text-gray-300">
            <ArrowLeft className="h-4 w-4 mr-2" /> Exit Arena
          </Button>
          <h1 className="text-2xl font-bold text-cyan-400">ChronoClash Arena</h1>
          <div className="w-28"></div> {/* Spacer for alignment */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Opponent Cards */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-300">Opponent</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {opponentCards.map((card, index) => (
                    <div key={index} ref={(el) => (opponentCardRefs.current[index] = el)}>
                      <CardComponent
                        card={card}
                        isPlayerCard={false}
                        isSelectable={false}
                        isSelected={false}
                        isTarget={isPlayerTurn && selectedCard !== null && !card.defeated}
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
                    <div key={index} ref={(el) => (playerCardRefs.current[index] = el)}>
                      <CardComponent
                        card={card}
                        isPlayerCard={true}
                        isSelectable={isPlayerTurn && !card.defeated}
                        isSelected={selectedCard === index}
                        onSelect={() => handleCardSelect(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Attack Controls */}
              {isPlayerTurn && selectedCard !== null && (
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
