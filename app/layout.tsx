
import type React from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"
import "./globals.css"
import { AppLoader } from "@/components/ui/app-loader"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ChronoClash: The Arena of Echoes",
  description: "A turn-based PvP strategy game where time-warped warriors battle for dominance",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://unpkg.com/wander-inject@latest/dist/widget-script.min.js" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AppLoader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}