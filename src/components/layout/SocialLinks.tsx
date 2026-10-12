import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Roamie's social accounts, where the automatic posts go (video/automation). Add TikTok here once it exists. */
const NETWORKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/getroamie/', icon: InstagramIcon },
  { name: 'YouTube', href: 'https://www.youtube.com/channel/UC2yIT9xqetihpyU04NPpfvA', icon: YouTubeIcon },
] as const

/** Brand marks drawn as plain line icons, so they sit with the rest of the UI instead of shouting in brand colours. */
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
    </svg>
  )
}

export function SocialLinks({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {NETWORKS.map(({ name, href, icon: Icon }) => (
        <li key={name}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('footer.follow', { network: name })}
            title={t('footer.follow', { network: name })}
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  )
}
