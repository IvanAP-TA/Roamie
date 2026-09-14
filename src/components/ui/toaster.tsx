import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'glass-strong flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-foreground font-medium [&_[data-icon]]:text-primary',
          description: 'text-muted-foreground text-xs font-normal',
          actionButton: 'ml-auto rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground',
          error: '[&_[data-icon]]:!text-destructive',
        },
      }}
    />
  )
}
