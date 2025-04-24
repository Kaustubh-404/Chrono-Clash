// components/game/transition-manager.tsx
import { useState, useEffect, ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface TransitionManagerProps {
  children: ReactNode
  isVisible: boolean
  duration?: number
  transition?: "fade" | "slide" | "scale" | "none"
  onExitComplete?: () => void
}

export function TransitionManager({
  children,
  isVisible,
  duration = 300,
  transition = "fade",
  onExitComplete
}: TransitionManagerProps) {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -20, opacity: 0 }
    },
    scale: {
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 }
    },
    none: {
      initial: {},
      animate: {},
      exit: {}
    }
  }
  
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isVisible && (
        <motion.div
          initial={variants[transition].initial}
          animate={variants[transition].animate}
          exit={variants[transition].exit}
          transition={{ duration: duration / 1000 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}