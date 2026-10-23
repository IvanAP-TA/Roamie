import { useTranslation } from 'react-i18next'
import { SOCIAL_PROFILES } from '@/lib/social'
import { cn } from '@/lib/utils'

/** Roamie's social accounts (src/lib/social.ts). */
const NETWORKS = [
  { name: 'Instagram', href: SOCIAL_PROFILES.Instagram, icon: InstagramIcon },
  { name: 'Facebook', href: SOCIAL_PROFILES.Facebook, icon: FacebookIcon },
  { name: 'TikTok', href: SOCIAL_PROFILES.TikTok, icon: TikTokIcon },
  { name: 'YouTube', href: SOCIAL_PROFILES.YouTube, icon: YouTubeIcon, size: 'h-5 w-7' },
  { name: 'LinkedIn', href: SOCIAL_PROFILES.LinkedIn, icon: LinkedInIcon },
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

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M15.5 7.5h-1.75a2.25 2.25 0 0 0-2.25 2.25V21" />
      <path d="M9 12.5h6" />
    </svg>
  )
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M13.5 3.5v11.25a3.75 3.75 0 1 1-3.75-3.75" />
      <path d="M13.5 3.5c.35 2.6 2.1 4.35 4.75 4.6" />
    </svg>
  )
}

/**
 * YouTube's own icon, unchanged in shape and colour and never under 20px high: its Branding Guidelines ask for it
 * (https://developers.google.com/youtube/terms/branding-guidelines), as the channel's videos are uploaded with its API.
 */
function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 28.57 20" aria-hidden {...props}>
      <path
        d="M27.97 3.12A3.58 3.58 0 0 0 25.45.6C23.22 0 14.29 0 14.29 0S5.35 0 3.12.6A3.58 3.58 0 0 0 .6 3.12C0 5.35 0 10 0 10s0 4.65.6 6.88a3.58 3.58 0 0 0 2.52 2.52c2.23.6 11.17.6 11.17.6s8.93 0 11.16-.6a3.58 3.58 0 0 0 2.52-2.52c.6-2.23.6-6.88.6-6.88s0-4.65-.6-6.88Z"
        fill="#FF0000"
      />
      <path d="M11.43 14.29 18.85 10l-7.42-4.29v8.58Z" fill="#FFFFFF" />
    </svg>
  )
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M8 10.5V16" />
      <circle cx="8" cy="7.6" r="0.6" fill="currentColor" stroke="none" />
      <path d="M11.5 16v-5.5" />
      <path d="M11.5 13a2.5 2.5 0 0 1 5 0v3" />
    </svg>
  )
}

export function SocialLinks({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {NETWORKS.map(({ name, href, icon: Icon, ...network }) => (
        <li key={name}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('footer.follow', { network: name })}
            title={t('footer.follow', { network: name })}
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-foreground/5 hover:text-foreground"
          >
            <Icon className={'size' in network ? network.size : 'size-5'} />
          </a>
        </li>
      ))}
    </ul>
  )
}
