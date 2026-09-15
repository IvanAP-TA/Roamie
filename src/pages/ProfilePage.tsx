import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Download, FileText, Loader2, Lock, LogOut, ShieldCheck, Trash2, Volume2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { keys, unwrap } from '@/hooks/useTrips'
import { supabase } from '@/lib/supabase'
import { useSoundEnabled } from '@/lib/sound'
import { Logo } from '@/components/brand/Logo'
import { AppHeader } from '@/components/layout/AppHeader'
import { Footer } from '@/components/layout/Footer'
import { InstallAppButton } from '@/components/install/InstallApp'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { PageTransition } from '@/components/layout/PageTransition'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'

/** GDPR data portability: everything tied to the user, as a JSON download. */
async function exportMyData(userId: string, email: string | undefined) {
  const [profile, memberships, destinations, votes, comments, links, checklist, ratings, visitedPlaces, hiddenVisits, availability] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('trip_members').select('role, joined_at, trip:trips(id, name, description, created_at)').eq('user_id', userId),
    supabase.from('destinations').select('*').eq('created_by', userId),
    supabase.from('votes').select('destination_id, points, created_at').eq('user_id', userId),
    supabase.from('comments').select('destination_id, content, created_at').eq('user_id', userId),
    supabase.from('trip_links').select('trip_id, category, title, url, note, created_at').eq('created_by', userId),
    supabase.from('checklist_items').select('trip_id, kind, title, done, created_at').eq('created_by', userId),
    supabase.from('destination_reviews').select('destination_id, rating, created_at').eq('user_id', userId),
    supabase.from('visited_places').select('name, country, country_code, lat, lng, visited_on, rating, created_at').eq('user_id', userId),
    supabase.from('passport_exclusions').select('destination_id, created_at').eq('user_id', userId),
    supabase.from('availability').select('trip_id, day, status').eq('user_id', userId),
  ])
  const payload = {
    exported_at: new Date().toISOString(),
    account: { email },
    profile: unwrap(profile),
    trips: unwrap(memberships),
    destinations_proposed: unwrap(destinations),
    votes: unwrap(votes),
    comments: unwrap(comments),
    links_added: unwrap(links),
    checklist_items_added: unwrap(checklist),
    ratings: unwrap(ratings),
    visited_places: unwrap(visitedPlaces),
    hidden_from_passport: unwrap(hiddenVisits),
    availability: unwrap(availability),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roamie-data-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function Row({ icon, children, onClick, to, destructive }: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  to?: string
  destructive?: boolean
}) {
  const className = `flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-foreground/[0.03] [&>svg:first-child]:size-5 ${destructive ? 'text-destructive' : ''}`
  const inner = (
    <>
      {icon}
      <span className="flex-1 font-medium">{children}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useSoundEnabled()
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => setName(profile?.display_name ?? ''), [profile?.display_name])

  const saveName = useMutation({
    mutationFn: async () => {
      unwrap(await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', user!.id))
    },
    onSuccess: () => {
      toast.success(t('profile.saved'))
      void qc.invalidateQueries({ queryKey: ['profile'] })
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
    onError: () => toast.error(t('errors.generic')),
  })

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_account')
    if (error) {
      toast.error(t('errors.generic'))
      return
    }
    await signOut()
    navigate('/', { replace: true })
    toast.success(t('profile.accountDeleted'))
  }

  const nameChanged = name.trim().length > 0 && name.trim() !== (profile?.display_name ?? '')

  return (
    <>
      <AppHeader left={<Logo to="/trips" />} />
      <PageTransition className="mx-auto max-w-2xl space-y-8 px-5 pt-2 md:px-6">
        <h1 className="text-[2.6rem] leading-none md:text-5xl">{t('profile.title')}</h1>

        <section className="glass relative overflow-hidden rounded-[2rem] p-6">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-[var(--aurora-2)] opacity-40 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <UserAvatar profile={profile} className="size-20 text-2xl ring-4 ring-white/70" />
            <div className="min-w-0">
              <p className="truncate font-display text-2xl">{profile?.display_name}</p>
              <p className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">{t('profile.emailPrivate')}</p>
            </div>
          </div>
          <form
            className="relative mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (nameChanged) saveName.mutate()
            }}
          >
            <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label={t('profile.displayName')} />
            <Button type="submit" disabled={!nameChanged || saveName.isPending} className="h-12 shrink-0">
              {saveName.isPending ? <Loader2 className="animate-spin" /> : t('common.save')}
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl">{t('profile.preferences')}</h2>
          <div className="glass divide-y divide-border rounded-[1.75rem]">
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span className="flex-1 font-medium">{t('common.language')}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <Volume2 className="size-5 text-primary" />
              <span className="flex-1 font-medium">{t('profile.sound')}</span>
              <Switch checked={soundOn} onCheckedChange={setSoundOn} label={t('profile.sound')} />
            </div>
            <InstallAppButton appearance="row" />
          </div>
        </section>

        <NotificationSettings />

        <section className="space-y-3">
          <h2 className="text-2xl">{t('profile.privacy')}</h2>
          <div className="glass divide-y divide-border rounded-[1.75rem]">
            <Row icon={<ShieldCheck className="text-sage" />} to="/privacy">
              {t('legal.privacy.title')}
            </Row>
            <Row icon={<FileText className="text-primary" />} to="/terms">
              {t('legal.terms.title')}
            </Row>
            <Row
              icon={exporting ? <Loader2 className="animate-spin text-primary" /> : <Download className="text-primary" />}
              onClick={async () => {
                if (!user || exporting) return
                setExporting(true)
                try {
                  await exportMyData(user.id, user.email)
                } catch {
                  toast.error(t('errors.generic'))
                } finally {
                  setExporting(false)
                }
              }}
            >
              {t('profile.export')}
            </Row>
          </div>
        </section>

        <section className="space-y-3">
          <div className="glass divide-y divide-border rounded-[1.75rem]">
            <Row icon={<LogOut />} onClick={() => void signOut().then(() => navigate('/', { replace: true }))}>
              {t('profile.signOut')}
            </Row>
            <Row icon={<Trash2 />} destructive onClick={() => setConfirmDelete(true)}>
              {t('profile.deleteAccount')}
            </Row>
          </div>
        </section>
      </PageTransition>

      <Footer className="mt-6" />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('profile.deleteTitle')}
        description={t('profile.deleteBody')}
        confirmLabel={t('profile.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={deleteAccount}
      />
    </>
  )
}
