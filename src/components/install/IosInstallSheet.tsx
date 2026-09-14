import { Download, Share, SquarePlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/sheet'

/** The "Add to Home Screen" steps for iPhone. Its own chunk: the sheet library isn't needed on the landing page until then. */
export default function IosInstallSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('install.iosTitle')} description={t('install.iosBody')}>
      <ol className="space-y-3 pb-2">
        {[
          { icon: Share, text: t('install.iosStep1') },
          { icon: SquarePlus, text: t('install.iosStep2') },
          { icon: Download, text: t('install.iosStep3') },
        ].map(({ icon: Icon, text }, index) => (
          <li key={index} className="flex items-center gap-3 rounded-[1.25rem] bg-foreground/[0.04] p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
            <span className="text-sm">
              <span className="mr-1 font-semibold">{index + 1}.</span>
              {text}
            </span>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
