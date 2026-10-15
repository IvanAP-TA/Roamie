import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AttributionText } from './Attribution'

/** The credits popover itself, loaded by AttributionChip on the first tap and opened right away. */
export default function AttributionPopover({ raw, trigger }: { raw: string; trigger: React.ReactElement }) {
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }
  return (
    <Popover defaultOpen>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent onClick={stop} className="space-y-1">
        <AttributionText raw={raw} />
      </PopoverContent>
    </Popover>
  )
}
