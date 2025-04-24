"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Card as CardType } from "@/lib/types"
import { getTypeColor } from "@/lib/cards"
import { cn } from "@/lib/utils"

interface CardComponentProps {
  card: CardType
  isPlayerCard: boolean
  isSelectable: boolean
  isSelected: boolean
  onSelect?: () => void
  onAttack?: () => void
  isTarget?: boolean
}

export function CardComponent({
  card,
  isPlayerCard,
  isSelectable,
  isSelected,
  onSelect,
  onAttack,
  isTarget = false,
}: CardComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const typeColor = getTypeColor(card.type)

  const handleClick = () => {
    if (card.defeated) return

    if (isPlayerCard && isSelectable && onSelect && card.cooldown === 0) {
      onSelect()
    } else if (!isPlayerCard && isTarget && onAttack) {
      setIsAnimating(true)
      onAttack()
      setTimeout(() => setIsAnimating(false), 500)
    }
  }

  const specialAttackReady = card.usageCount >= 2

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 relative",
        isSelectable && card.cooldown === 0 ? "cursor-pointer hover:scale-105" : "",
        isSelected ? "ring-2 ring-cyan-500 scale-105" : "",
        isTarget ? "cursor-pointer hover:ring-2 hover:ring-red-500" : "",
        card.defeated ? "opacity-50 grayscale" : "",
        isAnimating ? "animate-shake" : "",
      )}
      onClick={handleClick}
    >
      {card.cooldown > 0 && (
        <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-3xl font-bold">{card.cooldown}s</div>
            <div className="text-sm">Cooldown</div>
          </div>
        </div>
      )}

      <div className="relative h-40 w-full">
        <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" />
        <div className="absolute top-2 right-2">
          <Badge className={`bg-${typeColor}-600`}>{card.type}</Badge>
        </div>
        {specialAttackReady && isPlayerCard && (
          <div className="absolute bottom-2 right-2">
            <Badge className="bg-amber-600 animate-pulse">Special Ready</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold">{card.name}</h3>
          <div className="text-sm font-mono">
            {card.hp}/{card.maxHp}
          </div>
        </div>

        <Progress
          value={(card.hp / card.maxHp) * 100}
          className={`h-2 ${card.hp < card.maxHp * 0.3 ? "bg-red-900" : "bg-gray-700"}`}
          indicatorClassName={card.hp < card.maxHp * 0.3 ? "bg-red-500" : `bg-${typeColor}-500`}
        />

        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <div>ATK: {card.attackPower}</div>
          <div>SP: {card.specialAttackPower}</div>
          <div>Uses: {card.usageCount}/3</div>
        </div>
      </CardContent>
    </Card>
  )
}
