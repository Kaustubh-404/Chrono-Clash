// components/game/battle-victory-screen.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Trophy, Shield, Coins, Home, RotateCcw, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BattleVictoryScreenProps {
  isWinner: boolean
  wager: number
  onExit: () => void
  soundEnabled?: boolean
}

export function BattleVictoryScreen({ 
  isWinner, 
  wager, 
  onExit,
  soundEnabled = true 
}: BattleVictoryScreenProps) {
  const [showScreen, setShowScreen] = useState(false)
  const [animateText, setAnimateText] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  
  useEffect(() => {
    // Play victory or defeat sound
    if (soundEnabled) {
      const audio = new Audio(isWinner ? '/sounds/victory.mp3' : '/sounds/defeat.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log("Couldn't play sound", e))
    }
    
    // Animation sequence
    setTimeout(() => setShowScreen(true), 500)
    setTimeout(() => setAnimateText(true), 1000)
    setTimeout(() => setShowButtons(true), 2500)
  }, [isWinner, soundEnabled])
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'ChronoClash Battle Result',
        text: isWinner 
          ? `I just won ${wager * 2} AR tokens in ChronoClash!` 
          : 'I just had an epic battle in ChronoClash!',
        url: window.location.origin
      }).catch(err => console.log('Error sharing:', err))
    } else {
      // Fallback to clipboard copy
      const text = isWinner 
        ? `I just won ${wager * 2} AR tokens in ChronoClash!` 
        : 'I just had an epic battle in ChronoClash!'
      
      navigator.clipboard.writeText(text + ' ' + window.location.origin)
        .then(() => {
          // Show toast or some indication
          alert('Battle result copied to clipboard!')
        })
        .catch(err => console.log('Error copying:', err))
    }
  }
  
  // Pokemon-style confetti animation
  useEffect(() => {
    if (!showScreen || !isWinner) return
    
    // Create confetti canvas
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '100'
    document.body.appendChild(canvas)
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      document.body.removeChild(canvas)
      return
    }
    
    // Confetti settings
    const confettiCount = 100
    const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590']
    const shapes = ['circle', 'square', 'triangle']
    const gravity = 0.3
    const terminalVelocity = 5
    const drag = 0.075
    const confettis: Confetti[] = []
    
    // Create confetti particles
    for (let i = 0; i < confettiCount; i++) {
      confettis.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: Math.random() * 10 + 5,
        velocity: {
          x: Math.random() * 20 - 10,
          y: Math.random() * 10 + 3
        },
        rotationSpeed: Math.random() * 10 - 5
      })
    }
    
    // Animation loop
    let animationId: number
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      let allSettled = true
      
      for (const confetti of confettis) {
        // Apply gravity
        confetti.velocity.y = Math.min(confetti.velocity.y + gravity, terminalVelocity)
        confetti.velocity.x *= (1 - drag)
        
        // Update position
        confetti.x += confetti.velocity.x
        confetti.y += confetti.velocity.y
        confetti.rotation += confetti.rotationSpeed
        
        // Check if particle is settled
        if (confetti.y < canvas.height + 100) {
          allSettled = false
        }
        
        // Draw confetti
        ctx.save()
        ctx.translate(confetti.x, confetti.y)
        ctx.rotate(confetti.rotation * Math.PI / 180)
        ctx.fillStyle = confetti.color
        
        if (confetti.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, confetti.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (confetti.shape === 'square') {
          ctx.fillRect(-confetti.size / 2, -confetti.size / 2, confetti.size, confetti.size)
        } else if (confetti.shape === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(0, -confetti.size / 2)
          ctx.lineTo(confetti.size / 2, confetti.size / 2)
          ctx.lineTo(-confetti.size / 2, confetti.size / 2)
          ctx.closePath()
          ctx.fill()
        }
        
        ctx.restore()
      }
      
      if (!allSettled) {
        animationId = requestAnimationFrame(animate)
      } else {
        document.body.removeChild(canvas)
      }
    }
    
    animate()
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas)
      }
    }
  }, [showScreen, isWinner])
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity duration-500",
        showScreen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="relative w-full max-w-lg">
        {/* Pokemon-style battle result screen */}
        <div 
          className={cn(
            "bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-6 text-center transform transition-all duration-500",
            showScreen ? "scale-100" : "scale-90"
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            {/* Victory/Defeat decorative elements */}
            <div className="absolute inset-0 opacity-10">
              {isWinner ? (
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600"></div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600"></div>
              )}
            </div>
            
            {/* Radial light effect */}
            <div className="absolute inset-0 bg-radial-gradient opacity-20"></div>
            
            {/* Moving background stars/particles for Pokemon effect */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 50 }).map((_, i) => (
                <div 
                  key={i}
                  className="absolute rounded-full bg-white animate-float-slow"
                  style={{
                    width: `${Math.random() * 3 + 1}px`,
                    height: `${Math.random() * 3 + 1}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 10 + 10}s`,
                    animationDelay: `${Math.random() * 10}s`,
                    opacity: Math.random() * 0.5 + 0.2
                  }}
                ></div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-full mb-6 flex items-center justify-center">
              {isWinner ? (
                <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-5 rounded-full">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-full">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            
            {/* Result Text with Pokemon-style animation */}
            <h2 
              className={cn(
                "text-4xl font-bold mb-3 transition-all duration-700",
                animateText ? "opacity-100" : "opacity-0 translate-y-4",
                isWinner ? "text-amber-400" : "text-blue-400"
              )}
            >
              {isWinner ? "Victory!" : "Defeat!"}
            </h2>
            
            <p 
              className={cn(
                "text-gray-300 mb-6 transition-all duration-700 delay-200",
                animateText ? "opacity-100" : "opacity-0 translate-y-4"
              )}
            >
              {isWinner 
                ? "Congratulations! You've emerged victorious in the Arena of Echoes." 
                : "Your time warriors fought valiantly, but fortune favored your opponent."}
            </p>
            
            {/* Prize display for winner */}
            {isWinner && (
              <div 
                className={cn(
                  "bg-gradient-to-r from-amber-900/30 to-amber-700/30 p-4 rounded-lg border border-amber-600/50 mb-6 transition-all duration-700 delay-400",
                  animateText ? "opacity-100" : "opacity-0 scale-95"
                )}
              >
                <div className="flex items-center justify-center gap-3">
                  <Coins className="h-6 w-6 text-amber-400" />
                  <span className="text-amber-300">Reward Claimed:</span>
                </div>
                <div className="text-4xl font-bold text-amber-400 mt-2">
                  {wager * 2} AR
                </div>
                <div className="text-xs text-amber-200/70 mt-1">
                  Tokens have been transferred to your wallet
                </div>
              </div>
            )}
            
            {/* Better luck message for loser */}
            {!isWinner && (
              <div 
                className={cn(
                  "bg-gradient-to-r from-blue-900/30 to-blue-700/30 p-4 rounded-lg border border-blue-600/50 mb-6 transition-all duration-700 delay-400",
                  animateText ? "opacity-100" : "opacity-0 scale-95"
                )}
              >
                <div className="text-blue-300 mb-2">Next time fortune may favor you.</div>
                <div className="text-sm text-blue-200/70">
                  Your wager of {wager} AR has been claimed by the victor.
                </div>
              </div>
            )}
            
            {/* Action buttons */}
            <div 
              className={cn(
                "grid grid-cols-3 gap-3 transition-all duration-500 delay-700",
                showButtons ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              )}
            >
              <Button 
                variant="outline" 
                className={cn(
                  "border",
                  isWinner ? "border-amber-500/50 text-amber-400" : "border-blue-500/50 text-blue-400"
                )}
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button 
                variant="outline" 
                className={cn(
                  "border",
                  isWinner ? "border-amber-500/50 text-amber-400" : "border-blue-500/50 text-blue-400"
                )}
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Rematch
              </Button>
              
              <Button 
                className={cn(
                  isWinner ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={onExit}
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Type for confetti particles
interface Confetti {
  x: number
  y: number
  rotation: number
  color: string
  shape: string
  size: number
  velocity: {
    x: number
    y: number
  }
  rotationSpeed: number
}
