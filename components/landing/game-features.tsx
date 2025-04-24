import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sword, Shield, Coins, Clock } from "lucide-react"

export function GameFeatures() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center mb-12 text-cyan-400">Game Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard
          icon={<Sword className="h-10 w-10 text-cyan-500" />}
          title="Strategic Combat"
          description="Command 4 unique time warriors with special abilities that unlock after multiple uses."
        />
        <FeatureCard
          icon={<Shield className="h-10 w-10 text-purple-500" />}
          title="Permanent Records"
          description="All game states and moves are permanently stored on Arweave's permaweb."
        />
        <FeatureCard
          icon={<Coins className="h-10 w-10 text-amber-500" />}
          title="Token Wagering"
          description="Stake tokens on matches and claim the prize pool upon victory."
        />
        <FeatureCard
          icon={<Clock className="h-10 w-10 text-emerald-500" />}
          title="Time Mechanics"
          description="Cards have cooldown periods after use, adding depth to your strategy."
        />
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="mb-2">{icon}</div>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-300">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
