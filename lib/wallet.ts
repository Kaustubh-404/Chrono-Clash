// lib/wallet.ts - Enhanced Wallet Integration
import type { WalletInfo } from "./types"

// Type guard to check if Wander is available
export function isWanderAvailable(): boolean {
  return typeof window !== "undefined" && !!window.wander
}

// Constants for wallet operations
const WALLET_STORAGE_KEYS = {
  ADDRESS: "walletAddress",
  BALANCE: "walletBalance",
  NETWORK: "walletNetwork",
  LAST_CONNECTED: "walletLastConnected"
}

// Winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000

export class ArweaveWallet {
  private connected = false
  private address: string | null = null
  private balance = 0
  private network: "testnet" | "mainnet" = "testnet"
  private connectionListeners: Array<(address: string | null) => void> = []
  private balanceListeners: Array<(balance: number) => void> = []
  private reconnectTimeout: NodeJS.Timeout | null = null
  private lastConnected: number = 0

  constructor() {
    this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
    
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      this.initFromStorage()
      
      // Setup auto reconnect if last connected within 24 hours
      const lastConnected = localStorage.getItem(WALLET_STORAGE_KEYS.LAST_CONNECTED)
      if (lastConnected) {
        this.lastConnected = parseInt(lastConnected, 10)
        const hoursSinceConnected = (Date.now() - this.lastConnected) / (1000 * 60 * 60)
        
        if (hoursSinceConnected < 24) {
          this.setupAutoReconnect()
        }
      }
    }
  }

  private initFromStorage() {
    const storedAddress = localStorage.getItem(WALLET_STORAGE_KEYS.ADDRESS)
    if (storedAddress) {
      this.address = storedAddress
      this.connected = true
      
      const storedBalance = localStorage.getItem(WALLET_STORAGE_KEYS.BALANCE)
      if (storedBalance) {
        this.balance = parseFloat(storedBalance)
      }
      
      const storedNetwork = localStorage.getItem(WALLET_STORAGE_KEYS.NETWORK)
      if (storedNetwork && (storedNetwork === "testnet" || storedNetwork === "mainnet")) {
        this.network = storedNetwork
      }
    }
  }

  private setupAutoReconnect() {
    // Attempt to reconnect every 30 seconds if window is focused
    if (typeof window !== "undefined") {
      const attemptReconnect = async () => {
        if (document.hasFocus() && isWanderAvailable() && !this.connected) {
          try {
            await this.silentReconnect()
          } catch (error) {
            console.error("Silent reconnect failed:", error)
          }
        }
        
        this.reconnectTimeout = setTimeout(attemptReconnect, 30000)
      }
      
      this.reconnectTimeout = setTimeout(attemptReconnect, 5000)
    }
  }
  
  private async silentReconnect(): Promise<boolean> {
    if (!isWanderAvailable() || this.connected) return false
    
    try {
      // Check if Wander session still active
      const address = await window.wander!.getActiveAddress()
      if (address) {
        this.connected = true
        this.address = address
        await this.getBalance()
        this.notifyConnectionListeners()
        return true
      }
    } catch (error) {
      console.log("Silent reconnect failed:", error)
    }
    
    return false
  }

  private notifyConnectionListeners() {
    for (const listener of this.connectionListeners) {
      listener(this.address)
    }
  }

  private notifyBalanceListeners() {
    for (const listener of this.balanceListeners) {
      listener(this.balance)
    }
  }

  addConnectionListener(listener: (address: string | null) => void): () => void {
    this.connectionListeners.push(listener)
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener)
    }
  }

  addBalanceListener(listener: (balance: number) => void): () => void {
    this.balanceListeners.push(listener)
    return () => {
      this.balanceListeners = this.balanceListeners.filter(l => l !== listener)
    }
  }

  async connect(forcePrompt = false): Promise<WalletInfo | null> {
    try {
      // Clear any reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      if (isWanderAvailable()) {
        // Try silent reconnect first if not forcing prompt
        if (!forcePrompt) {
          const reconnected = await this.silentReconnect()
          if (reconnected) {
            return this.getWalletInfo()
          }
        }
        
        // If silent reconnect fails or force prompt, show connect dialog
        console.log("Connecting to Wander wallet...")
        await window.wander!.connect()
        
        this.address = await window.wander!.getActiveAddress()
        if (!this.address) {
          throw new Error("Failed to get wallet address")
        }
        
        localStorage.setItem(WALLET_STORAGE_KEYS.ADDRESS, this.address)
        localStorage.setItem(WALLET_STORAGE_KEYS.NETWORK, this.network)
        this.lastConnected = Date.now()
        localStorage.setItem(WALLET_STORAGE_KEYS.LAST_CONNECTED, this.lastConnected.toString())
        
        const winstonBalance = await window.wander!.getBalance()
        this.balance = parseFloat(winstonBalance) / WINSTON_TO_AR
        localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
        
        this.connected = true
        this.notifyConnectionListeners()
        this.notifyBalanceListeners()
        
        return this.getWalletInfo()
      } else {
        // Development mode with mock wallet
        console.log("Wander wallet not available, using mock wallet...")
        await this.connectMockWallet()
        return this.getWalletInfo()
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error)
      
      // If real connection fails, fall back to mock wallet in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Falling back to mock wallet...")
        await this.connectMockWallet()
        return this.getWalletInfo()
      }
      
      return null
    }
  }
  
  private async connectMockWallet(): Promise<void> {
    // Create a deterministic mock address based on session to make it consistent
    const sessionId = localStorage.getItem('sessionId') || Math.random().toString(36).substring(2, 10)
    localStorage.setItem('sessionId', sessionId)
    
    this.address = "0x" + sessionId.substring(0, 8) + "..." + sessionId.substring(sessionId.length - 4)
    this.balance = 100
    this.connected = true
    
    // Store in localStorage
    localStorage.setItem(WALLET_STORAGE_KEYS.ADDRESS, this.address)
    localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
    localStorage.setItem(WALLET_STORAGE_KEYS.NETWORK, this.network)
    this.lastConnected = Date.now()
    localStorage.setItem(WALLET_STORAGE_KEYS.LAST_CONNECTED, this.lastConnected.toString())
    
    this.notifyConnectionListeners()
    this.notifyBalanceListeners()
  }

  async disconnect(): Promise<boolean> {
    try {
      if (isWanderAvailable() && this.connected) {
        await window.wander!.disconnect()
      }
      
      // Clear any reconnection timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }
      
      this.connected = false
      this.address = null
      this.balance = 0
      
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem(WALLET_STORAGE_KEYS.ADDRESS)
        localStorage.removeItem(WALLET_STORAGE_KEYS.BALANCE)
        localStorage.removeItem(WALLET_STORAGE_KEYS.LAST_CONNECTED)
        // Don't remove network setting
      }

      this.notifyConnectionListeners()
      this.notifyBalanceListeners()
      
      return true
    } catch (error) {
      console.error("Error disconnecting from wallet:", error)
      
      // Force disconnect even if API call fails
      this.connected = false
      this.address = null
      this.balance = 0
      
      if (typeof window !== "undefined") {
        localStorage.removeItem(WALLET_STORAGE_KEYS.ADDRESS)
        localStorage.removeItem(WALLET_STORAGE_KEYS.BALANCE)
        localStorage.removeItem(WALLET_STORAGE_KEYS.LAST_CONNECTED)
      }
      
      this.notifyConnectionListeners()
      this.notifyBalanceListeners()
      
      return true
    }
  }

  async getBalance(forceRefresh = false): Promise<number> {
    if (!this.connected || !this.address) {
      throw new Error("Wallet not connected")
    }

    // Return cached balance if not forcing refresh
    if (!forceRefresh && this.balance > 0) {
      return this.balance
    }

    try {
      if (isWanderAvailable()) {
        const winstonBalance = await window.wander!.getBalance()
        this.balance = parseFloat(winstonBalance) / WINSTON_TO_AR
        
        localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
        this.notifyBalanceListeners()
        
        return this.balance
      } else {
        // For development mode, simulate balance changes
        const change = (Math.random() * 10) - 5 // -5 to +5
        this.balance = Math.max(0, this.balance + change)
        localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
        this.notifyBalanceListeners()
        
        return this.balance
      }
    } catch (error) {
      console.error("Error getting wallet balance:", error)
      return this.balance
    }
  }
  
  // Sign a transaction to deduct tokens for wagering
  async wagerTokens(amount: number): Promise<{ status: string, txId?: string, error?: string }> {
    if (!this.connected || !this.address) {
      return { status: "error", error: "Wallet not connected" }
    }
    
    if (this.balance < amount) {
      return { status: "error", error: "Insufficient balance" }
    }
    
    try {
      // In production, this would send a real transaction
      if (isWanderAvailable()) {
        // This is a placeholder for real transaction logic
        // In a real implementation, you would create and sign a transaction
        console.log(`Wagering ${amount} AR tokens...`)
        
        // Simulate successful transaction
        const txId = "tx_" + Math.random().toString(36).substring(2, 15)
        
        // Update balance after successful wager
        this.balance -= amount
        localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
        this.notifyBalanceListeners()
        
        return { status: "success", txId }
      } else {
        // Development mode simulation
        console.log(`MOCK: Wagering ${amount} AR tokens...`)
        
        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Update balance
        this.balance -= amount
        localStorage.setItem(WALLET_STORAGE_KEYS.BALANCE, this.balance.toString())
        this.notifyBalanceListeners()
        
        return { status: "success", txId: "mock_tx_" + Date.now() }
      }
    } catch (error) {
      console.error("Error wagering tokens:", error)
      return { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error during wagering" 
      }
    }
  }

  // Get wallet info for UI display
  getWalletInfo(): WalletInfo {
    return {
      address: this.address || "",
      balance: this.balance,
      network: this.network
    }
  }

  isConnected(): boolean {
    return this.connected && !!this.address
  }

  getAddress(): string | null {
    return this.address
  }

  getNetwork(): "testnet" | "mainnet" {
    return this.network
  }
  
  // Format address for display
  formatAddress(address: string = this.address || ""): string {
    if (!address) return ""
    if (address.length <= 13) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }
}

