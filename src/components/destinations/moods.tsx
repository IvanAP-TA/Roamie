import { Baby, Heart, Landmark, Martini, Mountain, TreePalm, Trees, Wine, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BudgetLevel, Mood } from '@/lib/types'
import { cn } from '@/lib/utils'

export const MOOD_META: Record<Mood, { icon: LucideIcon; tint: string }> = {
  adventure: { icon: Mountain, tint: 'text-[#b4532a] dark:text-[#ff9a6b]' },
  relax: { icon: TreePalm, tint: 'text-[#2f7a78] dark:text-[#7fd1c9]' },
  nightlife: { icon: Martini, tint: 'text-[#7a3f8f] dark:text-[#d59cf0]' },
  culture: { icon: Landmark, tint: 'text-[#8a5a1c] dark:text-[#f2c27a]' },
  nature: { icon: Trees, tint: 'text-[#3f7a4c] dark:text-[#8fd19e]' },
  food_wine: { icon: Wine, tint: 'text-[#9b2f45] dark:text-[#ff8fa6]' },
  family: { icon: Baby, tint: 'text-[#3d63a0] dark:text-[#9dbcf2]' },
  romantic: { icon: Heart, tint: 'text-[#c23b5b] dark:text-[#ff8fae]' },
}

export function MoodTag({ mood, className, iconOnly }: { mood: Mood; className?: string; iconOnly?: boolean }) {
  const { t } = useTranslation()
  const { icon: Icon, tint } = MOOD_META[mood]
  return (
    <span
      title={t(`moods.${mood}`)}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-foreground/[0.05] text-xs font-medium',
        iconOnly ? 'w-7 justify-center' : 'px-2.5',
        className,
      )}
    >
      <Icon className={cn('size-3.5', tint)} />
      {!iconOnly && t(`moods.${mood}`)}
    </span>
  )
}

export function BudgetIndicator({ level, className, showLabel }: { level: BudgetLevel | null; className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  if (!level) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={t(`budget.${level}`)}>
      <span className="font-semibold tracking-tight">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= level ? 'text-foreground' : 'text-foreground/20'}>
            €
          </span>
        ))}
      </span>
      {showLabel && <span className="text-sm text-muted-foreground">{t(`budget.${level}`)}</span>}
    </span>
  )
}
