import { useState } from 'react'
import { EyeOff, Lock, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRevealVotes, useSetSecretVoting, useVoteProgress } from '@/hooks/useSecretVoting'
import { useTripContext } from '@/hooks/useTripContext'
import { votesHidden } from '@/lib/secretVoting'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/** Next to the points: how a secret round is going, and for organisers the switch to start one or reveal it. */
export function SecretVotingControl() {
  const { t } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const hidden = votesHidden(trip)
  const progress = useVoteProgress(trip.id, hidden)
  const setSecret = useSetSecretVoting(trip.id)
  const reveal = useRevealVotes(trip.id)
  const [confirm, setConfirm] = useState<'enable' | 'reveal' | null>(null)

  if (!hidden && !canEdit) return null

  const buttonClass = 'h-8 rounded-full px-3 text-xs'

  return (
    <>
      {hidden && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
          <Lock className="size-3.5" />
          {progress.data ? t('secret.chip', { voted: progress.data.voted, members: progress.data.members }) : t('secret.toggle')}
        </span>
      )}

      {canEdit &&
        (hidden ? (
          <Button variant="ghost" size="sm" className={buttonClass} onClick={() => setConfirm('reveal')}>
            <Sparkles className="size-3.5" />
            {t('secret.revealNow')}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className={buttonClass} onClick={() => setConfirm('enable')}>
            <EyeOff className="size-3.5" />
            {t(trip.secret_voting ? 'secret.newRound' : 'secret.toggle')}
          </Button>
        ))}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(confirm === 'reveal' ? 'secret.revealTitle' : 'secret.enableTitle')}
        description={t(confirm === 'reveal' ? 'secret.revealBody' : 'secret.enableBody')}
        confirmLabel={t(confirm === 'reveal' ? 'secret.revealCta' : 'secret.enableCta')}
        cancelLabel={t('common.cancel')}
        icon={confirm === 'reveal' ? <Sparkles /> : <EyeOff />}
        onConfirm={async () => {
          try {
            if (confirm === 'reveal') {
              await reveal.mutateAsync()
            } else {
              await setSecret.mutateAsync(true)
              toast.success(t('secret.enabled'))
            }
          } catch {
            toast.error(t('errors.generic'))
          }
        }}
      />
    </>
  )
}
