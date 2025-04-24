import type { Card, CardType } from "./types"

// Card cooldown times in seconds
export const CARD_COOLDOWNS: Record<string, number> = {
  "Temporal Knight": 3,
  "Rift Assassin": 2,
  "Future Seer": 4,
  "Ancient Guardian": 5,
}

// Generate card pool based on the Lua script's card data
export const generateCardPool = (): Card[] => {
  return [
    {
      id: 1,
      name: "Time Knight",
      type: "Chrono",
      hp: 50,
      maxHp: 50,
      attackPower: 10,
      specialAttackPower: 20,
      usageCount: 0,
      cooldown: 0,
      maxCooldown: CARD_COOLDOWNS["Temporal Knight"],
      defeated: false,
      image: "/images/knight.jpeg",
      description:
        "A steadfast guardian of the timeline, wielding a chrono-blade that cuts through temporal distortions.",
    },
    {
      id: 2,
      name: "Rift Sorcerer",
      type: "Rift",
      hp: 40,
      maxHp: 40,
      attackPower: 8,
      specialAttackPower: 15,
      usageCount: 0,
      cooldown: 0,
      maxCooldown: CARD_COOLDOWNS["Rift Assassin"],
      defeated: false,
      image: "/images/assassin.jpeg",
      description: "A swift striker who moves between timeline fractures, appearing where least expected.",
    },
    {
      id: 3,
      name: "Future Sage",
      type: "Future",
      hp: 45,
      maxHp: 45,
      attackPower: 7,
      specialAttackPower: 12,
      usageCount: 0,
      cooldown: 0,
      maxCooldown: CARD_COOLDOWNS["Future Seer"],
      defeated: false,
      image: "/images/future.jpeg",
      description: "A mysterious entity who glimpses possible futures to anticipate and counter enemy moves.",
    },
    {
      id: 4,
      name: "Past Healer",
      type: "Past",
      hp: 60,
      maxHp: 60,
      attackPower: 5,
      specialAttackPower: 10,
      usageCount: 0,
      cooldown: 0,
      maxCooldown: CARD_COOLDOWNS["Ancient Guardian"],
      defeated: false,
      image: "/images/guardian.jpeg",
      description:
        "A powerful defender who draws strength from historical echoes, bolstering allies with forgotten knowledge.",
    },
  ]
}

export const calculateDamage = (attackingCard: Card, defendingCard: Card, attackType: "normal" | "special"): number => {
  let baseDamage = attackType === "normal" ? attackingCard.attackPower : attackingCard.specialAttackPower

  // Type advantages (matching the Lua script logic)
  if (
    (attackingCard.type === "Future" && defendingCard.type === "Past") ||
    (attackingCard.type === "Chrono" && defendingCard.type === "Rift")
  ) {
    baseDamage = Math.floor(baseDamage * 1.2)
  }

  return Math.floor(baseDamage)
}

export const getTypeColor = (type: CardType): string => {
  const colors: Record<CardType, string> = {
    Chrono: "cyan",
    Rift: "purple",
    Future: "emerald",
    Past: "amber",
  }

  return colors[type] || "gray"
}
