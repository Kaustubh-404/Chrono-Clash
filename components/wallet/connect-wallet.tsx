"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Wallet } from "lucide-react"
import { arweaveWallet } from "@/lib/wallet"
import { aoClient } from "@/lib/ao-client"
import type { WalletInfo } from "@/lib/types"

export function ConnectWallet() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      const info = await arweaveWallet.connect()
      setWalletInfo(info)

      // Set wallet address in AO client
      if (info?.address) {
        aoClient.setWalletAddress(info.address)
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
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
          <div className="font-medium">{walletInfo.address}</div>
          <div className="text-muted-foreground">
            {walletInfo.balance} AR • {walletInfo.network}
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
