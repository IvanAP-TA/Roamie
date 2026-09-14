import * as React from 'react'
import { Drawer } from 'vaul'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Hide the visual title (still announced to screen readers). */
  hideTitle?: boolean
}

/**
 * Mobile: draggable bottom sheet (thumb zone). ≥768px: centred glass dialog.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, className, hideTitle }: SheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#2b1d17]/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className={cn(
              'glass-strong fixed top-1/2 left-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-[2rem]',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              className,
            )}
          >
            <header className={cn('flex items-start justify-between gap-4 px-7 pt-7 pb-2', hideTitle && 'sr-only')}>
              <div>
                <Dialog.Title className="font-display text-2xl leading-tight">{title}</Dialog.Title>
                {description && <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>}
              </div>
              <Dialog.Close className="-mt-1 -mr-2 rounded-full p-2 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground">
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </header>
            {!description && <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-2 pb-6">{children}</div>
            {footer && <div className="border-t border-border/60 px-7 py-4">{footer}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-[#2b1d17]/35" />
        <Drawer.Content
          className={cn(
            'glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[2rem] border-b-0 outline-none',
            className,
          )}
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-foreground/15" />
          <header className={cn('px-6 pt-3 pb-1', hideTitle && 'sr-only')}>
            <Drawer.Title className="font-display text-2xl leading-tight">{title}</Drawer.Title>
            {description ? (
              <Drawer.Description className="mt-1 text-sm text-muted-foreground">{description}</Drawer.Description>
            ) : (
              <Drawer.Description className="sr-only">{typeof title === 'string' ? title : ''}</Drawer.Description>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-3 pb-6" data-vaul-no-drag>
            {children}
          </div>
          {footer && <div className="pb-safe border-t border-border/60 px-6 pt-3">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
