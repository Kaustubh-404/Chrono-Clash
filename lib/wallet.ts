// lib/wallet.ts
import type { WalletInfo } from "./types"

// Type guard to check if Wander is available
export function isWanderAvailable(): boolean {
  return typeof window !== "undefined" && !!window.wander
}

export class ArweaveWallet {
  private connected = false
  private address: string | null = null
  private balance = 0
  private network: "testnet" | "mainnet" = "testnet"

  constructor() {
    this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
    if (typeof window !== "undefined") {
      const storedAddress = localStorage.getItem("walletAddress")
      if (storedAddress) {
        this.address = storedAddress
        this.connected = true
        const storedBalance = localStorage.getItem("walletBalance")
        if (storedBalance) {
          this.balance = parseFloat(storedBalance)
        }
      }
    }
  }

  async connect(): Promise<WalletInfo | null> {
    try {
      if (isWanderAvailable()) {
        // Use Wander to connect to wallet
        console.log("Connecting to Wander wallet...")
        await window.wander!.connect()
        this.address = await window.wander!.getActiveAddress()
        if (!this.address) throw new Error("Failed to get wallet address")
        localStorage.setItem("walletAddress", this.address)
        const winstonBalance = await window.wander!.getBalance()
        this.balance = parseFloat(winstonBalance) / 1_000_000_000_000
        localStorage.setItem("walletBalance", this.balance.toString())
      } else {
        // Mock wallet fallback
        console.log("Wander wallet not available, using mock wallet...")
        this.address = "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 6)
        this.balance = Math.floor(Math.random() * 100)
        localStorage.setItem("walletAddress", this.address)
        localStorage.setItem("walletBalance", this.balance.toString())
      }
      this.connected = true
      return {
        address: this.address,
        balance: this.balance,
        network: this.network
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error)
      // Fallback to mock wallet if Wander connection fails
      console.log("Falling back to mock wallet...")
      this.address = "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 6)
      this.balance = Math.floor(Math.random() * 100)
      this.connected = true
      localStorage.setItem("walletAddress", this.address)
      localStorage.setItem("walletBalance", this.balance.toString())
      return {
        address: this.address,
        balance: this.balance,
        network: this.network
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (isWanderAvailable()) {
        await window.wander!.disconnect()
      }
      this.connected = false
      this.address = null
      this.balance = 0
      if (typeof window !== "undefined") {
        localStorage.removeItem("walletAddress")
        localStorage.removeItem("walletBalance")
      }
      return true
    } catch (error) {
      console.error("Error disconnecting from wallet:", error)
      this.connected = false
      this.address = null
      this.balance = 0
      if (typeof window !== "undefined") {
        localStorage.removeItem("walletAddress")
        localStorage.removeItem("walletBalance")
      }
      return true
    }
  }

  async getBalance(): Promise<number> {
    if (!this.connected || !this.address) {
      throw new Error("Wallet not connected")
    }
    try {
      if (isWanderAvailable()) {
        const winstonBalance = await window.wander!.getBalance()
        this.balance = parseFloat(winstonBalance) / 1_000_000_000_000
        localStorage.setItem("walletBalance", this.balance.toString())
        return this.balance
      } else {
        this.balance = Math.floor(Math.random() * 100)
        localStorage.setItem("walletBalance", this.balance.toString())
        return this.balance
      }
    } catch (error) {
      console.error("Error getting wallet balance:", error)
      return this.balance
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  getAddress(): string | null {
    return this.address
  }

  getNetwork(): "testnet" | "mainnet" {
    return this.network
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
//   return typeof window !== "undefined" && window.wander !== undefined;
// }

// export class ArweaveWallet {
//   private connected = false
//   private address: string | null = null
//   private balance = 0
//   private network: "testnet" | "mainnet" = "testnet"

//   constructor() {
//     this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
    
//     // Check for wallet connection in localStorage on initialization
//     if (typeof window !== "undefined") {
//       const storedAddress = localStorage.getItem("walletAddress")
//       if (storedAddress) {
//         this.address = storedAddress
//         this.connected = true
//         // Try to retrieve balance from localStorage
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
        
//         // Requesting permission to access the wallet
//         await window.wander.connect()
        
//         // Get wallet address
//         this.address = await window.wander.getActiveAddress()
        
//         if (!this.address) {
//           throw new Error("Failed to get wallet address")
//         }
        
//         // Store in localStorage for persistence
//         localStorage.setItem("walletAddress", this.address)
        
//         // Get wallet balance (in raw Winston)
//         const winstonBalance = await window.wander.getBalance()
//         // Convert winston to AR (1 AR = 10^12 winston)
//         this.balance = parseFloat(winstonBalance) / 1000000000000
        
//         localStorage.setItem("walletBalance", this.balance.toString())
//       } else {
//         console.log("Wander wallet not available, using mock wallet...")
//         // Create a mock wallet for testing
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
//         await window.wander.disconnect()
//       }
      
//       this.connected = false
//       this.address = null
//       this.balance = 0
      
//       // Clear localStorage
//       if (typeof window !== "undefined") {
//         localStorage.removeItem("walletAddress")
//         localStorage.removeItem("walletBalance")
//       }

//       return true
//     } catch (error) {
//       console.error("Error disconnecting from wallet:", error)
      
//       // Even if disconnect fails, clear local state
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
//         // Get wallet balance (in raw Winston)
//         const winstonBalance = await window.wander.getBalance()
//         // Convert winston to AR (1 AR = 10^12 winston)
//         this.balance = parseFloat(winstonBalance) / 1000000000000
        
//         localStorage.setItem("walletBalance", this.balance.toString())
//         return this.balance
//       } else {
//         // For testing, just use a random balance
//         this.balance = Math.floor(Math.random() * 100)
//         localStorage.setItem("walletBalance", this.balance.toString())
//         return this.balance
//       }
//     } catch (error) {
//       console.error("Error getting wallet balance:", error)
//       // Return current balance as fallback
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






// import type { WalletInfo } from "./types"

// // Type guard to check if Wander is available
// export function isWanderAvailable(): boolean {
//   return typeof window !== "undefined" && !!window.wander;
// }

// export class ArweaveWallet {
//   private connected = false
//   private address: string | null = null
//   private balance = 0
//   private network: "testnet" | "mainnet" = "testnet"

//   constructor() {
//     this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
    
//     // Check for wallet connection in localStorage on initialization
//     if (typeof window !== "undefined") {
//       const storedAddress = localStorage.getItem("walletAddress")
//       if (storedAddress) {
//         this.address = storedAddress
//         this.connected = true
//         // Try to retrieve balance from localStorage
//         const storedBalance = localStorage.getItem("walletBalance")
//         if (storedBalance) {
//           this.balance = parseFloat(storedBalance)
//         }
//       }
//     }
//   }

//   async connect(): Promise<WalletInfo | null> {
//     try {
//       // Check if Wander is installed
//       if (!isWanderAvailable()) {
//         throw new Error("Wander wallet not installed")
//       }

//       // Use Wander to connect to wallet
//       console.log("Connecting to Wander wallet...")
      
//       // Requesting permission to access the wallet
//       await window.wander!.connect()
      
//       // Get wallet address
//       this.address = await window.wander!.getActiveAddress()
      
//       if (!this.address) {
//         throw new Error("Failed to get wallet address")
//       }
      
//       // Store in localStorage for persistence
//       localStorage.setItem("walletAddress", this.address)
      
//       // Get wallet balance (in raw Winston)
//       const winstonBalance = await window.wander!.getBalance()
//       // Convert winston to AR (1 AR = 10^12 winston)
//       this.balance = parseFloat(winstonBalance) / 1000000000000
      
//       localStorage.setItem("walletBalance", this.balance.toString())
      
//       this.connected = true

//       return {
//         address: this.address,
//         balance: this.balance,
//         network: this.network
//       }
//     } catch (error) {
//       console.error("Error connecting to wallet:", error)
//       return null
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
      
//       // Clear localStorage
//       if (typeof window !== "undefined") {
//         localStorage.removeItem("walletAddress")
//         localStorage.removeItem("walletBalance")
//       }

//       return true
//     } catch (error) {
//       console.error("Error disconnecting from wallet:", error)
//       return false
//     }
//   }

//   async getBalance(): Promise<number> {
//     if (!this.connected || !this.address) {
//       throw new Error("Wallet not connected")
//     }

//     try {
//       if (isWanderAvailable()) {
//         // Get wallet balance (in raw Winston)
//         const winstonBalance = await window.wander!.getBalance()
//         // Convert winston to AR (1 AR = 10^12 winston)
//         this.balance = parseFloat(winstonBalance) / 1000000000000
        
//         localStorage.setItem("walletBalance", this.balance.toString())
//         return this.balance
//       }
//       throw new Error("Wander wallet not available")
//     } catch (error) {
//       console.error("Error getting wallet balance:", error)
//       throw error
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









// // import type { WalletInfo } from "./types"

// // export class ArweaveWallet {
// //   private connected = false
// //   private address: string | null = null
// //   private balance = 0
// //   private network: "testnet" | "mainnet" = "testnet"

// //   constructor() {
// //     this.network = (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet"
// //   }

// //   async connect(): Promise<WalletInfo | null> {
// //     try {
// //       // Check if ARConnect is installed
// //       if (typeof window !== "undefined" && !window.arweaveWallet) {
// //         throw new Error("ARConnect not installed")
// //       }

// //       // In a real implementation, this would use ARConnect to connect to the wallet
// //       // For now, we'll simulate the connection
// //       console.log("Connecting to ARConnect wallet...")

// //       // Simulate network delay
// //       await new Promise((resolve) => setTimeout(resolve, 1000))

// //       this.connected = true
// //       this.address =
// //         "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 6)
// //       this.balance = Math.floor(Math.random() * 100)

// //       return {
// //         address: this.address,
// //         balance: this.balance,
// //         network: this.network,
// //       }
// //     } catch (error) {
// //       console.error("Error connecting to wallet:", error)
// //       return null
// //     }
// //   }

// //   async disconnect(): Promise<boolean> {
// //     try {
// //       // In a real implementation, this would use ARConnect to disconnect from the wallet
// //       console.log("Disconnecting from ARConnect wallet...")

// //       // Simulate network delay
// //       await new Promise((resolve) => setTimeout(resolve, 500))

// //       this.connected = false
// //       this.address = null
// //       this.balance = 0

// //       return true
// //     } catch (error) {
// //       console.error("Error disconnecting from wallet:", error)
// //       return false
// //     }
// //   }

// //   async getBalance(): Promise<number> {
// //     if (!this.connected || !this.address) {
// //       throw new Error("Wallet not connected")
// //     }

// //     try {
// //       // In a real implementation, this would use ARConnect to get the balance
// //       // For now, we'll simulate the balance
// //       console.log("Getting wallet balance...")

// //       // Simulate network delay
// //       await new Promise((resolve) => setTimeout(resolve, 500))

// //       this.balance = Math.floor(Math.random() * 100)
// //       return this.balance
// //     } catch (error) {
// //       console.error("Error getting wallet balance:", error)
// //       throw error
// //     }
// //   }

// //   isConnected(): boolean {
// //     return this.connected
// //   }

// //   getAddress(): string | null {
// //     return this.address
// //   }

// //   getNetwork(): "testnet" | "mainnet" {
// //     return this.network
// //   }
// // }

// // export const arweaveWallet = new ArweaveWallet()
