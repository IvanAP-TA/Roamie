# Roamie

A group travel bucket list: propose destinations, vote on them together, spin a wheel weighted by the group's votes, and plan the itinerary day by day. Mobile-first, installable as a PWA, and multilingual (IT / EN / ES).

**No paid services.** It runs on the Supabase free plan, Google sign-in, OpenStreetMap (tiles + Nominatim) and Wikimedia Commons. None of these need a paid API key.

## Stack

| Layer | Choice |
| --- | --- |
| App | Vite + React 19 + TypeScript |
| UI | Tailwind CSS v4, shadcn/ui-style components on Radix, vaul bottom sheets, Framer Motion, Lucide |
| Data | Supabase (Postgres + RLS, Google Auth, Realtime), TanStack Query |
| Maps | React-Leaflet + OpenStreetMap tiles, Nominatim geocoding |
| Photos | Wikimedia Commons API, with CC attribution always shown |
| Extras | canvas-confetti, dnd-kit (itinerary reordering), vite-plugin-pwa, i18next |
| Fonts | Fraunces + Instrument Sans, **self-hosted** via Fontsource (no Google Fonts requests) |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create the Supabase project (free)

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations in `supabase/migrations`, in filename order. Use one of these:
   - **CLI:** `npx supabase link --project-ref <ref>` and then `npx supabase db push`
   - **Dashboard:** paste each file into *SQL Editor* and run it
3. Go to *Authentication → URL Configuration*:
   - **Site URL:** your production URL, e.g. `https://roamie.org`
   - **Redirect URLs:** `http://localhost:5173/**` and `https://roamie.org/**`
4. In *Authentication → Sign In / Providers*, disable **Email**: Roamie only signs in with Google.

### 3. Enable Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), open *Google Auth Platform → Clients* and create an **OAuth client** of type *Web application*.
   - **Authorized redirect URI:** `https://<project-ref>.supabase.co/auth/v1/callback`
2. In *Branding*, set these app links. Both pages exist in the app:
   - **Privacy policy:** `https://roamie.org/privacy`
   - **Terms of service:** `https://roamie.org/terms`
   - **Scopes:** only `email`, `profile` and `openid`
3. In Supabase, go to *Authentication → Providers → Google* and paste the client ID and secret.

### 4. Environment

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL. Also written into the Content-Security-Policy at build time. |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key. It is public by design; RLS protects the data. |
| `VITE_PUBLIC_APP_URL` | Base URL for invite links and the OAuth redirect. Set to `https://roamie.org` in the committed `.env.production`; leave it empty locally. |
| `VITE_CONTACT_EMAIL` | Contact shown in the Privacy Policy. It is also sent to Nominatim/Wikimedia to identify the app. |

### 5. Run

```bash
npm run dev
```

In development, **`/__preview`** renders the trip screens with mock data, so you can review the UI without a Supabase project. Try `/__preview/trips`, `/places`, `/map`, `/roulette`, `/itinerary` and `/group`. This route is stripped from production builds.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck, production build (PWA service worker included), then prerender the public pages and fill in `_headers` |
| `npm run preview` | Serves `dist/` with the production security headers, to check the CSP locally |
| `npm test` | Unit tests plus **database tests**: the real migrations run on PGlite (Postgres in WASM) to verify RLS, invites, votes, the weighted roulette, hardening and account deletion, with no Supabase needed |
| `npm run i18n:check` | Checks that all locales have the same keys and that every `t('…')` key exists |
| `npm run icons` | Regenerates the PWA icons from `public/favicon.svg` |
| `npm run og-image` | Regenerates the social preview images in `public/og/` |

## Architecture notes

- **Security model.** Every table has RLS. Membership checks go through `SECURITY DEFINER` helpers (`is_trip_member`, `can_edit_trip`, `is_trip_owner`), which avoids recursive policies on `trip_members`. The helpers aren't callable by `anon`. Column-level `UPDATE` grants make ids, `trip_id`, `owner_id` and authors immutable.
  - Owner: everything
  - Editor: destinations, itinerary, roulette
  - Viewer: read, vote and comment on their own content
- **User-supplied URLs.** Photos can only be Wikimedia Commons files (`upload.wikimedia.org`) or built-in scenes, enforced by check constraints and again in the client. Avatars can only be Google URLs. Attribution links are https only. This blocks tracking pixels and CSS/HTML injection from other group members.
- **HTTP headers.** `vercel.json` sets a strict Content-Security-Policy (no inline scripts, only the hosts the app talks to), HSTS, `X-Frame-Options: DENY`, `nosniff`, a restrictive Permissions-Policy, and long-lived caching for hashed assets.
- **RPCs:**
  - `get_trip_preview`: the only thing `anon` can call. It returns name, cover and member count.
  - `join_trip`, `regenerate_invite_code`, `set_points`, `spin_roulette`, `delete_account`
