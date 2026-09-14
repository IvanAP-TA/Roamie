import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSeo } from '@/hooks/useSeo'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Scene } from '@/components/brand/Scene'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  useSeo('notFound')
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <AuroraBackground />
      <PageTransition className="w-full max-w-xs text-center">
        <div className="mx-auto w-56 -rotate-3 rounded-[1.6rem] bg-paper p-2 shadow-lift">
          <Scene seed="nowhere" className="aspect-[4/3] rounded-[1.2rem]">
            <Compass className="size-12 text-white/90 drop-shadow" />
          </Scene>
          <p className="py-2 font-display text-lg italic">404</p>
        </div>
        <h1 className="mt-8 text-3xl">{t('notFound.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('notFound.body')}</p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/">{t('notFound.cta')}</Link>
        </Button>
      </PageTransition>
    </div>
  )
}
