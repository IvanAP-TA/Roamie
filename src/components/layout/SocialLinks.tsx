import { useTranslation } from 'react-i18next'
import { SOCIAL_PROFILES, SOURCE_REPOSITORY } from '@/lib/social'
import { cn } from '@/lib/utils'

/** Roamie's social accounts (src/lib/social.ts). */
const NETWORKS = [
  { name: 'Instagram', href: SOCIAL_PROFILES.Instagram, icon: InstagramIcon },
  { name: 'Facebook', href: SOCIAL_PROFILES.Facebook, icon: FacebookIcon },
  { name: 'TikTok', href: SOCIAL_PROFILES.TikTok, icon: TikTokIcon },
  { name: 'YouTube', href: SOCIAL_PROFILES.YouTube, icon: YouTubeIcon, size: 'h-5 w-7' },
  { name: 'LinkedIn', href: SOCIAL_PROFILES.LinkedIn, icon: LinkedInIcon },
  { name: 'X', href: SOCIAL_PROFILES.X, icon: XIcon, size: 'size-4' },
  { name: 'GitHub', href: SOURCE_REPOSITORY, icon: GitHubIcon, size: 'size-4' },
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

/**
 * X's and GitHub's own marks, in the text colour: their brand guidelines ask for the logo unchanged (one colour is
 * allowed), so these two are not redrawn as line icons like the others.
 */
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1200 1227" fill="currentColor" aria-hidden {...props}>
      <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
    </svg>
  )
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57l-.02-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.21.69.82.57A12 12 0 0 0 12 .3" />
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
