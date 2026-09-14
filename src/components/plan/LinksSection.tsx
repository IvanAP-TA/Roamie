import { useEffect, useState } from 'react'
import { BedDouble, Check, ExternalLink, Link2, Loader2, MoreHorizontal, Pencil, Plane, Plus, Ticket, TrainFront, Trash2, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useLinkMutations, useTripLinks, type LinkInput } from '@/hooks/usePlan'
import { useTripContext } from '@/hooks/useTripContext'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { LINK_CATEGORIES, type LinkCategory, type TripLink } from '@/lib/types'

const CATEGORY_ICON: Record<LinkCategory, LucideIcon> = {
  flight: Plane,
  stay: BedDouble,
  ticket: Ticket,
  transport: TrainFront,
  other: Link2,
}

/** "booking.com/x" → "https://booking.com/x". Returns null when empty, undefined when not a valid http(s) URL. */
export function normalizeUrl(raw: string): string | null | undefined {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    // href is percent-encoded, which also satisfies the database rule (no spaces, quotes or brackets).
    return url.href.length <= 2048 ? url.href : undefined
  } catch {
    return undefined
  }
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function LinkFormSheet({
  open,
  onOpenChange,
  link,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  link?: TripLink
  busy: boolean
  onSubmit: (input: LinkInput) => void
}) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<LinkCategory>('other')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategory(link?.category ?? 'flight')
    setTitle(link?.title ?? '')
    setUrl(link?.url ?? '')
    setNote(link?.note ?? '')
    setTouched(false)
  }, [open, link])

  const normalized = normalizeUrl(url)
  const urlInvalid = normalized === undefined
  const valid = title.trim().length > 0 && !urlInvalid

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={link ? t('links.editTitle') : t('links.newTitle')}
      footer={
        <Button form="link-form" type="submit" size="lg" className="mb-1 w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {t('common.save')}
        </Button>
      }
    >
      <form
        id="link-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit({ category, title: title.trim(), url: normalized ?? null, note: note.trim() || null })
        }}
      >
        <div className="flex flex-wrap gap-2">
          {LINK_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c]
            return (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                <Icon />
                {t(`links.categories.${c}`)}
              </Chip>
            )
          })}
        </div>
        <div>
          <Label htmlFor="link-title">{t('links.title')}</Label>
          <Input id="link-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder={t('links.titlePlaceholder')} required />
        </div>
        <div>
          <Label htmlFor="link-url">{t('links.url')}</Label>
          <Input
            id="link-url"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="https://…"
            aria-invalid={touched && urlInvalid}
          />
          {touched && urlInvalid && <p className="mt-1.5 px-1 text-xs text-destructive">{t('links.urlInvalid')}</p>}
        </div>
        <div>
          <Label htmlFor="link-note">{t('links.note')}</Label>
          <Textarea id="link-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder={t('links.notePlaceholder')} />
        </div>
        <p className="px-1 text-xs text-muted-foreground">{t('links.privacyNote')}</p>
      </form>
    </Sheet>
  )
}

export function LinksSection() {
  const { t } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const { data: links, isLoading } = useTripLinks(trip.id)
  const m = useLinkMutations(trip.id)
  const [form, setForm] = useState<{ link?: TripLink } | null>(null)
  const [deleting, setDeleting] = useState<TripLink | null>(null)
  const onError = () => toast.error(t('errors.generic'))

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-20 rounded-[1.5rem]" />
      </div>
    )
  }

  const groups = LINK_CATEGORIES.map((category) => ({ category, items: links?.filter((l) => l.category === category) ?? [] })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-7">
      {groups.length === 0 ? (
        <EmptyState seed="links" icon={<Link2 />} title={t('links.emptyTitle')} body={t('links.emptyBody')}>
          {canEdit && (
            <Button size="lg" onClick={() => setForm({})}>
              <Plus />
              {t('links.add')}
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setForm({})}>
                <Plus />
                {t('links.add')}
              </Button>
            </div>
          )}
          {groups.map(({ category, items }) => {
            const Icon = CATEGORY_ICON[category]
            return (
              <section key={category} className="space-y-2.5">
                <h2 className="flex items-center gap-2 text-xl">
                  <Icon className="size-5 text-primary" />
                  {t(`links.categories.${category}`)}
                </h2>
                <ul className="space-y-2">
                  {items.map((link) => {
                    const host = link.url ? hostOf(link.url) : null
                    return (
                      <li key={link.id} className="flex items-start gap-3 rounded-[1.5rem] bg-paper p-3.5 shadow-soft">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="font-semibold break-words">{link.title}</p>
                          {host && <p className="truncate text-xs text-muted-foreground">{host}</p>}
                          {link.note && <p className="mt-1.5 text-sm whitespace-pre-line text-foreground/80">{link.note}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {link.url && normalizeUrl(link.url) && (
                            <Button asChild variant="glass" size="icon-sm">
                              <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={t('links.open', { title: link.title })}>
                                <ExternalLink />
                              </a>
                            </Button>
                          )}
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={t('common.more')}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setForm({ link })}>
                                  <Pencil />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onSelect={() => setDeleting(link)}>
                                  <Trash2 />
                                  {t('links.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </>
      )}

      <LinkFormSheet
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        link={form?.link}
        busy={m.add.isPending || m.update.isPending}
        onSubmit={(input) => {
          const done = { onSuccess: () => setForm(null), onError }
          if (form?.link) m.update.mutate({ id: form.link.id, input }, done)
          else m.add.mutate(input, done)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('links.deleteTitle', { title: deleting?.title ?? '' })}
        description={t('links.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await m.remove.mutateAsync(deleting.id)
          } catch {
            onError()
          }
        }}
      />
    </div>
  )
}
