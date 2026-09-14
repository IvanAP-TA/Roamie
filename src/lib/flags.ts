/** ISO 3166-1 alpha-2 → flag emoji ("PT" → 🇵🇹), from regional indicator symbols. */
export const flagEmoji = (code: string) => code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
