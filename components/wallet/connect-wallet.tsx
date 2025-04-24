"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"
import { arweaveWallet } from "@/lib/wallet"
import { aoClient } from "@/lib/ao-client"
import type { WalletInfo } from "@/lib/types"

export function ConnectWallet() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)

  // Check for saved wallet connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (arweaveWallet.isConnected()) {
        const address = arweaveWallet.getAddress()
        const network = arweaveWallet.getNetwork()
        
        if (address) {
          setWalletInfo({
            address,
            balance: 0, // Will be updated by getBalance
            network
          })
          
          // Also make sure AO client has the address
          aoClient.setWalletAddress(address)
          
          // Try to get updated balance
          try {
            const balance = await arweaveWallet.getBalance()
            setWalletInfo(prev => prev ? {...prev, balance} : null)
          } catch (error) {
            console.error("Failed to get wallet balance", error)
          }
        }
      }
    }
    
    checkConnection()
  }, [])

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      const info = await arweaveWallet.connect()
      if (info) {
        setWalletInfo(info)

        // Set wallet address in AO client
        if (info.address) {
          aoClient.setWalletAddress(info.address)
        }
      } else {
        throw new Error("Failed to connect wallet")
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      alert("Failed to connect wallet. Please make sure Wander is installed and try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    setIsConnecting(true)
    try {
      await arweaveWallet.disconnect()
      setWalletInfo(null)
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const shortenAddress = (address: string) => {
    if (!address) return ""
    return address.slice(0, 6) + "..." + address.slice(-6)
  }

  if (isConnecting) {
    return (
      <Button disabled className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    )
  }

  if (walletInfo) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-medium">{shortenAddress(walletInfo.address)}</div>
          <div className="text-muted-foreground">
            {walletInfo.balance.toFixed(4)} AR • {walletInfo.network}
          </div>
        </div>
        <Button variant="outline" onClick={disconnectWallet}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={connectWallet} className="flex items-center gap-2">
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}









// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Loader2, Wallet } from "lucide-react"
// import { arweaveWallet } from "@/lib/wallet"
// import { aoClient } from "@/lib/ao-client"
// import type { WalletInfo } from "@/lib/types"

// export function ConnectWallet() {
//   const [isConnecting, setIsConnecting] = useState(false)
//   const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)

//   const connectWallet = async () => {
//     setIsConnecting(true)
//     try {
//       const info = await arweaveWallet.connect()
//       setWalletInfo(info)

//       // Set wallet address in AO client
//       if (info?.address) {
//         aoClient.setWalletAddress(info.address)
//       }
//     } catch (error) {
//       console.error("Failed to connect wallet:", error)
//     } finally {
//       setIsConnecting(false)
//     }
//   }

//   const disconnectWallet = async () => {
//     setIsConnecting(true)
//     try {
//       await arweaveWallet.disconnect()
//       setWalletInfo(null)
//     } catch (error) {
//       console.error("Failed to disconnect wallet:", error)
//     } finally {
//       setIsConnecting(false)
//     }
//   }

//   if (isConnecting) {
//     return (
//       <Button disabled className="flex items-center gap-2">
//         <Loader2 className="h-4 w-4 animate-spin" />
//         Connecting...
//       </Button>
//     )
//   }

//   if (walletInfo) {
//     return (
//       <div className="flex items-center gap-4">
//         <div className="text-sm">
//           <div className="font-medium">{walletInfo.address}</div>
//           <div className="text-muted-foreground">
//             {walletInfo.balance} AR • {walletInfo.network}
//           </div>
//         </div>
//         <Button variant="outline" onClick={disconnectWallet}>
//           Disconnect
//         </Button>
//       </div>
//     )
//   }

//   return (
//     <Button onClick={connectWallet} className="flex items-center gap-2">
//       <Wallet className="h-4 w-4" />
//       Connect Wallet
//     </Button>
//   )
// }
