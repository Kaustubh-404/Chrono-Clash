"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sword, Shield, Clock } from "lucide-react"
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
  showDetails?: boolean
}

export function EnhancedCardComponent({
  card,
  isPlayerCard,
  isSelectable,
  isSelected,
  onSelect,
  onAttack,
  isTarget = false,
  showDetails = true,
}: CardComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [cooldownText, setCooldownText] = useState<string>("")
  const typeColor = getTypeColor(card.type)

  useEffect(() => {
    // Update cooldown text
    if (card.cooldown > 0) {
      setCooldownText(`${card.cooldown}s`)
    } else {
      setCooldownText("")
    }
  }, [card.cooldown])

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
  const healthPercentage = (card.hp / card.maxHp) * 100
  const isLowHealth = healthPercentage < 30

  // Determine progress bar colors
  const progressBgClass = isLowHealth ? "bg-red-900" : "bg-gray-700"
  const indicatorBgClass = isLowHealth ? "bg-red-500" : `bg-${typeColor}-500`

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              "overflow-hidden transition-all duration-200 relative group",
              isSelectable && card.cooldown === 0 ? "cursor-pointer hover:scale-105" : "",
              isSelected ? "ring-2 ring-cyan-500 scale-105" : "",
              isTarget ? "cursor-pointer hover:ring-2 hover:ring-red-500" : "",
              card.defeated ? "opacity-50 grayscale" : "",
              isAnimating ? "animate-shake" : "",
            )}
            onClick={handleClick}
          >
            {/* Cooldown overlay */}
            {card.cooldown > 0 && (
              <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
                <Clock className="h-6 w-6 text-white mb-1" />
                <div className="text-2xl font-bold text-white">{cooldownText}</div>
                <div className="text-xs text-white/80">Cooldown</div>
              </div>
            )}

            {/* Defeated overlay */}
            {card.defeated && (
              <div className="absolute inset-0 bg-red-900/30 z-5 flex items-center justify-center">
                <div className="text-xl font-bold text-red-200 rotate-45">DEFEATED</div>
              </div>
            )}

            {/* Card image */}
            <div className="relative h-40 w-full">
              <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" />

              {/* Card type badge */}
              <div className="absolute top-2 right-2">
                <Badge className={`bg-${typeColor}-600`}>{card.type}</Badge>
              </div>

              {/* Special attack badge */}
              {specialAttackReady && isPlayerCard && (
                <div className="absolute bottom-2 right-2">
                  <Badge className="bg-amber-500 text-black animate-pulse">SPECIAL READY</Badge>
                </div>
              )}

              {/* Stats overlay - shows on hover */}
              {showDetails && (
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center p-3 text-white">
                  <h4 className="font-bold mb-2">{card.name}</h4>
                  <p className="text-xs text-center mb-2">{card.description}</p>
                  <div className="flex justify-between w-full text-xs">
                    <div className="flex items-center">
                      <Sword className="h-3 w-3 mr-1" />
                      <span>{card.attackPower}</span>
                    </div>
                    <div className="flex items-center">
                      <Sword className="h-3 w-3 mr-1 text-amber-400" />
                      <span>{card.specialAttackPower}</span>
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1" />
                      <span>{card.hp}/{card.maxHp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card content */}
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-sm">{card.name}</h3>
                <div className="text-sm font-mono">
                  {card.hp}/{card.maxHp}
                </div>
              </div>

              {/* Health bar */}
              <Progress
                value={healthPercentage}
                className={cn("h-2", progressBgClass)}
                style={{ 
                  // Override the indicator (filled part) color using CSS variables or inline styles if your Progress supports it
                  // If your Progress component accepts a style or custom class for the filled bar, apply here
                }}
              >
                {/* If your Progress component supports children or custom indicator, you can add it here */}
              </Progress>

              {/* Card stats */}
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <div className="flex items-center">
                  <Sword className="h-3 w-3 mr-1" />
                  <span>{card.attackPower}</span>
                </div>
                <div className="flex items-center">
                  <Sword className="h-3 w-3 mr-1 text-amber-400" />
                  <span>{card.specialAttackPower}</span>
                </div>
                <div>Uses: {card.usageCount}/3</div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-2 max-w-xs">
          <div className="flex flex-col">
            <div className="font-bold">{card.name}</div>
            <div className="text-xs mt-1">{card.description}</div>
            {card.cooldown > 0 && (
              <div className="text-xs mt-1 text-red-400">Cooldown: {card.cooldown}s</div>
            )}
            <div className="flex justify-between w-full text-xs mt-2">
              <div>Normal Atk: {card.attackPower}</div>
              <div>Special Atk: {card.specialAttackPower}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}







// "use client"

// import { useState, useEffect } from "react"
// import Image from "next/image"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Progress } from "@/components/ui/progress"
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// import { Sword, Shield, Clock } from "lucide-react"
// import type { Card as CardType } from "@/lib/types"
// import { getTypeColor } from "@/lib/cards"
// import { cn } from "@/lib/utils"

// interface CardComponentProps {
//   card: CardType
//   isPlayerCard: boolean
//   isSelectable: boolean
//   isSelected: boolean
//   onSelect?: () => void
//   onAttack?: () => void
//   isTarget?: boolean
//   showDetails?: boolean
// }

// export function EnhancedCardComponent({
//   card,
//   isPlayerCard,
//   isSelectable,
//   isSelected,
//   onSelect,
//   onAttack,
//   isTarget = false,
//   showDetails = true,
// }: CardComponentProps) {
//   const [isAnimating, setIsAnimating] = useState(false)
//   const [cooldownText, setCooldownText] = useState<string>("")
//   const typeColor = getTypeColor(card.type)

//   useEffect(() => {
//     // Update cooldown text
//     if (card.cooldown > 0) {
//       setCooldownText(`${card.cooldown}s`)
//     } else {
//       setCooldownText("")
//     }
//   }, [card.cooldown])

//   const handleClick = () => {
//     if (card.defeated) return

//     if (isPlayerCard && isSelectable && onSelect && card.cooldown === 0) {
//       onSelect()
//     } else if (!isPlayerCard && isTarget && onAttack) {
//       setIsAnimating(true)
//       onAttack()
//       setTimeout(() => setIsAnimating(false), 500)
//     }
//   }

//   const specialAttackReady = card.usageCount >= 2
//   const healthPercentage = (card.hp / card.maxHp) * 100
//   const isLowHealth = healthPercentage < 30

//   return (
//     <TooltipProvider>
//       <Tooltip delayDuration={300}>
//         <TooltipTrigger asChild>
//           <Card
//             className={cn(
//               "overflow-hidden transition-all duration-200 relative group",
//               isSelectable && card.cooldown === 0 ? "cursor-pointer hover:scale-105" : "",
//               isSelected ? "ring-2 ring-cyan-500 scale-105" : "",
//               isTarget ? "cursor-pointer hover:ring-2 hover:ring-red-500" : "",
//               card.defeated ? "opacity-50 grayscale" : "",
//               isAnimating ? "animate-shake" : "",
//             )}
//             onClick={handleClick}
//           >
//             {/* Cooldown overlay */}
//             {card.cooldown > 0 && (
//               <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center">
//                 <Clock className="h-6 w-6 text-white mb-1" />
//                 <div className="text-2xl font-bold text-white">{cooldownText}</div>
//                 <div className="text-xs text-white/80">Cooldown</div>
//               </div>
//             )}

//             {/* Defeated overlay */}
//             {card.defeated && (
//               <div className="absolute inset-0 bg-red-900/30 z-5 flex items-center justify-center">
//                 <div className="text-xl font-bold text-red-200 rotate-45">DEFEATED</div>
//               </div>
//             )}
            
//             {/* Card image */}
//             <div className="relative h-40 w-full">
//               <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" />
              
//               {/* Card type badge */}
//               <div className="absolute top-2 right-2">
//                 <Badge className={`bg-${typeColor}-600`}>{card.type}</Badge>
//               </div>
              
//               {/* Special attack badge */}
//               {specialAttackReady && isPlayerCard && (
//                 <div className="absolute bottom-2 right-2">
//                   <Badge className="bg-amber-500 text-black animate-pulse">SPECIAL READY</Badge>
//                 </div>
//               )}
              
//               {/* Stats overlay - shows on hover */}
//               {showDetails && (
//                 <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center p-3 text-white">
//                   <h4 className="font-bold mb-2">{card.name}</h4>
//                   <p className="text-xs text-center mb-2">{card.description}</p>
//                   <div className="flex justify-between w-full text-xs">
//                     <div className="flex items-center">
//                       <Sword className="h-3 w-3 mr-1" />
//                       <span>{card.attackPower}</span>
//                     </div>
//                     <div className="flex items-center">
//                       <Sword className="h-3 w-3 mr-1 text-amber-400" />
//                       <span>{card.specialAttackPower}</span>
//                     </div>
//                     <div className="flex items-center">
//                       <Shield className="h-3 w-3 mr-1" />
//                       <span>{card.hp}/{card.maxHp}</span>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Card content */}
//             <CardContent className="p-3">
//               <div className="flex justify-between items-center mb-1">
//                 <h3 className="font-bold text-sm">{card.name}</h3>
//                 <div className="text-sm font-mono">
//                   {card.hp}/{card.maxHp}
//                 </div>
//               </div>

//               {/* Health bar */}
//               <Progress
//                 value={healthPercentage}
//                 className={`h-2 ${isLowHealth ? "bg-red-900" : "bg-gray-700"}`}
//                 // Use the progress component indicator classname prop instead of direct class
//                 indicatorClassName={isLowHealth ? "bg-red-500" : `bg-${typeColor}-500`}
//               />

//               {/* Card stats */}
//               <div className="mt-2 flex justify-between text-xs text-gray-400">
//                 <div className="flex items-center">
//                   <Sword className="h-3 w-3 mr-1" />
//                   <span>{card.attackPower}</span>
//                 </div>
//                 <div className="flex items-center">
//                   <Sword className="h-3 w-3 mr-1 text-amber-400" />
//                   <span>{card.specialAttackPower}</span>
//                 </div>
//                 <div>Uses: {card.usageCount}/3</div>
//               </div>
//             </CardContent>
//           </Card>
//         </TooltipTrigger>
//         <TooltipContent side="top" className="p-2 max-w-xs">
//           <div className="flex flex-col">
//             <div className="font-bold">{card.name}</div>
//             <div className="text-xs mt-1">{card.description}</div>
//             {card.cooldown > 0 && (
//               <div className="text-xs mt-1 text-red-400">Cooldown: {card.cooldown}s</div>
//             )}
//             <div className="flex justify-between w-full text-xs mt-2">
//               <div>Normal Atk: {card.attackPower}</div>
//               <div>Special Atk: {card.specialAttackPower}</div>
//             </div>
//           </div>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   )
// }









// // "use client"

// // import { useState } from "react"
// // import Image from "next/image"
// // import { Card, CardContent } from "@/components/ui/card"
// // import { Badge } from "@/components/ui/badge"
// // import { Progress } from "@/components/ui/progress"
// // import type { Card as CardType } from "@/lib/types"
// // import { getTypeColor } from "@/lib/cards"
// // import { cn } from "@/lib/utils"

// // interface CardComponentProps {
// //   card: CardType
// //   isPlayerCard: boolean
// //   isSelectable: boolean
// //   isSelected: boolean
// //   onSelect?: () => void
// //   onAttack?: () => void
// //   isTarget?: boolean
// // }

// // export function CardComponent({
// //   card,
// //   isPlayerCard,
// //   isSelectable,
// //   isSelected,
// //   onSelect,
// //   onAttack,
// //   isTarget = false,
// // }: CardComponentProps) {
// //   const [isAnimating, setIsAnimating] = useState(false)
// //   const typeColor = getTypeColor(card.type)

// //   const handleClick = () => {
// //     if (card.defeated) return

// //     if (isPlayerCard && isSelectable && onSelect && card.cooldown === 0) {
// //       onSelect()
// //     } else if (!isPlayerCard && isTarget && onAttack) {
// //       setIsAnimating(true)
// //       onAttack()
// //       setTimeout(() => setIsAnimating(false), 500)
// //     }
// //   }

// //   const specialAttackReady = card.usageCount >= 2

// //   return (
// //     <Card
// //       className={cn(
// //         "overflow-hidden transition-all duration-200 relative",
// //         isSelectable && card.cooldown === 0 ? "cursor-pointer hover:scale-105" : "",
// //         isSelected ? "ring-2 ring-cyan-500 scale-105" : "",
// //         isTarget ? "cursor-pointer hover:ring-2 hover:ring-red-500" : "",
// //         card.defeated ? "opacity-50 grayscale" : "",
// //         isAnimating ? "animate-shake" : "",
// //       )}
// //       onClick={handleClick}
// //     >
// //       {card.cooldown > 0 && (
// //         <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
// //           <div className="text-white text-center">
// //             <div className="text-3xl font-bold">{card.cooldown}s</div>
// //             <div className="text-sm">Cooldown</div>
// //           </div>
// //         </div>
// //       )}

// //       <div className="relative h-40 w-full">
// //         <Image src={card.image || "/placeholder.svg"} alt={card.name} fill className="object-cover" />
// //         <div className="absolute top-2 right-2">
// //           <Badge className={`bg-${typeColor}-600`}>{card.type}</Badge>
// //         </div>
// //         {specialAttackReady && isPlayerCard && (
// //           <div className="absolute bottom-2 right-2">
// //             <Badge className="bg-amber-600 animate-pulse">Special Ready</Badge>
// //           </div>
// //         )}
// //       </div>

// //       <CardContent className="p-3">
// //         <div className="flex justify-between items-center mb-1">
// //           <h3 className="font-bold">{card.name}</h3>
// //           <div className="text-sm font-mono">
// //             {card.hp}/{card.maxHp}
// //           </div>
// //         </div>

// //         <Progress
// //           value={(card.hp / card.maxHp) * 100}
// //           className={`h-2 ${card.hp < card.maxHp * 0.3 ? "bg-red-900" : "bg-gray-700"}`}
// //           indicatorClassName={card.hp < card.maxHp * 0.3 ? "bg-red-500" : `bg-${typeColor}-500`}
// //         />

// //         <div className="mt-2 flex justify-between text-xs text-gray-400">
// //           <div>ATK: {card.attackPower}</div>
// //           <div>SP: {card.specialAttackPower}</div>
// //           <div>Uses: {card.usageCount}/3</div>
// //         </div>
// //       </CardContent>
// //     </Card>
// //   )
// // }
