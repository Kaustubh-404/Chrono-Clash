// lib/wallet.ts - Rewritten to use Arweave Wallet Kit
import type { WalletInfo } from "./types";

// Type for event listeners
type ConnectionListener = (address: string | null) => void;
type BalanceListener = (balance: number) => void;

// Constants for winston to AR conversion (1 AR = 10^12 winston)
const WINSTON_TO_AR = 1_000_000_000_000;

export class ArweaveWallet {
  private connectionListeners: ConnectionListener[] = [];
  private balanceListeners: BalanceListener[] = [];

  /**
   * Add a connection listener to be notified of connection changes
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  /**
   * Add a balance listener to be notified of balance changes
   */
  addBalanceListener(listener: BalanceListener): () => void {
    this.balanceListeners.push(listener);
    return () => {
      this.balanceListeners = this.balanceListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all connection listeners about address changes
   */
  notifyConnectionListeners(address: string | null): void {
    for (const listener of this.connectionListeners) {
      listener(address);
    }
  }

  /**
   * Notify all balance listeners about balance changes
   */
  notifyBalanceListeners(balance: number): void {
    for (const listener of this.balanceListeners) {
      listener(balance);
    }
  }

  /**
   * Check if wallet is connected - defers to AWK
   */
  isConnected(): boolean {
    // This will be handled by useConnection hook from AWK
    return false;
  }

  /**
   * Format an address for display
   */
  formatAddress(address: string = ""): string {
    if (!address) return "";
    if (address.length <= 13) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Get wallet info (stub)
   * This is a compatibility method - actual data comes from AWK hooks
   */
  getWalletInfo(): WalletInfo {
    return {
      address: "",
      balance: 0,
      network: "testnet"
    };
  }

  /**
   * Get current address (stub)
   * This is a compatibility method - actual data comes from AWK hooks
   */
  getAddress(): string | null {
    return null;
  }

  /**
   * Get network (stub)
   * This is a compatibility method - actual data comes from AWK hooks
   */
  getNetwork(): "testnet" | "mainnet" {
    return "testnet";
  }
}

// Keep a singleton instance for backward compatibility
export const arweaveWallet = new ArweaveWallet();

// Remove the window typings for the old implementation
// This is handled by AWK now











