import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/sheet'
import { LegalContent, type LegalDoc } from './LegalContent'

/** The legal texts in a sheet; loaded only when someone opens them from the footer. */
export default function LegalSheet({ doc, open, onOpenChange }: { doc: LegalDoc; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t(`legal.${doc}.title`)}>
      <LegalContent doc={doc} />
    </Sheet>
  )
}