- **Point voting.** Every member has 10 points per trip to spread across its proposed destinations (`set_points`; 0 removes them). A trigger enforces the budget under an advisory lock, so concurrent requests can't overspend; selected or visited destinations don't count, so a spin gives their points back.
- **Trip plan.** The "Plan" tab holds the itinerary, a shared checklist (`checklist_items`: to book / to pack, assignable only to trip members, `done_at` kept by a trigger) and useful links (`trip_links`: http(s) URLs and notes, no uploads). Members read; owners and editors write. Stops can have a place (same search as destinations) and appear on the map as numbered routes, one colour per day; the itinerary exports to an `.ics` file (`src/lib/ics.ts`): timed stops as 1-hour events in floating local time, the rest as all-day events.
- **Roulette.** Eligible destinations are `proposed` with at least one point. The draw is **server-side** (`spin_roulette`), weighted by points and serialised with a row lock, so no client can choose the winner. The client animates the wheel to the returned result, and each slice's size equals its real probability.
- **Realtime.** There is one channel per open trip, covering destinations, votes, comments, members and itinerary. Changes invalidate TanStack Query caches, debounced. DELETE payloads carry only primary keys, so relevance is checked against the cache.
- **Invites.** Codes are 8 characters from an alphabet without look-alike characters, generated from `gen_random_uuid()` bytes. Regenerating a code invalidates the old link immediately; existing members keep their access.
- **SEO.**
  - The public pages are prerendered at build time (`src/entry-prerender.tsx` + `scripts/prerender.mjs`): `/` (Italian), `/en`, `/es`, `/privacy`, `/terms` and `404.html`. Each ships its real content, title, description, canonical, Open Graph/Twitter tags and, on the landing, hreflang alternates and JSON-LD (`WebSite`, `Organization`, `WebApplication`, `FAQPage`).
  - Every landing URL has a fixed language; the language switcher moves between them. `useSeo` keeps the same tags in sync on client-side navigation.
  - Signed-in routes and invite links are served by `shell.html` (`noindex`) through the rewrites in `vercel.json`; unknown paths get a real 404 status. `robots.txt` and `sitemap.xml` are in `public/`.
- **Place search.** Typing shows suggestions from [Photon](https://photon.komoot.io) (debounced, superseded requests aborted, only real places, cached). Nominatim's usage policy forbids autocomplete, so Nominatim is only called explicitly: the full search ("Search …" or Enter) and one lookup when a suggestion is picked, to get its name in the UI language (Beijing → Pechino). Nominatim calls go through a global client queue limited to 1 request per second and are cached in localStorage. Browsers can't set `User-Agent`, so the app identifies itself with the `Referer` header and the `email` parameter.
- **Wikimedia images.** Lookup tries the Wikipedia lead image first, resolved on Commons (so only freely licensed files are used), then a Commons file search whose titles must contain the place name. Maps, flags, coats of arms and tiny files are discarded. If nothing relevant remains, the card shows an illustrated scene instead. Attribution (author, licence, source) is stored as JSON and shown on every image.
- **Climate.** Destinations with coordinates show their average climate from Open-Meteo's historical weather API (free for non-commercial use, CC BY 4.0, credited next to the chart): 5 years of daily data reduced to 12 months, cached for 180 days on a ~25 km grid. The "best time to go" is an estimate from daytime highs (18–28 °C ideal) and rainy days (`src/lib/climate.ts`).
- **Privacy.** There are no analytics, no third-party trackers and no consent banner. Only strictly necessary storage is used (Supabase session, language, sound preference, API caches), and all of it is disclosed in the Privacy Policy. Users can export their data as JSON and delete their account from the Profile page.

## Deploying (Vercel)

1. Push the repository to GitHub (**private**: the backup workflow stores database dumps as artifacts).
2. Import it in Vercel. `vercel.json` sets the build (`npm run build` → `dist`), clean URLs, rewrites, headers and caching. The public Supabase values come from the committed `.env.production`; optionally add `VITE_CONTACT_EMAIL` in *Settings → Environment Variables*.
3. In Supabase *Authentication → URL Configuration*, add the Vercel domain to **Redirect URLs** (e.g. `https://roamie.vercel.app/**`) so Google sign-in works there too.
4. Under *Settings → Domains*, add `roamie.org` and `www.roamie.org` (redirecting to the apex), then point the DNS records at Vercel as instructed.

## Backups and keep-alive

The Supabase free plan has no downloadable backups and pauses projects after about a week without activity. Two GitHub Actions workflows cover both:

- **`supabase-backup.yml`** runs every Monday. It dumps roles, schema and data with the Supabase CLI and keeps them as a workflow artifact for 90 days. Add the repository secret `SUPABASE_DB_URL` (Supabase → *Connect* → *Session pooler* connection string).
- **`supabase-keepalive.yml`** runs one read-only RPC every day. Add the repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

**Test a restore** before you need one. Download an artifact, create a second free Supabase project, and run:

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname "<new project connection string>"
```

## Launch checklist

- **Search:** verify `roamie.org` as a *Domain* property in Google Search Console (DNS TXT record in Cloudflare), submit `https://roamie.org/sitemap.xml`, then import the site into Bing Webmaster Tools. Check *Pages* and *Core Web Vitals* reports after launch, and use PageSpeed Insights on `/`.
- **Monitoring:** add free uptime checks (for example UptimeRobot) for `https://roamie.org/` and `https://<project-ref>.supabase.co/auth/v1/health`.
- **Accounts:** turn on two-factor authentication for Cloudflare, Supabase, Google Cloud and GitHub.
- **Google OAuth:** publish the app in *Google Auth Platform → Audience* once branding is verified.

Keep these free-tier limits in mind:

- **OpenStreetMap tiles:** the public tile servers are meant for light use. If traffic grows, switch the `TileLayer` URL to another free or self-hosted provider, and update `img-src`/`connect-src` in `vercel.json`.
- **Supabase Auth emails:** not used (Google sign-in only).
