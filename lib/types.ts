// lib/types.ts - Updated with enhanced types
// Game Types
export type CardType = "Chrono" | "Rift" | "Future" | "Past"

export interface Card {
  id: number
  name: string
  type: CardType
  hp: number
  maxHp: number
  attackPower: number
  specialAttackPower: number
  usageCount: number
  cooldown: number
  maxCooldown: number
  defeated: boolean
  image: string
  description: string
  // New animation-related properties
  position?: "front" | "back" // Position on the battlefield
  animationState?: "idle" | "attack" | "damaged" | "special" | "defeated"
  effects?: CardEffect[]
}

export interface CardEffect {
  type: "buff" | "debuff" | "status"
  name: string
  duration: number
  value: number
  description: string
}

export interface Player {
  address: string
  cards: Card[]
  ready: boolean
  displayName?: string // Optional display name for the player
  avatar?: string // Optional avatar image URL
}

export interface GameState {
  status: "awaiting_players" | "in_progress" | "completed"
  roomCode: string
  creator: string
  wager: number
  players: Record<string, Player>
  currentTurn: string | null
  moveHistory: Move[]
  winner: string | null
  // New properties
  startTime?: number // When the game started (timestamp)
  lastMoveTime?: number // When the last move was made (timestamp)
  turnTimeLimit?: number // Time limit for each turn in seconds
  environment?: string // Battle environment/background
  matchType?: "casual" | "ranked" // Type of match
}

export interface Move {
  player: string
  cardIndex: number
  targetCardIndex: number
  attackType: "normal" | "special"
  damage: number
  timestamp: number
  // New properties
  effectsApplied?: CardEffect[] // Effects applied by this move
  cardsDefeated?: boolean // Whether this move defeated a card
}

// State update interface for real-time game updates
export interface GameStateUpdate {
  type: "stateUpdate" | "error" | "connection"
  matchId: string
  data?: GameState | null
  error?: string
  timestamp?: number
}

// AO Types
export interface AoMessage {
  Target: string
  Action: string
  Tags?: Record<string, string>
  Data: any
}

export interface AoResponse {
  status: string
  data?: any
  error?: string
  requestId?: string
  simulated?: boolean
}

// Wallet Types
export interface WalletInfo {
  address: string
  balance: number
  network: "testnet" | "mainnet"
}

// Transaction Types
export interface TransactionResult {
  status: "success" | "error" | "pending"
  txId?: string
  error?: string
  timestamp?: number
}

// Room Types
export interface GameRoom {
  roomCode: string
  matchId: string
  creator: string
  wager: number
  createdAt: number
  status: "pending" | "active" | "completed"
  players: string[]
  winner?: string
}

// Matchmaking Types
export interface GameInvite {
  inviteId: string
  from: string
  to?: string
  wager: number
  expiresAt: number
  status: "pending" | "accepted" | "declined" | "expired"
}

// Animation Types
export interface BattleAnimation {
  type: "attack" | "special" | "damage" | "heal" | "defeat" | "victory"
  source?: {
    player: string
    cardIndex: number
    position: {x: number, y: number}
  }
  target?: {
    player: string
    cardIndex: number
    position: {x: number, y: number}
  }
  damage?: number
  effectName?: string
  duration: number
}

// Audio Types
export interface GameSound {
  id: string
  src: string
  volume: number
  loop: boolean
  category: "sfx" | "music" | "ui" | "ambient"
}

// Notification Types
export interface GameNotification {
  id: string
  type: "info" | "success" | "warning" | "error"
  message: string
  details?: string
  timestamp: number
  duration?: number // How long to show the notification (in ms)
  action?: {
    label: string
    handler: () => void
  }
}



// // Game Types
// export type CardType = "Chrono" | "Rift" | "Future" | "Past"



// export interface Card {
//   id: number
//   name: string
//   type: CardType
//   hp: number
//   maxHp: number
//   attackPower: number
//   specialAttackPower: number
//   usageCount: number
//   cooldown: number
//   maxCooldown: number
//   defeated: boolean
//   image: string
//   description: string
// }

// export interface Player {
//   address: string
//   cards: Card[]
//   ready: boolean
// }

// export interface GameState {
//   status: "awaiting_players" | "in_progress" | "completed"
//   roomCode: string
//   creator: string
//   wager: number
//   players: Record<string, Player>
//   currentTurn: string | null
//   moveHistory: Move[]
//   winner: string | null
// }



// export interface Move {
//   player: string
//   cardIndex: number
//   targetCardIndex: number
//   attackType: "normal" | "special"
//   damage: number
//   timestamp: number
// }

// // AO Types
// export interface AoMessage {
//   Target: string
//   Action: string
//   Tags?: Record<string, string>
//   Data: any
// }

// export interface AoResponse {
//   status: string
//   data?: any
//   error?: string
// }

// // Wallet Types
// export interface WalletInfo {
//   address: string
//   balance: number
//   network: "testnet" | "mainnet"
// }
