// components/game/game-arena.tsx - Fix for the "Cannot read properties of undefined" error
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EnhancedCardComponent } from "@/components/game/card-component"
import { BattleCardDisplay } from "@/components/game/battle-card-display"
import { BattleArenaHUD } from "@/components/game/arena-hud"
import { BattleAttackAnimation } from "@/components/game/battle-attack-animation"
import { BattleVictoryScreen } from "@/components/game/battle-victory-screen"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { 
  Sword, 
  Shield, 
  ArrowLeft, 
  Trophy, 
  Clock, 
  Volume2, 
  VolumeX,
  AlertTriangle,
  WifiOff,
  X,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateCardPool, calculateDamage } from "@/lib/cards"
import { cn } from "@/lib/utils"
import { 
  applyMove, 
  createMove, 
  isPlayerTurn, 
  canSelectCard, 
  canAttackCard,
  formatTime
} from "@/lib/game-utils"
import { enhancedAoClient } from "@/lib/ao-client-enhanced"
import { arweaveWallet } from "@/lib/wallet"
import type { GameState, Card as CardType, Move, BattleAnimation } from "@/lib/types"

interface BattleArenaProps {
  gameState: GameState | null
  playerAddress: string
  onExit: () => void
  onMove: (move: Move) => Promise<boolean>
  isOffline?: boolean
  isReconnecting?: boolean
  onRetryConnection?: () => void
}

