// components/wallet/connect-wallet.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Wallet, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { arweaveWallet } from "@/lib/wallet";
import { enhancedAoClient } from "@/lib/ao-client-enhanced";
import { useToast } from "@/hooks/use-toast";
import { 
  ConnectButton, 
  useConnection, 
  useActiveAddress, 
  useApi 
} from "@arweave-wallet-kit/react";
import type { WalletInfo } from "@/lib/types";

// Winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000;

export function ConnectWallet() {
  const [showDialog, setShowDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const { toast } = useToast();

  // AWK hooks
  const { connected, connect, disconnect } = useConnection();
  const address = useActiveAddress();
  const api = useApi();

  // Monitor online/offline status
  useEffect(() => {
    const handleConnectionChange = () => {
      setIsOffline(!navigator.onLine);
    };
    
    // Set initial state
    setIsOffline(!navigator.onLine);
    
    // Listen for connection changes
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  // Update wallet info when connection status changes
  useEffect(() => {
    const updateWalletInfo = async () => {
      // Fix: Check if api is defined
      if (connected && address && api) {
        try {
          // Get balance
          const winstonBalance = await api.getBalance(address);
          const balance = Number(winstonBalance) / WINSTON_TO_AR;
          
          setWalletInfo({
            address,
            balance,
            network: process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet" || "testnet"
          });
          
          // Ensure AO client has the address
          enhancedAoClient.setWalletAddress(address);
        } catch (error) {
          console.error("Error getting wallet balance:", error);
          setWalletInfo({
            address,
            balance: 0,
            network: process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet" || "testnet"
          });
        }
      } else {
        setWalletInfo(null);
      }
    };
    
    updateWalletInfo();
  }, [connected, address, api]);

  const refreshBalance = async () => {
    // Fix: Check if api is defined
    if (!connected || !address || !api) return;
    
    setIsRefreshing(true);
    try {
      const winstonBalance = await api.getBalance(address);
      const balance = Number(winstonBalance) / WINSTON_TO_AR;
      
      setWalletInfo(prev => prev ? {...prev, balance} : null);
      
      toast({
        title: "Balance Updated",
        description: `Current balance: ${balance.toFixed(4)} AR`,
        variant: "default",
      });
      
      // Notify balance listeners from the legacy system
      arweaveWallet.notifyBalanceListeners(balance);
    } catch (error) {
      console.error("Failed to refresh balance", error);
      toast({
        title: "Error",
        description: "Failed to refresh wallet balance",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Custom connect handler
  const handleConnect = async () => {
    if (isOffline) {
      toast({
        title: "You're offline",
        description: "Cannot connect wallet while offline",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await connect();
      
      // If connection successful and we have an address
      if (address) {
        toast({
          title: "Wallet Connected",
          description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error connecting wallet",
        variant: "destructive",
      });
      
      // Show Wander installation dialog if needed
      setShowDialog(true);
    }
  };

  // Custom disconnect handler
  const handleDisconnect = async () => {
    try {
      await disconnect();
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect wallet properly",
        variant: "destructive",
      });
    }
  };

  const handleInstallWander = () => {
    window.open("https://www.wander.app/", "_blank");
    setShowDialog(false);
  };

  // AWK Connect Button with our custom styling
  if (connected && walletInfo) {
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
              disabled={isRefreshing || isOffline}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <Button variant="outline" onClick={handleDisconnect} size="sm">
          Disconnect
        </Button>
      </div>
    );
  }

  // Not connected state
  return (
    <>
      <Button 
        onClick={handleConnect} 
        className="flex items-center gap-2"
        disabled={isOffline}
      >
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
  );
}


