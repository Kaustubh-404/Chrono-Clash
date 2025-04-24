import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920')] bg-cover bg-center opacity-20"></div>
      <div className="container mx-auto px-4 py-32 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600">
            ChronoClash: The Arena of Echoes
          </h1>
          <p className="text-xl mb-8 text-gray-300">
            Command time-warped warriors in strategic battles across fractured timelines. Wage tokens, outmaneuver
            opponents, and claim victory in the Arena of Echoes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/create-room">
              <Button size="lg" className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700">
                Create Room
              </Button>
            </Link>
            <Link href="/join-room">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-cyan-600 text-cyan-500 hover:bg-cyan-950"
              >
                Join Room
              </Button>
            </Link>
          </div>
          <div className="mt-8 text-sm text-gray-400">
            Powered by Arweave & AO - All game states permanently stored on-chain
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-gray-900 to-transparent"></div>
    </div>
  )
}
