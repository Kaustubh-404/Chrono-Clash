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
}

export interface Player {
  address: string
  cards: Card[]
  ready: boolean
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
}

export interface Move {
  player: string
  cardIndex: number
  targetCardIndex: number
  attackType: "normal" | "special"
  damage: number
  timestamp: number
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
}

// Wallet Types
export interface WalletInfo {
  address: string
  balance: number
  network: "testnet" | "mainnet"
}
