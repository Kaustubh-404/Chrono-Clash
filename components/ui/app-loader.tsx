'use client'

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

const APP_LOADING_DELAY = 1000 // 1 second delay to avoid flash for quick loads

export function AppLoader() {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoved, setIsRemoved] = useState(true)
  
  useEffect(() => {
    let timer1: NodeJS.Timeout
    let timer2: NodeJS.Timeout
    
    // Show loader after delay
    timer1 = setTimeout(() => {
      setIsVisible(true)
      setIsRemoved(false)
    }, 100)
    
    // Track app loading state
    const handleAppLoaded = () => {
      setIsVisible(false)
      
      // Remove from DOM after animation
      timer2 = setTimeout(() => {
        setIsRemoved(true)
      }, 500)
    }
    
    // Listen for app loaded event
    window.addEventListener('app-loaded', handleAppLoaded)
    
    // Create custom event
    if (document.readyState === 'complete') {
      window.dispatchEvent(new Event('app-loaded'))
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.dispatchEvent(new Event('app-loaded'))
        }, APP_LOADING_DELAY)
      })
    }
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('app-loaded', handleAppLoaded)
    }
  }, [])
  
  if (isRemoved) return null
  
  return (
    <div 
      className={`fixed inset-0 bg-gray-900 z-[9999] flex items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-center">
        <div className="relative">
          <img 
            src="/images/logo.svg" 
            alt="ChronoClash" 
            className="w-48 mx-auto mb-8 animate-pulse" 
          />
          <Loader2 className="h-6 w-6 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-cyan-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">ChronoClash</h1>
        <p className="text-gray-400">Loading the Arena of Echoes</p>
      </div>
    </div>
  )
}