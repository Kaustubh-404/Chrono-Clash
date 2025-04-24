// components/wallet/connect-wallet.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Wallet, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react"
import { arweaveWallet, isWanderAvailable } from "@/lib/wallet"
import { aoClient } from "@/lib/ao-client"
import type { WalletInfo } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function ConnectWallet() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Check for wallet connection on load
  useEffect(() => {
    const checkConnection = async () => {
      if (arweaveWallet.isConnected()) {
        const info = arweaveWallet.getWalletInfo()
        setWalletInfo(info)
        
        // Also make sure AO client has the address
        if (info.address) {
          aoClient.setWalletAddress(info.address)
        }
      }
    }
    
    checkConnection()
    
    // Set up listeners for wallet connection changes
    const removeConnectionListener = arweaveWallet.addConnectionListener((address) => {
      if (address) {
        const info = arweaveWallet.getWalletInfo()
        setWalletInfo(info)
        aoClient.setWalletAddress(address)
      } else {
        setWalletInfo(null)
      }
    })
    
    const removeBalanceListener = arweaveWallet.addBalanceListener(() => {
      if (arweaveWallet.isConnected()) {
        const info = arweaveWallet.getWalletInfo()
        setWalletInfo(info)
      }
    })
    
    return () => {
      removeConnectionListener()
      removeBalanceListener()
    }
  }, [])

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      // Check if Wander is available
      if (!isWanderAvailable()) {
        setShowDialog(true)
      }
      
      const info = await arweaveWallet.connect()
      if (info) {
        setWalletInfo(info)

        toast({
          title: "Wallet Connected",
          description: `Connected to ${info.network} with ${info.balance.toFixed(2)} AR`,
          variant: "default",
        })
      } else {
        throw new Error("Failed to connect wallet")
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error connecting wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    setIsConnecting(true)
    try {
      await arweaveWallet.disconnect()
      setWalletInfo(null)
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect wallet properly",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const refreshBalance = async () => {
    if (!arweaveWallet.isConnected()) return
    
    setIsRefreshing(true)
    try {
      const balance = await arweaveWallet.getBalance(true)
      setWalletInfo(prev => prev ? {...prev, balance} : null)
      
      toast({
        title: "Balance Updated",
        description: `Current balance: ${balance.toFixed(4)} AR`,
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to refresh balance", error)
      toast({
        title: "Error",
        description: "Failed to refresh wallet balance",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleInstallWander = () => {
    window.open("https://www.wander.app/", "_blank")
    setShowDialog(false)
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
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <div className="font-medium">{arweaveWallet.formatAddress(walletInfo.address)}</div>
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>{walletInfo.balance.toFixed(4)} AR</span>
            <span className="text-xs">•</span>
            <span>{walletInfo.network}</span>
            <button 
              onClick={refreshBalance} 
              className="ml-1 p-1 rounded-full hover:bg-gray-800 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <Button variant="outline" onClick={disconnectWallet} size="sm">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button onClick={connectWallet} className="flex items-center gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wander Wallet Required</DialogTitle>
            <DialogDescription>
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p>
                    ChronoClash requires the Wander wallet extension to interact with Arweave blockchain.
                  </p>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Why do I need Wander?</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Connect to Arweave blockchain</li>
                    <li>Securely store and wager AR tokens</li>
                    <li>Sign transactions for game actions</li>
                    <li>Claim your winnings automatically</li>
                  </ul>
                </div>
                
                <Button onClick={handleInstallWander} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Install Wander Wallet
                </Button>
                
                <div className="text-xs text-center text-gray-500">
                  After installing, refresh this page and try connecting again.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}