export const arweaveWallet = new ArweaveWallet()

// Add types for window extension for Wander wallet
declare global {
  interface Window {
    wander?: {
      connect: () => Promise<void>
      disconnect: () => Promise<void>
      getActiveAddress: () => Promise<string>
      getBalance: () => Promise<string>
      sign: (tx: any) => Promise<any>
    }
  }
}




















// // lib/wallet.ts
// import type { WalletInfo } from "./types"

// // Type guard to check if Wander is available
// export function isWanderAvailable(): boolean {
//   return typeof window !== "undefined" && !!window.wander
// }

// export class ArweaveWallet {
//   private connected = false
//   private address: string | null = null
//   private balance = 0
//   private network: "testnet" | "mainnet" = "testnet"

//   constructor() {
//     this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
//     if (typeof window !== "undefined") {
//       const storedAddress = localStorage.getItem("walletAddress")
//       if (storedAddress) {
//         this.address = storedAddress
//         this.connected = true
//         const storedBalance = localStorage.getItem("walletBalance")
//         if (storedBalance) {
//           this.balance = parseFloat(storedBalance)
//         }
//       }
//     }
//   }

//   async connect(): Promise<WalletInfo | null> {
//     try {
//       if (isWanderAvailable()) {
//         // Use Wander to connect to wallet
//         console.log("Connecting to Wander wallet...")
//         await window.wander!.connect()
//         this.address = await window.wander!.getActiveAddress()
//         if (!this.address) throw new Error("Failed to get wallet address")
//         localStorage.setItem("walletAddress", this.address)
//         const winstonBalance = await window.wander!.getBalance()
//         this.balance = parseFloat(winstonBalance) / 1_000_000_000_000
//         localStorage.setItem("walletBalance", this.balance.toString())
//       } else {
//         // Mock wallet fallback
//         console.log("Wander wallet not available, using mock wallet...")
//         this.address = "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 6)
//         this.balance = Math.floor(Math.random() * 100)
//         localStorage.setItem("walletAddress", this.address)
//         localStorage.setItem("walletBalance", this.balance.toString())
//       }
//       this.connected = true
//       return {
//         address: this.address,
//         balance: this.balance,
//         network: this.network
//       }
//     } catch (error) {
//       console.error("Error connecting to wallet:", error)
//       // Fallback to mock wallet if Wander connection fails
//       console.log("Falling back to mock wallet...")
//       this.address = "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 6)
//       this.balance = Math.floor(Math.random() * 100)
//       this.connected = true
//       localStorage.setItem("walletAddress", this.address)
//       localStorage.setItem("walletBalance", this.balance.toString())
//       return {
//         address: this.address,
//         balance: this.balance,
//         network: this.network
//       }
//     }
//   }

