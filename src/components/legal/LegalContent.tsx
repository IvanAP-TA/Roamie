import { useTranslation } from 'react-i18next'

export type LegalDoc = 'privacy' | 'terms'

interface Section {
  title: string
  body: string
  items?: string[]
}

export function LegalContent({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation()
  const contact = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || t('legal.contactFallback')
  const sections = t(`legal.${doc}.sections`, { returnObjects: true, contact }) as Section[]

  return (
    <article className="space-y-6 text-[0.95rem] leading-relaxed">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{t('legal.updated', { date: '10/10/2026' })}</p>
      <p className="font-display text-lg leading-snug">{t(`legal.${doc}.intro`)}</p>
      {Array.isArray(sections) &&
        sections.map((section) => (
          <section key={section.title}>
            <h3 className="mb-1.5 font-sans text-sm font-bold tracking-wide text-primary uppercase">{section.title}</h3>
            <p className="text-foreground/85">{section.body}</p>
            {section.items && (
              <ul className="mt-2 space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="relative pl-5 text-foreground/85 before:absolute before:top-[0.6em] before:left-1 before:size-1.5 before:rounded-full before:bg-coral">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </article>
  )
}
