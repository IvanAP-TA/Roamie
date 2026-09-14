import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium',
    'transition-[transform,box-shadow,background-color,color,opacity] duration-200 ease-[var(--ease-out-expo)]',
    'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.1em]",
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'text-primary-foreground shadow-glow',
          'bg-[linear-gradient(135deg,var(--coral),var(--primary)_60%)]',
          'before:absolute before:inset-px before:rounded-[inherit] before:bg-[linear-gradient(180deg,rgb(255_255_255/0.28),transparent_55%)] before:pointer-events-none',
          'hover:shadow-lift hover:brightness-[1.04]',
        ].join(' '),
        glass: 'glass text-foreground hover:bg-[var(--glass-strong)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'text-foreground hover:bg-foreground/5',
        outline: 'border border-input bg-transparent hover:bg-foreground/5',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-sm',
        default: 'h-11 rounded-full px-5 text-[0.95rem]',
        lg: 'h-14 rounded-full px-7 text-base',
        icon: 'size-11 rounded-full',
        'icon-sm': 'size-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
