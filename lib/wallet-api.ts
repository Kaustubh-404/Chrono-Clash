// lib/wallet-api.ts
import { useEffect } from 'react';
import { useApi } from '@arweave-wallet-kit/react';

// Use a generic Record type instead of WalletAPI which isn't exported
type GenericWalletAPI = Record<string, any>;

/**
 * Global store for the wallet API instance
 * This allows accessing the API from outside React components
 */
class WalletApiStore {
  private static instance: WalletApiStore;
  private _api: GenericWalletAPI | null = null;
  private subscribers: Array<(api: GenericWalletAPI | null) => void> = [];

  private constructor() {}

  static getInstance(): WalletApiStore {
    if (!WalletApiStore.instance) {
      WalletApiStore.instance = new WalletApiStore();
    }
    return WalletApiStore.instance;
  }

  /**
   * Set the current wallet API instance
   */
  setApi(api: GenericWalletAPI | null): void {
    this._api = api;
    // Notify subscribers
    this.subscribers.forEach(subscriber => subscriber(api));
  }

  /**
   * Get the current wallet API instance
   */
  getApi(): GenericWalletAPI | null {
    return this._api;
  }

  /**
   * Subscribe to API changes
   */
  subscribe(callback: (api: GenericWalletAPI | null) => void): () => void {
    this.subscribers.push(callback);
    // Call immediately with current state
    callback(this._api);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }
}

export const walletApiStore = WalletApiStore.getInstance();

/**
 * React hook for syncing the current API instance with the store
 * Should be used in a high-level component to ensure the API is available globally
 */
export function useWalletApiSync(): void {
  const api = useApi();
  
  useEffect(() => {
    // Fix: Convert undefined to null before passing to setApi
    walletApiStore.setApi(api || null);
    
    // Clean up on unmount
    return () => {
      walletApiStore.setApi(null);
    };
  }, [api]);
}



