import { motion } from 'framer-motion'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { LogoMark } from '@/components/brand/Logo'

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <AuroraBackground />
      <motion.div
        animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <LogoMark className="size-16" />
      </motion.div>
    </div>
  )
}
