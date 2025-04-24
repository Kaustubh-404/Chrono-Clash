// components/game/connection-manager.tsx
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react"
import { enhancedAoClient } from "@/lib/ao-client-enhanced" // Updated to enhanced client
import { arweaveWallet } from "@/lib/wallet"
import { useToast } from "@/hooks/use-toast"

export function ConnectionManager() {
  const [isConnected, setIsConnected] = useState<boolean>(true)
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false)
  const [showReconnectDialog, setShowReconnectDialog] = useState<boolean>(false)
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0)
  const [showOfflineWarning, setShowOfflineWarning] = useState<boolean>(false)
  const { toast } = useToast()

  // Setup listeners for connection changes
  useEffect(() => {
    const handleConnectionChange = () => {
      const online = navigator.onLine
      setIsConnected(online)
      
      if (!online && !showOfflineWarning) {
        setShowOfflineWarning(true)
        
        toast({
          title: "You're offline",
          description: "Game will continue when connection is restored",
          variant: "destructive",
        })
      } else if (online && showOfflineWarning) {
        setShowOfflineWarning(false)
        
        toast({
          title: "You're back online",
          description: "Reconnecting to game server...",
          variant: "default",
        })
        
        // Attempt to reconnect
        handleReconnect()
      }
    }

    // Add event listeners for online/offline
    window.addEventListener('online', handleConnectionChange)
    window.addEventListener('offline', handleConnectionChange)
    
    // Set initial connection state
    setIsConnected(navigator.onLine)
    
    // Also check AO gateway connection
    const aoConnectionCheck = enhancedAoClient.addEventListener('connection', (data) => {
      if (data.status === 'disconnected' && navigator.onLine) {
        // We're online but AO gateway is unreachable
        if (!showReconnectDialog) {
          setShowReconnectDialog(true)
        }
      } else if (data.status === 'connected') {
        setShowReconnectDialog(false)
        
        if (reconnectAttempts > 0) {
          toast({
            title: "Connection restored",
            description: "Game state has been synchronized",
            variant: "default",
          })
          setReconnectAttempts(0)
        }
      }
    })
    
    return () => {
      window.removeEventListener('online', handleConnectionChange)
      window.removeEventListener('offline', handleConnectionChange)
      aoConnectionCheck()
    }
  }, [showReconnectDialog, showOfflineWarning, reconnectAttempts, toast])
  
  // Handle manual reconnection attempts
  const handleReconnect = async () => {
    if (isCheckingConnection) return
    
    setIsCheckingConnection(true)
    setReconnectAttempts(prev => prev + 1)
    
    try {
      // Check if we're online
      if (!navigator.onLine) {
        toast({
          title: "Still offline",
          description: "Please check your internet connection",
          variant: "destructive",
        })
        return
      }
      
      // Try to reconnect wallet if needed
      if (!arweaveWallet.isConnected()) {
        await arweaveWallet.connect()
      }
      
      // Force game state sync for all active games
      const activeGames = enhancedAoClient.getActiveGames()
      let synced = false
      
      for (const game of activeGames) {
        try {
          // Try to sync each game
          const success = await enhancedAoClient.forceSyncGameState(game.matchId)
          if (success) {
            synced = true
          }
        } catch (error) {
          console.error(`Error syncing game ${game.matchId}:`, error)
        }
      }
      
      if (synced) {
        toast({
          title: "Connection restored",
          description: "Game state has been synchronized",
          variant: "default",
        })
        
        setShowReconnectDialog(false)
        // Reset reconnect attempts counter
        setReconnectAttempts(0)
      } else if (enhancedAoClient.isGatewayConnected()) {
        toast({
          title: "Partially reconnected",
          description: "Connection restored but some games may need manual refresh",
          variant: "default",
        })
        
        setShowReconnectDialog(false)
      } else {
        // Still not connected to AO
        toast({
          title: "Connection issue",
          description: "Could not reach the game server. Please try again later.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Reconnection error:", error)
      
      toast({
        title: "Reconnection failed",
        description: "Please try again or refresh the page",
        variant: "destructive",
      })
    } finally {
      setIsCheckingConnection(false)
    }
  }

  // If everything is connected, don't show anything
  if (isConnected && !showReconnectDialog) {
    return null
  }

  // Show offline warning badge
  return (
    <>
      <Badge 
        variant="destructive" 
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setShowReconnectDialog(true)}
      >
        {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>{isConnected ? "Connection issues" : "Offline"}</span>
      </Badge>
      
      <Dialog open={showReconnectDialog} onOpenChange={setShowReconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-amber-500" />
                  Connection Issues
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-500" />
                  You're Offline
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isConnected 
                ? "We're having trouble connecting to the game server." 
                : "Your internet connection appears to be offline."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-900/20 rounded-md p-4 text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Don't worry about your game!</p>
                <p>Your game state is safely stored and will be automatically synchronized when connection is restored.</p>
              </div>
            </div>
            
            <div className="text-sm space-y-2">
              <p className="font-medium">Troubleshooting steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Check your internet connection</li>
                <li>Try reconnecting to the game server</li>
                <li>Refresh the page if the issue persists</li>
                <li>Check if the Arweave gateway is operational</li>
              </ol>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              <Button 
                onClick={handleReconnect}
                disabled={isCheckingConnection || !isConnected}
                className="flex items-center gap-2"
              >
                {isCheckingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Reconnect
                  </>
                )}
              </Button>
            </div>
            
            {reconnectAttempts > 0 && (
              <div className="text-xs text-center text-gray-500">
                Reconnection attempts: {reconnectAttempts}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}




