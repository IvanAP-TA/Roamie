import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { LogoMark } from '@/components/brand/Logo'

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <AuroraBackground />
      <div className="animate-breathe">
        <LogoMark className="size-16" />
      </div>
    </div>
  )
}
