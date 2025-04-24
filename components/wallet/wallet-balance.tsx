// components/wallet/wallet-balance.tsx
import { useState, useEffect } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { arweaveWallet } from "@/lib/wallet"
import { Button } from "@/components/ui/button"

interface WalletBalanceProps {
  showRefresh?: boolean
  className?: string
}

export function WalletBalance({ showRefresh = true, className = "" }: WalletBalanceProps) {
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  useEffect(() => {
    const updateBalance = () => {
      if (arweaveWallet.isConnected()) {
        setBalance(arweaveWallet.getWalletInfo().balance)
      }
      setIsLoading(false)
    }
    
    updateBalance()
    
    const removeListener = arweaveWallet.addBalanceListener((newBalance) => {
      setBalance(newBalance)
      setIsLoading(false)
    })
    
    return () => {
      removeListener()
    }
  }, [])
  
  const handleRefresh = async () => {
    if (!arweaveWallet.isConnected()) return
    
    setIsRefreshing(true)
    try {
      const newBalance = await arweaveWallet.getBalance(true)
      setBalance(newBalance)
    } catch (error) {
      console.error("Failed to refresh balance:", error)
    } finally {
      setIsRefreshing(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-gray-400">Loading...</span>
      </div>
    )
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono">{balance.toFixed(4)} AR</span>
      {showRefresh && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  )
}