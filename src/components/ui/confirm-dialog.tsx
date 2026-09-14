import * as React from 'react'
import { AlertDialog } from 'radix-ui'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void | Promise<void>
  destructive?: boolean
  icon?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive,
  icon,
}: ConfirmDialogProps) {
  const [busy, setBusy] = React.useState(false)

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-[#2b1d17]/35 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <AlertDialog.Content
          className={cn(
            'glass-strong fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[2rem] p-7 text-center',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {icon && <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">{icon}</div>}
          <AlertDialog.Title className="font-display text-2xl leading-tight">{title}</AlertDialog.Title>
          <AlertDialog.Description className={cn('mt-2 text-sm text-muted-foreground', !description && 'sr-only')}>
            {description ?? title}
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant={destructive ? 'destructive' : 'default'}
              size="lg"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onConfirm()
                  onOpenChange(false)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {confirmLabel}
            </Button>
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={busy}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
