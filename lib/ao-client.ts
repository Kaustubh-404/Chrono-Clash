import type { AoMessage, AoResponse, GameState, Move } from "./types"

export class AoClient {
  private gateway: string
  private processId: string
  private walletAddress: string | null = null

  constructor() {
    this.gateway = process.env.NEXT_PUBLIC_AO_GATEWAY || "https://gateway.ao.xyz"
    this.processId = process.env.NEXT_PUBLIC_AO_PROCESS_ID || ""
  }

  setWalletAddress(address: string) {
    this.walletAddress = address
  }

  async sendMessage(action: string, tags: Record<string, string> = {}): Promise<AoResponse> {
    if (!this.walletAddress) {
      return { status: "error", error: "Wallet not connected" }
    }

    try {
      const message: AoMessage = {
        Target: this.processId,
        Action: action,
        Tags: {
          Address: this.walletAddress,
          ...tags,
        },
        Data: {},
      }

      // In a real implementation, this would use the AO SDK to sign and send the message
      // For now, we'll simulate the response
      console.log("Sending message to AO:", message)

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return { status: "success", data: this.simulateResponse(action, tags) }
    } catch (error) {
      console.error("Error sending message to AO:", error)
      return { status: "error", error: "Failed to send message to AO" }
    }
  }

  // This is a placeholder for simulation purposes
  // In a real implementation, this would be replaced with actual AO SDK calls
  private simulateResponse(action: string, tags: Record<string, string>): any {
    switch (action) {
      case "JoinGame":
        return { success: true, tokens: 10 }

      case "CoordinateRoom":
        // Check if this is a create or join request
        if (tags.WagerAmount) {
          // Create room
          return {
            success: true,
            roomCode: this.generateRoomCode(),
            matchId: `match-${Date.now()}`,
          }
        } else if (tags.RoomCode) {
          // Join room
          return {
            success: true,
            matchId: `match-${Date.now()}`,
            opponent: "0x1234...5678",
          }
        }
        return { success: false, error: "Invalid room coordination request" }

      case "ProcessTurn":
        const damage = Math.floor(Math.random() * 10) + 5
        return {
          success: true,
          damage,
          attackType: tags.MoveType || "Normal",
          cardDefeated: Math.random() > 0.7,
        }

      case "GetMatchState":
        return this.generateMockGameState(tags.MatchID || tags.RoomCode)

      case "GetLeaderboard":
        return {
          success: true,
          leaderboard: [
            { address: "0x1234...5678", wins: 5, tokens: 50 },
            { address: "0x8765...4321", wins: 3, tokens: 30 },
            { address: "0xabcd...efgh", wins: 2, tokens: 20 },
          ],
        }

      default:
        return { success: false, error: "Unknown action" }
    }
  }

  private generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  private generateMockGameState(identifier: string): GameState {
    const moveHistory: Move[] = [
      {
        player: "0x1234...5678",
        cardIndex: 0,
        targetCardIndex: 1,
        attackType: "normal",
        damage: 10,
        timestamp: Date.now() - 60000,
      },
      {
        player: "0x8765...4321",
        cardIndex: 2,
        targetCardIndex: 3,
        attackType: "normal",
        damage: 8,
        timestamp: Date.now() - 30000,
      },
    ]

    return {
      status: "in_progress",
      roomCode: identifier?.startsWith("match-") ? "ABC123" : identifier,
      creator: "0x1234...5678",
      wager: 10,
      players: {
        "0x1234...5678": {
          address: "0x1234...5678",
          cards: [],
          ready: true,
        },
        "0x8765...4321": {
          address: "0x8765...4321",
          cards: [],
          ready: true,
        },
      },
      currentTurn: "0x1234...5678",
      moveHistory,
      winner: null,
    }
  }

  // Real implementation methods (to be implemented with AO SDK)
  async joinGame(): Promise<AoResponse> {
    return this.sendMessage("JoinGame")
  }

  async createGameRoom(wager: number): Promise<AoResponse> {
    return this.sendMessage("CoordinateRoom", { WagerAmount: wager.toString() })
  }

  async joinGameRoom(roomCode: string): Promise<AoResponse> {
    return this.sendMessage("CoordinateRoom", { RoomCode: roomCode })
  }

  async playCard(
    matchId: string,
    cardIndex: number,
    targetCardIndex: number,
    moveType: "normal" | "special",
  ): Promise<AoResponse> {
    return this.sendMessage("ProcessTurn", {
      MatchID: matchId,
      CardIdx: cardIndex.toString(),
      TargetIdx: targetCardIndex.toString(),
      MoveType: moveType === "normal" ? "Normal" : "Special",
    })
  }

  async getGameState(matchId: string): Promise<AoResponse> {
    return this.sendMessage("GetMatchState", { MatchID: matchId })
  }

  async getGameStateByRoomCode(roomCode: string): Promise<AoResponse> {
    return this.sendMessage("GetMatchState", { RoomCode: roomCode })
  }

  async getLeaderboard(): Promise<AoResponse> {
    return this.sendMessage("GetLeaderboard")
  }

  async syncMatchState(matchId: string, moveData: any): Promise<AoResponse> {
    return this.sendMessage("SyncMatchState", {
      MatchID: matchId,
      MoveData: JSON.stringify(moveData),
    })
  }

  async subscribeToGameUpdates(matchId: string, callback: (data: any) => void): Promise<() => void> {
    // In a real implementation, this would use the AO SDK to subscribe to updates
    // For now, we'll simulate updates every 5 seconds
    const interval = setInterval(() => {
      const mockUpdate = {
        type: "stateUpdate",
        matchId,
        data: this.generateMockGameState(matchId),
      }
      callback(mockUpdate)
    }, 5000)

    return () => clearInterval(interval)
  }
}

export const aoClient = new AoClient()
