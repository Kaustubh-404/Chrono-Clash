// components/ui/loading-screen.tsx
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  message?: string
  subMessage?: string
  showProgress?: boolean
  progress?: number
  animation?: "fade" | "slide" | "zoom"
  delay?: number
  className?: string
}

export function LoadingScreen({
  message = "Loading...",
  subMessage,
  showProgress = false,
  progress = 0,
  animation = "fade",
  delay = 0,
  className
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(delay === 0)
  
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])
  
  if (!visible) return null
  
  const animationClasses = {
    fade: "animate-in fade-in duration-500",
    slide: "animate-in slide-in-from-bottom-10 fade-in duration-500",
    zoom: "animate-in zoom-in-90 fade-in duration-500"
  }
  
  return (
    <div 
      className={cn(
        "fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50",
        animationClasses[animation],
        className
      )}
    >
      <div className="text-center max-w-md mx-auto p-6">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-cyan-500" />
        
        <h2 className="text-2xl font-bold text-white mb-2">{message}</h2>
        
        {subMessage && (
          <p className="text-gray-300 mb-4">{subMessage}</p>
        )}
        
        {showProgress && (
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-cyan-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  )
}