//   async disconnect(): Promise<boolean> {
//     try {
//       if (isWanderAvailable()) {
//         await window.wander!.disconnect()
//       }
//       this.connected = false
//       this.address = null
//       this.balance = 0
//       if (typeof window !== "undefined") {
//         localStorage.removeItem("walletAddress")
//         localStorage.removeItem("walletBalance")
//       }
//       return true
//     } catch (error) {
//       console.error("Error disconnecting from wallet:", error)
//       this.connected = false
//       this.address = null
//       this.balance = 0
//       if (typeof window !== "undefined") {
//         localStorage.removeItem("walletAddress")
//         localStorage.removeItem("walletBalance")
//       }
//       return true
//     }
//   }

//   async getBalance(): Promise<number> {
//     if (!this.connected || !this.address) {
//       throw new Error("Wallet not connected")
//     }
//     try {
//       if (isWanderAvailable()) {
//         const winstonBalance = await window.wander!.getBalance()
//         this.balance = parseFloat(winstonBalance) / 1_000_000_000_000
//         localStorage.setItem("walletBalance", this.balance.toString())
//         return this.balance
//       } else {
//         this.balance = Math.floor(Math.random() * 100)
//         localStorage.setItem("walletBalance", this.balance.toString())
//         return this.balance
//       }
//     } catch (error) {
//       console.error("Error getting wallet balance:", error)
//       return this.balance
//     }
//   }

//   isConnected(): boolean {
//     return this.connected
//   }

//   getAddress(): string | null {
//     return this.address
//   }

//   getNetwork(): "testnet" | "mainnet" {
//     return this.network
//   }
// }

// export const arweaveWallet = new ArweaveWallet()

// // Add types for window extension for Wander wallet
// declare global {
//   interface Window {
//     wander?: {
//       connect: () => Promise<void>
//       disconnect: () => Promise<void>
//       getActiveAddress: () => Promise<string>
//       getBalance: () => Promise<string>
//       sign: (tx: any) => Promise<any>
//     }
//   }
// }


