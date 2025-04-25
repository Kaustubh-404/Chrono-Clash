'use client';

import React, { useEffect } from 'react';
import { ArweaveWalletKit } from '@arweave-wallet-kit/react';
import WanderStrategy from '@arweave-wallet-kit/wander-strategy';
import { arweaveWallet } from '@/lib/wallet';
import { useConnection, useActiveAddress, useApi } from '@arweave-wallet-kit/react';
import { enhancedAoClient } from '@/lib/ao-client-enhanced';
import { useWalletApiSync } from '@/lib/wallet-api';

// Removed CSS import that was causing issues

interface ArweaveWalletProviderProps {
  children: React.ReactNode;
}

export function ArweaveWalletProvider({ children }: ArweaveWalletProviderProps) {
  return (
    <ArweaveWalletKit
      config={{
        permissions: [
          'ACCESS_ADDRESS',
          'ACCESS_PUBLIC_KEY',
          'SIGN_TRANSACTION',
          'DISPATCH',
        ],
        ensurePermissions: true,
        strategies: [
          new WanderStrategy(),
        ],
      }}
    >
      <WalletConnectionManager />
      {children}
    </ArweaveWalletKit>
  );
}

// This component manages the connection state and syncs it with our legacy wallet system
function WalletConnectionManager() {
  const { connected, connect } = useConnection();
  const address = useActiveAddress();
  const api = useApi();

  // Sync the API with our global store so it can be accessed from outside React components
  useWalletApiSync();
  
  // Sync AWK connection state with our arweaveWallet instance
  useEffect(() => {
    if (connected && address && api) {
      // Update enhancedAoClient with the new wallet address
      enhancedAoClient.setWalletAddress(address);
      
      // Notify our connection listeners
      arweaveWallet.notifyConnectionListeners(address);
      
      // Try to get balance asynchronously
      const getBalance = async () => {
        try {
          // Get balance in winston
          const winstonBalance = await api.getBalance(address);
          
          // Convert to AR
          const arBalance = Number(winstonBalance) / WINSTON_TO_AR;
          
          // Notify balance listeners
          arweaveWallet.notifyBalanceListeners(arBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      };
      
      getBalance();
    } else {
      // Notify listeners about disconnection
      arweaveWallet.notifyConnectionListeners(null);
    }
  }, [connected, address, api]);

  // Attempt a silent connection on initial load
  useEffect(() => {
    const attemptSilentConnection = async () => {
      try {
        // Connect without parameters
        await connect();
      } catch (error) {
        // Silent connection failed, user will need to connect manually
        console.log('Silent wallet connection failed, user will need to connect manually');
      }
    };
    
    attemptSilentConnection();
  }, [connect]);

  return null;
}

// Winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000;



