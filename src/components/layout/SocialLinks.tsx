import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Roamie's social accounts, where the automatic posts go (video/automation). */
const NETWORKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/getroamie/', icon: InstagramIcon },
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61595190126785', icon: FacebookIcon },
  { name: 'TikTok', href: 'https://www.tiktok.com/@getroamie', icon: TikTokIcon },
  { name: 'YouTube', href: 'https://www.youtube.com/channel/UC2yIT9xqetihpyU04NPpfvA', icon: YouTubeIcon },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/getroamie', icon: LinkedInIcon },
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

function YouTubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
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
