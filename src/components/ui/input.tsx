import * as React from 'react'
import { cn } from '@/lib/utils'

const fieldBase = [
  'w-full min-w-0 rounded-2xl border border-input bg-[var(--glass-strong)] px-4 text-base text-foreground',
  'placeholder:text-muted-foreground/70 shadow-[inset_0_1px_2px_rgb(120_60_30/0.06)]',
  'transition-[border-color,box-shadow] duration-200 outline-none',
  'focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--ring)_22%,transparent)]',
  'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
].join(' ')

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(fieldBase, 'h-12', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea data-slot="textarea" className={cn(fieldBase, 'min-h-24 resize-none py-3 leading-relaxed', className)} {...props} />
  )
}

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    // The control is linked by the caller, through htmlFor in props.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot="label"
      className={cn('mb-1.5 block px-1 text-[0.8rem] font-semibold tracking-wide text-muted-foreground uppercase', className)}
      {...props}
    />
  )
}

export { Input, Textarea, Label }
