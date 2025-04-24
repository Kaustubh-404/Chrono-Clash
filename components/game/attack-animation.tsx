"use client"

import { useEffect, useRef } from "react"

interface AttackAnimationProps {
  type: "normal" | "special"
  sourcePosition: { x: number; y: number }
  targetPosition: { x: number; y: number }
  onComplete: () => void
}

export function AttackAnimation({ type, sourcePosition, targetPosition, onComplete }: AttackAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match window
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Animation properties
    const particleCount = type === "special" ? 50 : 20
    const particles: Particle[] = []

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(sourcePosition.x, sourcePosition.y, targetPosition.x, targetPosition.y, type))
    }

    // Animation loop
    let animationFrame: number
    let completed = false

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let allComplete = true

      for (const particle of particles) {
        particle.update()
        particle.draw(ctx)

        if (!particle.isComplete()) {
          allComplete = false
        }
      }

      if (allComplete && !completed) {
        completed = true
        setTimeout(() => {
          onComplete()
        }, 200)
      } else if (!completed) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [sourcePosition, targetPosition, type, onComplete])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
}

class Particle {
  private x: number
  private y: number
  private targetX: number
  private targetY: number
  private size: number
  private speed: number
  private progress = 0
  private color: string
  private type: "normal" | "special"
  private angle: number
  private wobble: number

  constructor(startX: number, startY: number, targetX: number, targetY: number, type: "normal" | "special") {
    this.x = startX
    this.y = startY
    this.targetX = targetX
    this.targetY = targetY
    this.type = type

    // Random properties
    this.size = Math.random() * (type === "special" ? 8 : 4) + 2
    this.speed = Math.random() * 0.03 + 0.02
    this.angle = Math.random() * Math.PI * 2
    this.wobble = Math.random() * 40

    // Color based on type
    if (type === "special") {
      const hue = Math.floor(Math.random() * 60) + 30 // Gold/yellow range
      this.color = `hsl(${hue}, 100%, 50%)`
    } else {
      const hue = Math.floor(Math.random() * 180) + 180 // Cyan/blue range
      this.color = `hsl(${hue}, 100%, 70%)`
    }
  }

  update() {
    if (this.progress < 1) {
      this.progress += this.speed

      // Ease-in-out function
      const easeProgress =
        this.progress < 0.5 ? 2 * this.progress * this.progress : 1 - Math.pow(-2 * this.progress + 2, 2) / 2

      // Linear interpolation with wobble
      this.x = this.startX() + (this.targetX - this.startX()) * easeProgress
      this.y = this.startY() + (this.targetY - this.startY()) * easeProgress

      // Add wobble effect
      if (this.type === "special") {
        this.x += Math.sin(this.progress * 10 + this.angle) * this.wobble * (1 - easeProgress)
        this.y += Math.cos(this.progress * 10 + this.angle) * this.wobble * (1 - easeProgress)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()

    if (this.type === "special") {
      // Star shape for special attack
      const spikes = 5
      const outerRadius = this.size
      const innerRadius = this.size / 2

      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (Math.PI / spikes) * i

        if (i === 0) {
          ctx.moveTo(this.x + radius * Math.cos(angle), this.y + radius * Math.sin(angle))
        } else {
          ctx.lineTo(this.x + radius * Math.cos(angle), this.y + radius * Math.sin(angle))
        }
      }

      ctx.closePath()
      ctx.fillStyle = this.color
      ctx.fill()

      // Glow effect
      ctx.shadowBlur = 15
      ctx.shadowColor = this.color
    } else {
      // Circle for normal attack
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      ctx.fillStyle = this.color
      ctx.fill()

      // Glow effect
      ctx.shadowBlur = 10
      ctx.shadowColor = this.color
    }

    // Trail effect
    if (this.progress > 0.1 && this.progress < 0.9) {
      const trailLength = this.type === "special" ? 5 : 3
      for (let i = 1; i <= trailLength; i++) {
        const trailProgress = Math.max(0, this.progress - i * 0.05)
        const trailEase =
          trailProgress < 0.5 ? 2 * trailProgress * trailProgress : 1 - Math.pow(-2 * trailProgress + 2, 2) / 2

        const trailX = this.startX() + (this.targetX - this.startX()) * trailEase
        const trailY = this.startY() + (this.targetY - this.startY()) * trailEase

        ctx.beginPath()
        ctx.arc(trailX, trailY, this.size * (1 - i / (trailLength + 1)), 0, Math.PI * 2)
        ctx.fillStyle = `${this.color}${Math.floor(80 / i)}`
        ctx.fill()
      }
    }
  }

  isComplete() {
    return this.progress >= 1
  }

  private startX() {
    return this.x + Math.sin(this.angle) * 10
  }

  private startY() {
    return this.y + Math.cos(this.angle) * 10
  }
}
