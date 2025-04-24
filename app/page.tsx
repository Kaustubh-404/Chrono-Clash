'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/landing/hero-section"
import { GameFeatures } from "@/components/landing/game-features"
import { CharacterShowcase } from "@/components/landing/character-showcase"
import { Footer } from "@/components/landing/footer"
import { useState, useEffect } from "react"
import { TransitionManager } from "@/components/game/transition-manager"

export default function Home() {

  const [isPageVisible, setIsPageVisible] = useState(false)
  
  useEffect(() => {
    setIsPageVisible(true)
    
    // Trigger app loaded event
    window.dispatchEvent(new Event('app-loaded'))
  }, [])

  return (
    <TransitionManager isVisible={isPageVisible} transition="fade" duration={500}>
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <HeroSection />
      <GameFeatures />
      <CharacterShowcase />
      <div className="container mx-auto py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Enter the Arena?</h2>
        <div className="flex justify-center gap-4">
          <Link href="/create-room">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700">
              Create Room
            </Button>
          </Link>
          <Link href="/join-room">
            <Button size="lg" variant="outline" className="border-cyan-600 text-cyan-500 hover:bg-cyan-950">
              Join Room
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </main>
    </TransitionManager>
  )
}
