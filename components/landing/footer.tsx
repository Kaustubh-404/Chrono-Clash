import Link from "next/link"
import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">ChronoClash</h3>
            <p className="mb-4">
              A turn-based PvP strategy game built on Arweave and AO, where time-warped warriors battle for dominance.
            </p>
            <div className="flex items-center">
              <Link href="https://github.com" className="flex items-center hover:text-cyan-400">
                <Github className="h-5 w-5 mr-2" />
                GitHub
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="hover:text-cyan-400">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-cyan-400">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="https://arweave.org" className="hover:text-cyan-400">
                  Arweave
                </Link>
              </li>
              <li>
                <Link href="https://ao.xyz" className="hover:text-cyan-400">
                  AO Protocol
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Connect</h3>
            <ul className="space-y-2">
              <li>
                <Link href="https://discord.com" className="hover:text-cyan-400">
                  Discord
                </Link>
              </li>
              <li>
                <Link href="https://twitter.com" className="hover:text-cyan-400">
                  Twitter
                </Link>
              </li>
              <li>
                <Link href="https://t.me" className="hover:text-cyan-400">
                  Telegram
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-400">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p>&copy; {new Date().getFullYear()} ChronoClash. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
