// components/wallet/wallet-balance.tsx
import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConnection, useActiveAddress, useApi } from "@arweave-wallet-kit/react";

interface WalletBalanceProps {
  showRefresh?: boolean;
  className?: string;
}

// Winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000;

export function WalletBalance({ showRefresh = true, className = "" }: WalletBalanceProps) {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // AWK hooks
  const { connected } = useConnection();
  const address = useActiveAddress();
  const api = useApi();

  // Load balance when component mounts or address changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && address && api) {
        try {
          const winstonBalance = await api.getBalance(address);
          setBalance(Number(winstonBalance) / WINSTON_TO_AR);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setBalance(0);
        } finally {
          setIsLoading(false);
        }
      } else {
        setBalance(0);
        setIsLoading(false);
      }
    };

    fetchBalance();
  }, [connected, address, api]);

  const handleRefresh = async () => {
    if (!connected || !address || !api) return;

    setIsRefreshing(true);
    try {
      const winstonBalance = await api.getBalance(address);
      setBalance(Number(winstonBalance) / WINSTON_TO_AR);
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-gray-400">Loading...</span>
      </div>
    );
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
          disabled={isRefreshing || !connected}
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}