export default function BattleArena({ 
  gameState, 
  playerAddress, 
  onExit, 
  onMove,
  isOffline = false,
  isReconnecting = false,
  onRetryConnection
}: BattleArenaProps) {
  const { toast } = useToast()
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [attackType, setAttackType] = useState<"normal" | "special">("normal")
  const [isAttacking, setIsAttacking] = useState(false)
  const [animation, setAnimation] = useState<BattleAnimation | null>(null)
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  const [turnTimer, setTurnTimer] = useState(30)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showTargetHelp, setShowTargetHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  
  const playerCardsRef = useRef<HTMLDivElement>(null)
  const opponentCardsRef = useRef<HTMLDivElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const battleAudio = useRef<HTMLAudioElement | null>(null)
  
  // Check mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])
  
  // Set up battle music
  useEffect(() => {
    if (typeof window !== 'undefined') {
      battleAudio.current = new Audio('/sounds/battle-music.mp3')
      battleAudio.current.loop = true
      battleAudio.current.volume = 0.3
      
      if (soundEnabled) {
        battleAudio.current.play().catch(e => console.log("Couldn't play battle music", e))
      }
    }
    
    return () => {
      if (battleAudio.current) {
        battleAudio.current.pause()
        battleAudio.current = null
      }
    }
  }, [soundEnabled])
  
  // Toggle sound effects
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
    
    if (battleAudio.current) {
      if (soundEnabled) {
        battleAudio.current.pause()
      } else {
        battleAudio.current.play().catch(e => console.log("Couldn't play battle music", e))
      }
    }
  }

  // Get player and opponent cards - Fixed to handle undefined players safely
  const getPlayerCards = (): CardType[] => {
    if (!gameState || !gameState.players) return generateCardPool()
    
    // Make sure the player exists in the game state
    if (!gameState.players[playerAddress] || !gameState.players[playerAddress].cards) {
      // If player doesn't exist or doesn't have cards, return generated cards
      return generateCardPool()
    }
    
    return gameState.players[playerAddress].cards || generateCardPool()
  }

  const getOpponentCards = (): CardType[] => {
    if (!gameState || !gameState.players) return generateCardPool()
    
    const opponentAddress = Object.keys(gameState.players).find(addr => addr !== playerAddress)
    if (!opponentAddress || !gameState.players[opponentAddress] || !gameState.players[opponentAddress].cards) {
      return generateCardPool()
    }
    
    return gameState.players[opponentAddress].cards || generateCardPool()
  }
  
  const getOpponentAddress = (): string | null => {
    if (!gameState || !gameState.players) return null
    return Object.keys(gameState.players).find(addr => addr !== playerAddress) || null
  }

  // Get cards safely
  const playerCards = getPlayerCards()
  const opponentCards = getOpponentCards()
  const opponentAddress = getOpponentAddress()

  // Reset timer when turn changes
  useEffect(() => {
    if (!gameState) return
    
    const timeLimit = gameState.turnTimeLimit || 30
    setTurnTimer(timeLimit)
    
    const timer = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 0) return 0
        return prev - 1
      })
    }, 1000)
    
    // Play turn sound if it's the player's turn
    if (isPlayerTurn(gameState, playerAddress) && soundEnabled) {
      const audio = new Audio('/sounds/your-turn.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log("Couldn't play turn sound", e))
    }

    return () => clearInterval(timer)
  }, [gameState?.currentTurn, gameState?.turnTimeLimit, playerAddress, soundEnabled])
  
  // Set hint message based on game state
  useEffect(() => {
    if (!gameState) return
    
    if (isPlayerTurn(gameState, playerAddress)) {
      if (selectedCard === null) {
        setHintMessage("Select one of your cards to attack")
      } else {
        setHintMessage("Now choose an opponent's card to attack")
      }
    } else {
      setHintMessage("Waiting for opponent's move...")
    }
  }, [gameState, playerAddress, selectedCard])

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
        
        // Play error sound
        if (soundEnabled) {
          const audio = new Audio('/sounds/error.mp3')
          audio.volume = 0.3
          audio.play().catch(e => console.log("Couldn't play sound", e))
        }
      } else if (card.defeated) {
        toast({
          title: "Card defeated",
          description: "This card has been defeated and cannot be used",
          variant: "destructive",
        })
        
        // Play error sound
        if (soundEnabled) {
          const audio = new Audio('/sounds/error.mp3')
          audio.volume = 0.3
          audio.play().catch(e => console.log("Couldn't play sound", e))
        }
      }
      return
    }

    // Play card select sound
    if (soundEnabled) {
      const audio = new Audio('/sounds/card-select.mp3')
      audio.volume = 0.4
      audio.play().catch(e => console.log("Couldn't play sound", e))
    }
    
    setSelectedCard(index)
    setAttackType(card.usageCount >= 2 ? "special" : "normal")
    
    // Show target help on mobile
    if (isMobile) {
      setShowTargetHelp(true)
      setTimeout(() => setShowTargetHelp(false), 3000)
    }
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
      
      // Play error sound
      if (soundEnabled) {
        const audio = new Audio('/sounds/error.mp3')
        audio.volume = 0.3
        audio.play().catch(e => console.log("Couldn't play sound", e))
      }
      
      return
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
      
      // Get card positions for animation
      if (playerCardsRef.current && opponentCardsRef.current) {
        // Calculate card positions
        const playerCardElements = playerCardsRef.current.querySelectorAll('.battle-card')
        const opponentCardElements = opponentCardsRef.current.querySelectorAll('.battle-card')
        
        if (playerCardElements[selectedCard] && opponentCardElements[targetIndex]) {
          const playerRect = playerCardElements[selectedCard].getBoundingClientRect()
          const opponentRect = opponentCardElements[targetIndex].getBoundingClientRect()
          const arenaRect = arenaRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
          
          // Set up animation data
          setAnimation({
            type: attackType === 'special' ? 'special' : 'attack',
            source: {
              player: playerAddress,
              cardIndex: selectedCard,
              position: { 
                x: playerRect.left + playerRect.width / 2 - arenaRect.left, 
                y: playerRect.top + playerRect.height / 2 - arenaRect.top 
              }
            },
            target: {
              player: opponentAddress || '',
              cardIndex: targetIndex,
              position: { 
                x: opponentRect.left + opponentRect.width / 2 - arenaRect.left, 
                y: opponentRect.top + opponentRect.height / 2 - arenaRect.top 
              }
            },
            damage: move.damage,
            duration: attackType === 'special' ? 2000 : 1200
          })
          
          setCurrentAnimation('attack')
          
          // Play attack sound
          if (soundEnabled) {
            const audio = new Audio(attackType === 'special' ? '/sounds/special-attack.mp3' : '/sounds/attack.mp3')
            audio.volume = 0.5
            audio.play().catch(e => console.log("Couldn't play sound", e))
          }
          
          // Wait for animation to complete
          await new Promise(resolve => setTimeout(resolve, attackType === 'special' ? 2000 : 1200))
          
          // Play damage sound
          if (soundEnabled) {
            const audio = new Audio('/sounds/damage.mp3')
            audio.volume = 0.4
            audio.play().catch(e => console.log("Couldn't play sound", e))
          }
          
          // Show damage animation
          setCurrentAnimation('damage')
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      }
      
      // Reset animation
      setAnimation(null)
      setCurrentAnimation(null)

      // Send move to server
      const success = await onMove(move)
      
      if (!success) {
        throw new Error("Failed to process move")
      }
      
      // Check if card defeated
      const damage = move.damage
      const targetHP = opponentCards[targetIndex].hp
      
      if (targetHP - damage <= 0) {
        // Card defeated animation and sound
        if (soundEnabled) {
          const audio = new Audio('/sounds/card-defeated.mp3')
          audio.volume = 0.5
          audio.play().catch(e => console.log("Couldn't play sound", e))
        }
        
        toast({
          title: "Card Defeated!",
          description: `You defeated the opponent's ${opponentCards[targetIndex].name}!`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error processing attack:", error)
      toast({
        title: "Attack failed",
        description: "Failed to process your move. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAttacking(false)
      setSelectedCard(null)
      setShowTargetHelp(false)
    }
  }

  // Handle attack type change
  const handleAttackTypeChange = (type: string) => {
    setAttackType(type as "normal" | "special")
    
    // Play selection sound
    if (soundEnabled) {
      const audio = new Audio('/sounds/menu-select.mp3')
      audio.volume = 0.3
      audio.play().catch(e => console.log("Couldn't play sound", e))
    }
  }
  
  // Confirm exit
  const confirmExit = () => {
    setShowExitConfirm(true)
  }
  
  const handleExitConfirm = () => {
    setShowExitConfirm(false)
    onExit()
  }

  // Check game state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Loading Battle Arena...</h2>
          <p className="text-gray-400">Connecting to the AO process</p>
        </div>
      </div>
    )
  }

  const isPlayerTurnNow = isPlayerTurn(gameState, playerAddress)
  const isGameOver = gameState.status === "completed"
  const isWinner = gameState.winner === playerAddress

  return (
    <div 
      ref={arenaRef}
      className="min-h-screen bg-[url('/images/battle-background.jpg')] bg-cover bg-center relative overflow-hidden"
    >
      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/25"></div>
      
      {/* Sound toggle and connection status */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSound}
          className="bg-gray-800/60 text-white hover:bg-gray-700/80"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Offline indicator */}
      {isOffline && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-red-900/90 text-white px-4 py-2 rounded-md animate-pulse">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">
            {isReconnecting ? "Reconnecting..." : "Offline Mode"}
          </span>
          {!isReconnecting && onRetryConnection && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRetryConnection}
              className="ml-2 h-7 text-xs bg-red-800 hover:bg-red-700"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Game over modal */}
      {isGameOver && (
        <BattleVictoryScreen 
          isWinner={isWinner} 
          wager={gameState.wager} 
          onExit={onExit}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Main battle content */}
      <div className="container mx-auto h-screen flex flex-col pt-4 pb-4 relative z-10">
        <div className="flex justify-between items-center mb-4 px-4">
          <Button variant="ghost" onClick={confirmExit} className="text-white bg-gray-900/60 hover:bg-gray-800/80">
            <ArrowLeft className="h-4 w-4 mr-2" /> Exit Battle
          </Button>
          <h1 className="text-2xl font-bold text-white text-shadow-md">ChronoClash Arena</h1>
          <div className="flex items-center gap-2 text-white bg-gray-900/60 px-3 py-1.5 rounded-md">
            <Clock className="h-4 w-4" />
            <span className={cn(
              "font-mono", 
              turnTimer < 10 ? "text-red-400" : "text-white"
            )}>{turnTimer}s</span>
          </div>
        </div>

        {/* Battle arena layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          {/* Main battle area */}
          <div className="lg:col-span-2 flex flex-col justify-between h-full relative">
            {/* Status hint */}
            {hintMessage && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30 bg-gray-900/70 text-white px-4 py-2 rounded-md text-sm animate-fadeIn">
                {hintMessage}
              </div>
            )}
            
            {/* Animation layer */}
            {animation && currentAnimation && (
              <div className="absolute inset-0 pointer-events-none z-40">
                <BattleAttackAnimation 
                  animation={animation}
                  animationType={currentAnimation}
                />
              </div>
            )}
            
            {/* Target help popup */}
            {showTargetHelp && (
              <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-gray-900/80 text-white px-4 py-3 rounded-md text-sm animate-bounce">
                <p className="flex items-center">
                  <span className="mr-2">↑</span>
                  Tap an opponent's card to attack it
                </p>
              </div>
            )}
            
            {/* Opponent cards */}
            <div 
              ref={opponentCardsRef}
              className="bg-gradient-to-b from-gray-900/40 to-transparent p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-amber-500 flex items-center justify-center overflow-hidden">
                    <img src="/images/opponent-avatar.png" alt="Opponent" className="w-full h-full object-cover" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold text-white text-lg">Opponent</h3>
                    <div className="text-xs text-gray-300">
                      {opponentAddress ? (
                        <span>{opponentAddress.substring(0, 6)}...{opponentAddress.substring(opponentAddress.length - 4)}</span>
                      ) : "Waiting..."}
                    </div>
                  </div>
                </div>
                {!isPlayerTurnNow && (
                  <div className="bg-red-500/70 text-white text-sm px-3 py-1 rounded-full animate-pulse">
                    Making a move...
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {opponentCards.map((card, index) => (
                  <div key={index} className="battle-card">
                    <BattleCardDisplay
                      card={card}
                      position="opponent"
                      isTargetable={isPlayerTurnNow && selectedCard !== null && !card.defeated}
                      isSelected={false}
                      onSelect={() => handleAttack(index)}
                      isAnimating={currentAnimation === 'damage' && animation?.target?.cardIndex === index}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Battle field (middle area) */}
            <div className="flex-grow flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
                <div className="text-white text-4xl font-bold">VS</div>
              </div>
            </div>
            
            {/* Player cards */}
            <div 
              ref={playerCardsRef}
              className="bg-gradient-to-t from-gray-900/40 to-transparent p-4 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-cyan-500 flex items-center justify-center overflow-hidden">
                    <img src="/images/player-avatar.png" alt="You" className="w-full h-full object-cover" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold text-white text-lg">You</h3>
                    <div className="text-xs text-gray-300">
                      {playerAddress.substring(0, 6)}...{playerAddress.substring(playerAddress.length - 4)}
                    </div>
                  </div>
                </div>
                {isPlayerTurnNow && (
                  <div className="bg-cyan-500/70 text-white text-sm px-3 py-1 rounded-full animate-pulse">
                    Your Turn
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {playerCards.map((card, index) => (
                  <div key={index} className="battle-card">
                    <BattleCardDisplay
                      card={card}
                      position="player"
                      isTargetable={false}
                      isSelected={selectedCard === index}
                      isSelectable={isPlayerTurnNow && !card.defeated && card.cooldown === 0}
                      onSelect={() => handleCardSelect(index)}
                      isAnimating={currentAnimation === 'attack' && animation?.source?.cardIndex === index}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Attack controls */}
            {isPlayerTurnNow && selectedCard !== null && (
              <div className="absolute bottom-24 right-4 z-30">
                <Card className="bg-gray-900/80 border-gray-700 w-64">
                  <div className="p-3">
                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Attack Type</h3>
                    <Tabs
                      defaultValue={attackType}
                      onValueChange={handleAttackTypeChange}
                    >
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="normal" className="data-[state=active]:bg-blue-600">
                          <Sword className="h-4 w-4 mr-2" /> Normal
                        </TabsTrigger>
                        <TabsTrigger 
                          value="special" 
                          disabled={
                            selectedCard === null || 
                            playerCards[selectedCard].usageCount < 2
                          }
                          className="data-[state=active]:bg-amber-600"
                        >
                          <Sword className="h-4 w-4 mr-2 text-amber-500" /> Special
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-2 flex items-center justify-between text-sm px-1">
                        <span className="text-gray-300">Damage:</span>
                        <span className="text-white font-semibold">
                          {selectedCard !== null && (
                            attackType === "normal" 
                              ? playerCards[selectedCard].attackPower 
                              : playerCards[selectedCard].specialAttackPower
                          )}
                        </span>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setSelectedCard(null)}
                        className="mt-2 text-xs w-full text-gray-400 hover:text-white"
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel Selection
                      </Button>
                    </Tabs>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* HUD and battle info */}
          <div className="h-full">
            <BattleArenaHUD 
              gameState={gameState} 
              playerAddress={playerAddress}
              selectedCard={selectedCard !== null ? playerCards[selectedCard] : null}
              attackType={attackType}
            />
          </div>
        </div>
      </div>
      
      {/* Exit confirmation dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Battle?</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit the battle? The game will continue in the background.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExitConfirm}>
              Exit Battle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}












