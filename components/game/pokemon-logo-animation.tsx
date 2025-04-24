// components/game/pokemon-logo-animation.tsx
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface PokemonLogoAnimationProps {
  text: string
  color?: string
  delay?: number
  duration?: number
  onAnimationComplete?: () => void
}

export function PokemonLogoAnimation({
  text,
  color = 'text-yellow-400',
  delay = 50,
  duration = 3000,
  onAnimationComplete
}: PokemonLogoAnimationProps) {
  const [visibleChars, setVisibleChars] = useState<number[]>([])
  const [isGlowing, setIsGlowing] = useState(false)
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    // Reset animation state
    setVisibleChars([])
    setIsGlowing(false)
    setIsShaking(false)
    
    // Split animation into stages
    
    // Stage 1: Reveal characters one by one
    const charAppearance = text.split('').map((_, index) => {
      return setTimeout(() => {
        setVisibleChars(prev => [...prev, index])
      }, delay * index)
    })
    
    // Stage 2: Start glowing after all characters appear
    const glowTimer = setTimeout(() => {
      setIsGlowing(true)
    }, delay * text.length + 200)
    
    // Stage 3: Shake effect
    const shakeTimer = setTimeout(() => {
      setIsShaking(true)
    }, delay * text.length + 400)
    
    // Stage 4: Call completion callback
    const completionTimer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete()
      }
    }, duration)
    
    // Clean up all timers
    return () => {
      charAppearance.forEach(clearTimeout)
      clearTimeout(glowTimer)
      clearTimeout(shakeTimer)
      clearTimeout(completionTimer)
    }
  }, [text, delay, duration, onAnimationComplete])

  return (
    <div className="font-bold text-center relative overflow-hidden">
      <div 
        className={cn(
          "text-3xl tracking-wider transition-all duration-300 relative z-10",
          isShaking && "animate-[shake_0.5s_ease-in-out]",
          color
        )}
        style={{
          textShadow: isGlowing 
            ? `0 0 5px #fff, 0 0 10px #fff, 0 0 15px ${color === 'text-yellow-400' ? '#FFD700' : '#00BFFF'}, 0 0 20px ${color === 'text-yellow-400' ? '#FFD700' : '#00BFFF'}`
            : 'none'
        }}
      >
        {text.split('').map((char, index) => (
          <span 
            key={index} 
            className={cn(
              "inline-block transition-all duration-300",
              visibleChars.includes(index) 
                ? "opacity-100 transform-none" 
                : "opacity-0 translate-y-8"
            )}
            style={{ 
              transitionDelay: `${index * 30}ms`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
      {isGlowing && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
      )}
    </div>
  )
}