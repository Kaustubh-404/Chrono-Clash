// components/wallet/token-transaction.tsx
import { useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { arweaveWallet } from "@/lib/wallet"
import { useToast } from "@/hooks/use-toast"

interface TokenTransactionProps {
  amount: number
  purpose: string
  onSuccess: (txId: string) => void
  onError: (error: string) => void
  buttonText?: string
  disabled?: boolean
}

export function TokenTransaction({ 
  amount, 
  purpose, 
  onSuccess, 
  onError, 
  buttonText = "Confirm",
  disabled = false
}: TokenTransactionProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  
  const handleTransaction = async () => {
    if (!arweaveWallet.isConnected()) {
      onError("Wallet not connected")
      return
    }
    
    setIsProcessing(true)
    try {
      const result = await arweaveWallet.wagerTokens(amount)
      
      if (result.status === "success" && result.txId) {
        toast({
          title: "Transaction Successful",
          description: `${amount} AR tokens for ${purpose} confirmed`,
          variant: "default",
        })
        onSuccess(result.txId)
      } else {
        throw new Error(result.error || "Transaction failed")
      }
    } catch (error) {
      console.error("Transaction error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      })
      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const currentBalance = arweaveWallet.getWalletInfo().balance
  const insufficientFunds = currentBalance < amount
  
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl text-white">Confirm Transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Purpose:</span>
          <span className="text-white">{purpose}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Amount:</span>
          <span className="text-2xl font-bold text-amber-400">{amount} AR</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Current Balance:</span>
          <span className="text-white">{currentBalance.toFixed(4)} AR</span>
        </div>
        
        {insufficientFunds && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span>Insufficient funds for this transaction</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleTransaction} 
          disabled={isProcessing || disabled || insufficientFunds}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}