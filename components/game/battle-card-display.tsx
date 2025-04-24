// components/game/battle-card-display.tsx
import { useState, useEffect } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sword, Shield, Clock, Zap } from "lucide-react"
import type { Card as CardType } from "@/lib/types"
import { getTypeColor } from "@/lib/cards"
import { cn } from "@/lib/utils"

interface BattleCardDisplayProps {
  card: CardType
  position: "player" | "opponent"
  isTargetable?: boolean
  isSelectable?: boolean
  isSelected?: boolean
  onSelect?: () => void
  isAnimating?: boolean
}

export function BattleCardDisplay({
  card,
  position,
  isTargetable = false,
  isSelectable = false,
  isSelected = false,
  onSelect,
  isAnimating = false,
}: BattleCardDisplayProps) {
  const [scale, setScale] = useState(1)
  const [shake, setShake] = useState(false)
  const [glow, setGlow] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<string | null>(null)
  const typeColor = getTypeColor(card.type)
  
  // Animation effects
  useEffect(() => {
    if (isAnimating) {
      handleAnimation()
    } else {
      setAnimationPhase(null)
    }
    
    // Handle selection animation
    if (isSelected) {
      setScale(1.05)
      setGlow(true)
    } else {
      setScale(1)
      setGlow(false)
    }
  }, [isAnimating, isSelected])
  
  const handleAnimation = () => {
    // Attack animation sequence
    if (position === "player") {
      // Player attacking
      setAnimationPhase("attack")
      setScale(1.2)
      
      setTimeout(() => {
        setScale(0.9)
        setAnimationPhase(null)
      }, 300)
    } else {
      // Opponent being attacked
      setAnimationPhase("damaged")
      setShake(true)
      
      setTimeout(() => {
        setShake(false)
        setAnimationPhase(null)
      }, 500)
    }
  }
  
  const handleClick = () => {
    if ((isSelectable || isTargetable) && onSelect && !card.defeated) {
      onSelect()
    }
  }
  
  // Card status classes
  const healthPercentage = (card.hp / card.maxHp) * 100
  const isLowHealth = healthPercentage < 30
  
  // Pokemon-style visual overrides based on position
  const cardStyles = {
    player: {
      base: "transform-origin-bottom transform-gpu",
      container: "perspective-800",
      image: "scale-110 origin-bottom",
    },
    opponent: {
      base: "transform-origin-top transform-gpu",
      container: "perspective-800",
      image: "scale-110 origin-top",
    }
  }
  
  // Special attack ready effects
  const specialReady = card.usageCount >= 2 && position === "player" && !card.defeated
  
  // Defeated visual effect
  const isDefeated = card.defeated
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={isTargetable || isSelectable ? 200 : 500}>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "relative transition-all duration-200",
              cardStyles[position].container,
              isTargetable && "cursor-pointer",
              isSelectable && "cursor-pointer"
            )}
          >
            <Card
              className={cn(
                "overflow-hidden transition-all duration-200 relative",
                cardStyles[position].base,
                isSelected && "ring-2 ring-cyan-500",
                isTargetable && "hover:ring-2 hover:ring-red-500",
                isSelectable && !card.defeated && !card.cooldown && "hover:ring-2 hover:ring-cyan-500",
                isDefeated && "opacity-60 grayscale",
                shake && "animate-shake",
                glow && "ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20",
                animationPhase === "attack" && "translate-y-[-10px]",
                animationPhase === "damaged" && "animate-shake"
              )}
              onClick={handleClick}
              style={{ transform: `scale(${scale})` }}
            >
              {/* Cooldown overlay */}
              {card.cooldown > 0 && (
                <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
                  <Clock className="h-6 w-6 text-white mb-1" />
                  <div className="text-2xl font-bold text-white">{card.cooldown}s</div>
                  <div className="text-xs text-white/80">Cooldown</div>
                </div>
              )}

              {/* Defeated overlay */}
              {isDefeated && (
                <div className="absolute inset-0 bg-red-900/30 z-5 flex items-center justify-center">
                  <div className="text-xl font-bold text-red-200 rotate-45">DEFEATED</div>
                </div>
              )}
              
              {/* Pokemon-style lighting effects */}
              {glow && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  <div className={`absolute inset-x-0 ${position === 'player' ? 'bottom-0' : 'top-0'} h-20 bg-gradient-to-t from-cyan-500/30 to-transparent`}></div>
                </div>
              )}
              
              {/* Card targeting indicator */}
              {isTargetable && (
                <div className="absolute inset-0 border-2 border-dashed border-red-500 animate-pulse pointer-events-none z-20"></div>
              )}

              {/* Card image */}
              <div className="relative h-40 w-full overflow-hidden">
                <div className={`absolute inset-0 ${position === 'player' ? 'bg-gradient-to-t' : 'bg-gradient-to-b'} from-black/40 to-transparent z-5`}></div>
                <Image 
                  src={card.image || "/placeholder.svg"} 
                  alt={card.name} 
                  fill 
                  className={cn(
                    "object-cover transition-transform duration-200",
                    cardStyles[position].image
                  )} 
                />

                {/* Card type badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge className={`bg-${typeColor}-600`}>{card.type}</Badge>
                </div>
                
                {/* Special attack ready indicator */}
                {specialReady && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <Badge className="bg-amber-500 text-black animate-pulse flex items-center gap-1">
                      <Zap className="h-3 w-3" /> SPECIAL
                    </Badge>
                  </div>
                )}
              </div>

              {/* Card content - Pokemon style info display */}
              <div className="p-3 bg-gradient-to-b from-gray-800 to-gray-900">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-sm text-white">{card.name}</h3>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-gray-400" />
                    <div className="text-sm font-mono">
                      {card.hp}/{card.maxHp}
                    </div>
                  </div>
                </div>

                {/* Health bar - Pokemon style */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      isLowHealth ? "bg-red-500" : "bg-green-500"
                    )} 
                    style={{ width: `${healthPercentage}%` }}
                  ></div>
                </div>

                {/* Card stats */}
                <div className="mt-2 flex justify-between items-center text-xs text-gray-400">
                  <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded">
                    <Sword className="h-3 w-3" />
                    <span>{card.attackPower}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>{card.specialAttackPower}</span>
                  </div>
                  <div className="bg-gray-800 px-1.5 py-0.5 rounded">
                    {card.usageCount}/3
                  </div>
                </div>
              </div>
              
              {/* Show attack hint if targetable */}
              {isTargetable && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-black/70 text-white text-xs py-1 px-2 rounded flex items-center">
                    <Sword className="h-3 w-3 mr-1" /> Attack
                  </div>
                </div>
              )}
            </Card>
            
            {/* Flash effect for damage */}
            {animationPhase === "damaged" && (
              <div className="absolute inset-0 bg-red-500 animate-flash pointer-events-none z-30"></div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={position === "player" ? "top" : "bottom"} className="p-2 max-w-xs">
          <div className="flex flex-col">
            <div className="font-bold">{card.name}</div>
            <div className="flex items-center text-xs mt-1">
              <Badge variant="outline" className={`bg-${typeColor}-900/30 text-${typeColor}-400 border-${typeColor}-500/50`}>
                {card.type}
              </Badge>
            </div>
            <div className="text-xs mt-2">{card.description}</div>
            {card.cooldown > 0 && (
              <div className="text-xs mt-1 text-red-400 flex items-center">
                <Clock className="h-3 w-3 mr-1" /> Cooldown: {card.cooldown}s
              </div>
            )}
            <div className="flex justify-between w-full text-xs mt-2 pt-2 border-t border-gray-700">
              <div className="flex items-center">
                <Sword className="h-3 w-3 mr-1" /> {card.attackPower}
              </div>
              <div className="flex items-center">
                <Sword className="h-3 w-3 mr-1 text-amber-400" /> {card.specialAttackPower}
              </div>
              <div className="flex items-center">
                <Shield className="h-3 w-3 mr-1" /> {card.hp}/{card.maxHp}
              </div>
            </div>
            {card.usageCount >= 2 && position === "player" && !card.defeated && (
              <div className="text-xs mt-2 text-amber-400">
                Special attack is ready!
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}