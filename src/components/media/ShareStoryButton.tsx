import { useEffect, useState, type ComponentProps } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { canNativeShare } from '@/lib/share'
import { Button } from '@/components/ui/button'

/**
 * Shares a story image made on the device: the system share sheet on phones (Instagram, WhatsApp…), a download on
 * computers. The image is drawn as soon as the button appears, so the tap opens the share sheet right away —
 * browsers only allow it straight after the tap.
 */
export function ShareStoryButton({
  render,
  fileName,
  title,
  variant = 'glass',
  className,
}: {
  render: () => Promise<Blob>
  fileName: string
  title: string
  variant?: ComponentProps<typeof Button>['variant']
  className?: string
}) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    render().then(
      (blob) => !cancelled && setFile(new File([blob], fileName, { type: 'image/png' })),
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
    // Drawn once: the moment being shared doesn't change while the button is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) return null

  const share = Boolean(file && canNativeShare() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }))

  const onClick = async () => {
    if (!file) return
    if (share) {
      try {
        await navigator.share({ files: [file], title })
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') toast.error(t('errors.generic'))
      }
      return
    }
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Button variant={variant} className={className} disabled={!file} onClick={() => void onClick()}>
      {!file ? <Loader2 className="animate-spin" /> : share ? <Share2 /> : <Download />}
      {share || !file ? t('story.share') : t('story.download')}
    </Button>
  )
}
