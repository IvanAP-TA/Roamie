import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { renderPassportCard, type PassportCardData } from '@/lib/passportCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'

const FILE_NAME = 'roamie-passport.png'

/** Preview of the story image, with the system share sheet (Instagram, WhatsApp…) or a download. */
export function PassportShareSheet({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: PassportCardData | null }) {
  const { t } = useTranslation()
  const [image, setImage] = useState<{ file: File; url: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open || !data) return
    let cancelled = false
    let url: string | null = null
    setImage(null)
    setFailed(false)
    renderPassportCard(data).then(
      (blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImage({ file: new File([blob], FILE_NAME, { type: 'image/png' }), url })
      },
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, data])

  const canShare = Boolean(image && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image.file] }))

  const share = async () => {
    if (!image) return
    try {
      await navigator.share({ files: [image.file], title: t('passport.shareTitle') })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') toast.error(t('errors.generic'))
    }
  }

  const download = () => {
    if (!image) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = FILE_NAME
    link.click()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('passport.shareTitle')} description={t('passport.shareHint')}>
      <div className="space-y-4 pb-2">
        <div className="mx-auto aspect-[9/16] w-full max-w-[16rem] overflow-hidden rounded-[1.5rem] shadow-lift">
          {image ? (
            <img src={image.url} alt={t('passport.imageAlt')} className="size-full object-cover" />
          ) : failed ? (
            <div className="flex size-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">{t('errors.generic')}</div>
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canShare && (
            <Button size="lg" className="flex-1" onClick={() => void share()}>
              <Share2 />
              {t('passport.share')}
            </Button>
          )}
          <Button size="lg" variant={canShare ? 'outline' : 'default'} className="flex-1" disabled={!image} onClick={download}>
            <Download />
            {t('passport.download')}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
