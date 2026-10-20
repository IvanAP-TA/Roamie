/**
 * Roamie's social accounts (where the automatic posts go, video/automation): the footer's links, and the
 * Organization's sameAs in the structured data, which tells search engines which "Roamie" these profiles belong to.
 */
export const SOCIAL_PROFILES = {
  Instagram: 'https://www.instagram.com/getroamie/',
  Facebook: 'https://www.facebook.com/profile.php?id=61595190126785',
  TikTok: 'https://www.tiktok.com/@getroamie',
  YouTube: 'https://www.youtube.com/channel/UC2yIT9xqetihpyU04NPpfvA',
  LinkedIn: 'https://www.linkedin.com/company/getroamie',
} as const

/** The open-source repository, also a sameAs of the Organization. */
export const SOURCE_REPOSITORY = 'https://github.com/IvanAP-TA/Roamie'
