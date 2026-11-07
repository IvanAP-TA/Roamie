import { Loader2, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useBringInFriend } from '@/hooks/useDemoFriend'
import { Button } from '@/components/ui/button'

/**
 * The sample trip's invitation: real friends need a Google account (a guest's trip can be deleted after 60 days), so
 * here a demo friend stands in, to see how a group voting works.
 */
export function SampleInvite() {
  const { t } = useTranslation()
  const { isGuest } = useAuth()
  const friend = useBringInFriend()
  if (!friend.available) return null

  return (
    <section className="glass flex flex-wrap items-center gap-3 rounded-[1.75rem] p-4">
      <p className="min-w-0 flex-1 basis-56 text-sm">{t(isGuest ? 'sample.inviteGuest' : 'sample.inviteOwn')}</p>
      <Button size="sm" onClick={() => void friend.bringIn()} disabled={friend.arrived || friend.busy} className="w-full sm:w-auto">
        {friend.busy ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {t(friend.arrived ? 'sample.friendHere' : 'sample.do.friend')}
      </Button>
    </section>
  )
}
