// components/game/battle-attack-animation.tsx
import { useEffect, useRef } from "react"
import { BattleAnimation } from "@/lib/types"

interface BattleAttackAnimationProps {
  animation: BattleAnimation
  animationType: string // "attack", "damage", "special", etc.
}

export function BattleAttackAnimation({ animation, animationType }: BattleAttackAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Set canvas size to match container
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    
    // Animation properties based on type
    if (animationType === "attack") {
      drawAttackAnimation(ctx, animation)
    } else if (animationType === "special") {
      drawSpecialAttackAnimation(ctx, animation)
    } else if (animationType === "damage") {
      drawDamageAnimation(ctx, animation)
    }
    
    return () => {
      // Cleanup
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [animation, animationType])
  
  // Standard attack animation
  const drawAttackAnimation = (ctx: CanvasRenderingContext2D, animation: BattleAnimation) => {
    if (!animation.source || !animation.target) return
    
    const source = animation.source.position
    const target = animation.target.position
    
    // Particle settings
    const particleCount = 25
    const particles: Particle[] = []
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(
        source.x, 
        source.y, 
        target.x, 
        target.y,
        "regular",
        Math.random() * 3 + 2, // size
        Math.random() * 0.6 + 0.4, // speed multiplier
        `hsl(200, 100%, ${50 + Math.random() * 30}%)` // blue colors
      ))
    }
    
    // Animation loop
    let animationFrame: number
    const animate = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      
      let allComplete = true
      for (const particle of particles) {
        particle.update()
        particle.draw(ctx)
        
        if (!particle.complete) {
          allComplete = false
        }
      }
      
      if (!allComplete) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animate()
    
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }
  
  // Special attack animation
  const drawSpecialAttackAnimation = (ctx: CanvasRenderingContext2D, animation: BattleAnimation) => {
    if (!animation.source || !animation.target) return
    
    const source = animation.source.position
    const target = animation.target.position
    
    // Particle settings - more particles and variation for special
    const particleCount = 60
    const particles: Particle[] = []
    
    // Explosion at source
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 / 20) * i
      const distance = 30
      particles.push(new Particle(
        source.x, 
        source.y, 
        source.x + Math.cos(angle) * distance,
        source.y + Math.sin(angle) * distance,
        "explosion",
        Math.random() * 5 + 3, // size
        Math.random() * 0.3 + 0.2, // speed multiplier
        `hsl(${30 + Math.random() * 30}, 100%, 60%)` // yellow-orange colors
      ))
    }
    
    // Stream towards target
    for (let i = 0; i < particleCount - 20; i++) {
      particles.push(new Particle(
        source.x, 
        source.y, 
        target.x, 
        target.y,
        "special",
        Math.random() * 4 + 3, // size
        Math.random() * 0.7 + 0.4, // speed multiplier
        `hsl(${45 + Math.random() * 30}, 100%, ${60 + Math.random() * 30}%)` // gold-yellow colors
      ))
    }
    
    // Animation loop
    let animationFrame: number
    const animate = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      
      let allComplete = true
      for (const particle of particles) {
        particle.update()
        particle.draw(ctx)
        
        if (!particle.complete) {
          allComplete = false
        }
      }
      
      if (!allComplete) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animate()
    
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }
  
  // Damage animation
  const drawDamageAnimation = (ctx: CanvasRenderingContext2D, animation: BattleAnimation) => {
    if (!animation.target) return
    
    const target = animation.target.position
    const damage = animation.damage || 10
    
    // Damage number
    const damageText = {
      value: damage.toString(),
      x: target.x,
      y: target.y - 20,
      alpha: 1,
      size: Math.min(24 + damage / 2, 36), // Bigger number for more damage
      complete: false
    }
    
    // Impact particles
    const particleCount = Math.min(20 + damage / 2, 30)
    const particles: ImpactParticle[] = []
    
    // Create explosion particles
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 3 + 2
      const size = Math.random() * 4 + 2
      
      particles.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        alpha: 1,
        color: `hsl(0, 100%, ${70 + Math.random() * 30}%)`, // red colors
        complete: false
      })
    }
    
    // Animation loop
    let animationFrame: number
    const animate = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      
      // Update and draw damage text
      if (!damageText.complete) {
        damageText.y -= 1
        damageText.alpha -= 0.015
        
        if (damageText.alpha <= 0) {
          damageText.complete = true
        } else {
          ctx.font = `bold ${damageText.size}px Arial`
          ctx.fillStyle = `rgba(255, 50, 50, ${damageText.alpha})`
          ctx.strokeStyle = `rgba(255, 255, 255, ${damageText.alpha})`
          ctx.lineWidth = 3
          ctx.textAlign = 'center'
          ctx.strokeText(damageText.value, damageText.x, damageText.y)
          ctx.fillText(damageText.value, damageText.x, damageText.y)
        }
      }
      
      // Update and draw particles
      let allParticlesComplete = true
      for (const particle of particles) {
        if (particle.complete) continue
        
        particle.x += particle.vx
        particle.y += particle.vy
        particle.alpha -= 0.03
        particle.size *= 0.95
        
        if (particle.alpha <= 0 || particle.size <= 0.5) {
          particle.complete = true
        } else {
          ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`)
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          
          allParticlesComplete = false
        }
      }
      
      if (!damageText.complete || !allParticlesComplete) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animate()
    
    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}

// Particle for attack animations
class Particle {
  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private size: number
  private speed: number
  private color: string
  private type: string
  private progress: number = 0
  private angle: number
  private tailPoints: {x: number, y: number, size: number, alpha: number}[] = []
  public complete: boolean = false
  
  constructor(
    startX: number, 
    startY: number, 
    targetX: number, 
    targetY: number, 
    type: string = "regular",
    size: number = 3,
    speedMultiplier: number = 0.5,
    color: string = "hsl(200, 100%, 70%)"
  ) {
    this.x = startX
    this.y = startY
    this.targetX = targetX
    this.targetY = targetY
    this.type = type
    this.size = size
    this.speed = 0.02 * speedMultiplier
    this.color = color
    this.angle = Math.atan2(targetY - startY, targetX - startX)
    
    // Add jitter to trajectory if it's a special attack
    if (type === "special") {
      const jitterAmount = 30
      this.targetX += (Math.random() - 0.5) * jitterAmount
      this.targetY += (Math.random() - 0.5) * jitterAmount
    }
    
    // Explosion particles don't follow a direct path
    if (type === "explosion") {
      this.speed = 0.05 * speedMultiplier
    }
  }
  
  update() {
    if (this.complete) return
    
    // Update progress
    this.progress += this.speed
    
    // Save current position to trail
    if (this.progress > 0.1 && (this.type === "special" || this.type === "regular")) {
      this.tailPoints.push({
        x: this.x,
        y: this.y,
        size: this.size * 0.8,
        alpha: 0.7
      })
      
      // Limit trail length
      if (this.tailPoints.length > (this.type === "special" ? 8 : 5)) {
        this.tailPoints.shift()
      }
      
      // Reduce alpha of all trail points
      this.tailPoints.forEach(point => {
        point.alpha *= 0.92
      })
    }
    
    // Calculate position based on animation type
    if (this.type === "explosion") {
      // Explosion particles travel outward in straight lines
      const distance = this.progress * 100
      this.x = this.x + Math.cos(this.angle) * distance * this.speed * 10
      this.y = this.y + Math.sin(this.angle) * distance * this.speed * 10
      
      if (this.progress >= 1) {
        this.complete = true
      }
    } else {
      // Attack particles follow a path with easing
      const easedProgress = this.progress < 0.5 
        ? 2 * this.progress * this.progress 
        : 1 - Math.pow(-2 * this.progress + 2, 2) / 2
      
      this.x = this.x + (this.targetX - this.x) * easedProgress * this.speed * 10
      this.y = this.y + (this.targetY - this.y) * easedProgress * this.speed * 10
      
      // Add some wobble for special attacks
      if (this.type === "special") {
        const wobbleAmount = Math.sin(this.progress * 10) * 3
        this.x += Math.cos(this.angle + Math.PI/2) * wobbleAmount
        this.y += Math.sin(this.angle + Math.PI/2) * wobbleAmount
      }
      
      // Check if we've reached the target
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const distanceToTarget = Math.sqrt(dx*dx + dy*dy)
      
      if (distanceToTarget < 5 || this.progress >= 1) {
        this.complete = true
      }
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    // Draw trail
    if (this.tailPoints.length > 0) {
      this.tailPoints.forEach((point, index) => {
        ctx.globalAlpha = point.alpha
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.size * ((index + 1) / this.tailPoints.length), 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      })
    }
    
    // Draw particle
    ctx.globalAlpha = 1
    ctx.beginPath()
    
    if (this.type === "special") {
      // Star shape for special attack
      this.drawStar(ctx)
    } else {
      // Circle for regular attacks
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.fill()
      
      // Glow effect
      ctx.shadowBlur = this.type === "explosion" ? 10 : 5
      ctx.shadowColor = this.color
    }
    
    // Reset shadow
    ctx.shadowBlur = 0
  }
  
  drawStar(ctx: CanvasRenderingContext2D) {
    const spikes = 5
    const outerRadius = this.size
    const innerRadius = this.size / 2
    const rotation = this.progress * Math.PI * 4
    
    ctx.beginPath()
    
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = rotation + (Math.PI / spikes) * i
      const x = this.x + radius * Math.cos(angle)
      const y = this.y + radius * Math.sin(angle)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.closePath()
    
    // Glow effect for special attacks
    ctx.shadowBlur = 10
    ctx.shadowColor = this.color
    
    // Fill the star
    ctx.fillStyle = this.color
    ctx.fill()
    
    // Add a white center for extra glow
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size / 3, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
  }
}

// Simple particle for impact animations
interface ImpactParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
  complete: boolean
}