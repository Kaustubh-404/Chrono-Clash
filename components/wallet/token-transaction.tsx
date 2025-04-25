// components/wallet/token-transaction.tsx
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useConnection, useActiveAddress, useApi } from "@arweave-wallet-kit/react";
import Arweave from 'arweave';

interface TokenTransactionProps {
  amount: number;
  purpose: string;
  onSuccess: (txId: string) => void;
  onError: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

// Winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000;

export function TokenTransaction({
  amount,
  purpose,
  onSuccess,
  onError,
  buttonText = "Confirm",
  disabled = false,
}: TokenTransactionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { toast } = useToast();

  // AWK hooks
  const { connected } = useConnection();
  const address = useActiveAddress();
  const api = useApi();

  // Monitor network status
  useEffect(() => {
    const handleConnectionChange = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, []);

  const handleTransaction = async () => {
    if (!connected || !address || !api) {
      onError("Wallet not connected");
      return;
    }

    // Check for offline state
    if (isOffline) {
      onError("Cannot process transaction while offline");
      return;
    }

    setIsProcessing(true);
    try {
      // Get current balance to verify it's sufficient
      const winstonBalance = await api.getBalance(address);
      const arBalance = Number(winstonBalance) / WINSTON_TO_AR;

      if (arBalance < amount) {
        throw new Error("Insufficient balance");
      }

      // Create a transaction to simulate wagering
      // This is just a placeholder - in a real implementation,
      // you would use the actual game smart contract
      const recipientAddress = process.env.NEXT_PUBLIC_AO_PROCESS_ID || "GAME_CONTRACT_ADDRESS";
      
      // Convert AR to winston for transaction
      const amountWinston = Math.floor(amount * WINSTON_TO_AR);
      
      // Initialize Arweave
      const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
      });
      
      // Create a simple transfer transaction
      const tx = await arweave.createTransaction({
        target: recipientAddress,
        quantity: amountWinston.toString(),
        data: JSON.stringify({
          purpose: purpose,
          timestamp: Date.now()
        })
      });
      
      // Sign transaction
      await api.sign(tx);
      
      // Normally you would also dispatch/post the transaction:
      // await api.dispatch(tx);
      // But for this example, we'll just use the transaction ID
      
      const txId = tx.id;

      toast({
        title: "Transaction Successful",
        description: `${amount} AR tokens for ${purpose} confirmed`,
        variant: "default",
      });
      
      onSuccess(txId);
    } catch (error) {
      console.error("Transaction error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get current balance for display
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  
  // Update current balance when component mounts
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && address && api) {
        try {
          const winstonBalance = await api.getBalance(address);
          setCurrentBalance(Number(winstonBalance) / WINSTON_TO_AR);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setCurrentBalance(0);
        }
      }
    };
    
    fetchBalance();
  }, [connected, address, api]);
  
  const insufficientFunds = currentBalance < amount;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl text-white">Confirm Transaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOffline && (
          <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-md mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>You are currently offline. Cannot process transaction.</span>
          </div>
        )}

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
          disabled={
            isProcessing ||
            disabled ||
            insufficientFunds ||
            isOffline ||
            !connected
          }
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}









