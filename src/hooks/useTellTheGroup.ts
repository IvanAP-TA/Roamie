import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTripContext } from '@/hooks/useTripContext'
import { inviteLink, tellTheGroup } from '@/lib/share'
import { appUrl } from '@/lib/utils'

/**
 * The group chat is where the group already is: after the moments that matter (a place proposed, the points all
 * given), a toast offers to tell the others there, with the invite link, which opens the trip for members and lets
 * the rest join with just a name.
 */
export function useTellTheGroup() {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const url = trip.invite_code ? inviteLink(trip.invite_code) : `${appUrl()}/trips/${trip.id}`

  const tell = useCallback(
    async (text: string) => {
      const outcome = await tellTheGroup(text, url)
      if (outcome === 'copied') toast.success(t('tellGroup.copied'))
      else if (outcome === 'failed') toast.error(t('errors.generic'))
    },
    [t, url],
  )

  /** A success toast with the "Tell the group" action. */
  return useCallback(
    (message: string, text: string) => toast.success(message, { action: { label: t('tellGroup.action'), onClick: () => void tell(text) }, duration: 8000 }),
    [t, tell],
  )
}
