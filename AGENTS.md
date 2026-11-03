# Kimina Portfolio — Codex Handoff

## Purpose

This is Kimina’s static personal portfolio for music, education, sound engineering, creative technology, residencies and bookings. Keep it minimal, editorial and professional. The site should feel like one coherent artistic identity while giving each destination its own generative visual theme.

## Product decisions to preserve

- Use pure white backgrounds, black typography and thin black rules. Photography may remain in colour.
- Use JetBrains Mono throughout.
- Keep the enlarged `K.` mark at the upper left and the exact masthead tagline `MUSIC.EDUCATION.SOUND` at the upper right.
- Keep shared navigation in this order: Works, Performances, Bookings, Residencies, Downloads, About, Contact.
- Desktop navigation stays fixed on the left; mobile navigation becomes a bordered bottom bar.
- Keep page content restrained, with generous whitespace and square geometry.
- Maintain semantic HTML, descriptive image alt text, visible keyboard focus styles and reduced-motion support.
- Do not invent projects, releases, credits, social profiles or downloadable materials. Add them only when the user provides factual content or assets.
- Downloads contains only user-supplied entries and external destinations. Do not invent or claim files, releases or products.
- Performances currently contains the 24 February 2026 Kilele Experimental Night, the 8 August 2026 Nyokabi Kariuki farewell performance at The Mist and the 5 September 2026 SMEM residency recap with Goffbaby. Add further entries only when the user supplies event details, credits or documentation.
- Keep the stellar drone opt-in. It may restore only when a visitor has explicitly enabled both playback and the session-only “Continue between pages” option; otherwise never autoplay audio.

## Current pages and animation themes

- `index.html`: landing page, short introduction and Lissajous curves
- `works.html`: selected work and reactive dot field
- `performances.html`: live archive and layered waveforms
- `kilele-performance.html`: Kimina For Me Please at Kilele Experimental Night, poster, context and seven-image gallery
- `bookings.html`: service cards and flowing signal waves
- `residencies.html`: residency archive and orbital forms
- `smem-residency.html`: dedicated SMEM residency story, twelve-image gallery, credits and constellation field
- `downloads.html`: external shops/download destinations and rippling grid
- `about.html`: full biography and connected threads
- `contact.html`: enquiry routes and cursor-following pulse rings
- `404.html`: custom “Signal lost” page and reactive signal line

All portfolio animations live in `landing.js` and are selected through the body’s `data-animation` attribute. The Bookings animation and Calendly behavior live in `bookings.js`. Pointer response should stay subtle. Reduced-motion users receive a static frame, not continuous animation or page transitions.

Every page includes the dependency-free Web Audio stellar drone from `stellar-player.js`. It starts only after visitor consent, fades smoothly, suspends while the page is hidden and responds subtly to cursor position through filtering and stereo movement. Four independently fading sine, triangle and sawtooth voices are mapped to Proxima Centauri, Sirius, Vega and Betelgeuse, joined by quieter upper partials and a slowly breathing filtered-noise layer. Generated convolution reverb and feedback echo provide depth. The saw voice stays deliberately quieter than the rounder waveforms. Voices hold minor-seventh chord tones while timbre, balance, filtering, space and effects move through 30-second Drift, Convergence, Transit, Flare and Afterglow states. At each state change, shuffle the four chord tones discretely across octave offsets −1, 0, +1 and +2; this creates register movement without continuous pitch drift. Every third state, randomly choose one voice for a “High signal” event three octaves above its assigned register; return it to the normal spread at the next state. The visitor-selected tonal centre may be A minor, F minor, C minor or D minor. A conventional shallow vibrato keeps the voices alive without creating slow tuning drift. Log-compressed luminosity shapes level and brightness; distance shapes spectral focus and fade duration. The expandable panel provides key, volume, an evolving star-data readout and a session-only continuity option. Browsers may require a manual resume after navigation; preserve that honest fallback state. Treat this as musical sonification rather than a literal representation of stellar sound.

## Works and residencies

- Works currently shows the 2026 SMEM collaboration with Goffbaby, the user-supplied Bwaku Crew residency and SIGNAL FORMS. Do not populate categories with invented work.
- Works filters distinguish releases, installations, instruments, research and collaborations. SMEM is classified as research and collaboration; SIGNAL FORMS is classified as an instrument.
- Substantial Downloads such as authored instruments or releases may opt into Works through `include_in_works` and `work_types`. Ordinary files, manuals and utilities should remain Downloads-only.
- A Download shown in Works links to its external destination and may use an optional Works image. Without one, retain the restrained typographic placeholder.
- Each future documented work should receive its own detail page based on the semantic `project-main` structure used by `smem-residency.html`.
- Every visible HTML mention of Goffbaby should link to `https://goffbaby.com` in a new tab with `rel="noopener"`. Metadata and documentation references are plain text because they cannot provide contextual page links.
- The Residencies page describes the current three-week residency at the Swiss Museum and Centre for Electronic Music Instruments in Fribourg, developed through a Pro Helvetia Synergies collaboration.
- The documented closing recap and live set date is 5 September 2026.
- `images/smem.jpg` is the original user-supplied portrait photograph and is the active source on Works and Residencies.
- `images/smem-web.jpg` was produced by a failed conversion and renders black. Do not use it.
- The SMEM image should remain portrait-oriented to the left of the residency text on desktop and stack above it on mobile.
- The SMEM index entry links to `smem-residency.html`. Use that detail page as the template for future residency pages, with an editorial introduction, factual project description, responsive gallery, credits and previous/next navigation.
- Do not duplicate a photograph merely to make the gallery appear larger. Add gallery items only when the user supplies additional images.
- The active SMEM detail gallery uses the twelve gallery JPEGs inside `images/smem/` (`performance.jpg` is the SMEM recap lead image). Keep their descriptive alt text, lazy loading and natural image proportions. Ignore `.DS_Store` and `jpegmini_optimized.zip`.

## Releases and the release player

- Releases live in `site/content/releases/` and currently contain no entries. Add releases only when the user supplies the music, artwork and details.
- A release with a `tracks` list (each with `title`, `src` and optional `duration` as `m:ss`) gets a Bandcamp-style player on its detail page: cover, play/pause, previous/next, seek bar, clickable tracklist, auto-advance and Media Session (lock-screen) controls. The player lives in `release-player.js`, which `base.njk` loads only on pages with tracks.
- Track `src` is either an uploaded file in `downloads/<slug>/` or a direct `https` link to an audio file. Bandcamp, SoundCloud and Google Drive page links are not audio files and will not play. MP3 is the recommended format.
- The release `image` is the player cover. `external_url`/`external_label` become the player's Buy button (e.g. Bandcamp) instead of the credits link.
- Playback stops on page change; do not add cross-page continuation without the user requesting it. Without JavaScript each track falls back to a native `<audio>` control.
- The release player and stellar drone are mutually exclusive: each dispatches a `kimina:audio-start` event on `document` when it starts, and the other pauses.
- Works shows "Listen" instead of "View project" for entries with tracks.

## Kilele performance

- `kilele-performance.html` documents Kimina For Me Please at Kilele Experimental Night from 22:00 to 23:00 on 24 February 2026 at The Mist, The Mall, Westlands, Nairobi.
- `images/kilele/poster.jpg` is the lead image on the archive and detail page.
- The seven other JPEGs in `images/kilele/` form the performance gallery; preserve their natural proportions, descriptive alt text and lazy loading.
- Verified public context: Kilele’s third edition ran 23–28 February 2026 under the theme “Sound and Solidarity.” The user confirmed The Mist as the Experimental Night venue and 22:00–23:00 as Kimina For Me Please’s performance time.

## Additional user-supplied entries

- `site/content/performances/nyokabi-kariuki-at-the-mist.md` documents Nyokabi Kariuki’s farewell performance at The Mist on 8 August 2026. Its lead poster and gallery images are in `images/uploads/nyokabi-kariuki-at-the-mist/`.
- `site/content/residencies/bwaku-crew.md` is the user-supplied Bwaku Crew collaboration/residency entry. Its images are in `images/uploads/bwaku-crew/`.
- `site/content/downloads/signal-forms.md` is the SIGNAL FORMS collection: five Max for Live effects for reshaping time, texture and resonance. It links to the user-provided Google Drive folder and is included in Works as an instrument.
- The verified local SIGNAL FORMS devices are KIMINA BLOOM, DUST, FRACTURE, LOOM and TIDE. Do not add technical or commercial claims beyond the user-supplied entry or verified device files.
- `site/content/downloads/kimina-plugins.md` is KIMINA PLUGINS: eight free GPL VST3/CLAP effects (HALO, NEBULA, SPECTRA, TIDE, DUST, FRACTURE, BLOOM, LOOM), universal macOS and 64-bit Windows builds (0.3.0, 2026-10-23). It links to the user-supplied Google Drive folder holding both zips and to the hosted manuals, and is included in Works as an instrument.
- `manuals/` holds the plugin manuals. They are generated in `~/Documents/KIMINA PLUGINS` (`cargo run -p manuals`) and copied here; do not hand-edit them. Plugins and manuals link back to `https://kimina.co.ke/manuals/`.
- Download entries may set optional `manual_url`/`manual_label`, rendered as a second button before the download button.

## About and contact

- `about.html` contains the full biography originally written for the booking page. Preserve its wording unless the user explicitly requests a rewrite.
- The About portrait-and-copy composition is deliberately smaller and centered within the available page area, followed by a responsive editorial gallery using the seven photographs in `images/about/`.
- The shorter biography on the landing page is an introduction and remains separate from the full About text.
- Contact provides routes for creative collaborations, workshops and education, live sound, and press/general enquiries. Since 2026-11-02 they open the Contact form with that topic chosen (`?topic=…#enquiry`).
- Do not publish Kimina's email address anywhere on the site (user's request, 2026-11-02, because of bots and spam). Visitors reach Kimina through the Contact form; outgoing emails may still come from kimina@santuri.org.
- Do not add social links until the user supplies the actual profile URLs.

## Booking decisions to preserve

The service order is:

1. Music Production Tutoring
2. DJ Tutoring
3. Production Session
4. Mixing & Mastering
5. Recording Services
6. Sound Tech & Live Engineer
7. General Consultation

- Desktop uses three columns and centers the seventh card. Tablet uses two columns and mobile uses one.
- Do not add feature lists unless explicitly requested.
- Keep the small regular-weight metadata line on every card with its duration, format and price.
- Keep the compact bordered contact panel below the cards.
- The full About section no longer belongs on Bookings; it lives at `about.html`.
- Keep the `K.` and Santuri logo lockup in the booking masthead.
- All seven booking links currently use `https://calendly.com/kimina-santuri/one-on-one-sessions`.
- Every booking button must retain the `booking-link` class.
- Calendly must degrade gracefully: if its widget is unavailable, links navigate normally.

## Important shared assets

- `images/favicon.svg`: white-square `K.` favicon used on every page
- `images/og-portfolio.jpg`: 1200 × 630 social-sharing card used by current metadata
- `tools/generate_og.py`: deterministic generator for the current social card
- `images/about.jpg`: original About portrait; preserve it
- `images/about/about-web.jpg`: optimized portrait used beside the About biography; preserve it
- `images/about/`: seven user-supplied photographs used by the About portrait and gallery; preserve their natural proportions and descriptive alt text
- `images/sound-tech.jpg`: original Sound Tech photograph; preserve it
- `images/sound-tech-web.jpg`: optimized image used by the service card

The remaining service images are already optimized JPEG assets. Prefer existing images unless the user requests replacements.

## Lessons

- `lessons/` holds standalone teaching pages, copied through to the site like `manuals/`. They keep their own design (not the portfolio layout) but carry the `K.` link home and the `MUSIC.EDUCATION.SOUND` tagline, and use the site favicon.
- `lessons/five-beats/` (2026-10-28) is the SEMA beginner pairs activity "Five Beats": five genre drum patterns (house, boom bap, Afrobeats, amapiano, gengetone), chords and bassline, and a 32-bar arrangement in Ableton Live 12. `index.html`, `lesson.css` and `lesson.js` (Web Audio previews, timers, per-device tick boxes in localStorage), `sema-logo.png` (from the user's `SEMA LOGO BLACK.png`, resized to 240 px) and `five-beats.pdf` (the printable A4 version with no audio controls).
- The page is not linked from the navigation, Works or Downloads; it is reached by its URL, `https://kimina.co.ke/lessons/five-beats/`. Add a link only when the user asks.
- The same activity is also published as a private claude.ai artifact (https://claude.ai/artifact/VegXzi248kQCWaCj3BZ5az). The two copies are separate, so a content change must be made in both and the PDF regenerated (headless Chrome print of a copy with `.play`, `.timer`, `.progress`, `.layers` and `.chips` hidden).
- `lessons/santuri-dna/` (2026-10-30) is the learner-facing pairs workbook for Lesson 12, "Santuri DNA: Music Industry and Culture": six no-screen tasks (listen and ask, influence map, consent and credit cases, follow the release, project interviews, ethics check and log). `index.html`, `lesson.css` (derived from Five Beats, without the sequencer styles; print rules hide the interactive parts), `lesson.js` (timers and per-device tick boxes only) and `santuri-dna.pdf` (A4, headless Chrome print of the page itself). It is also a claude.ai doc (https://claude.ai/artifact/Ui4qurdkK1sZ7r2FXrkb4d), with a facilitator guide at https://claude.ai/artifact/JQs1MXh6WWpgBKopMdChdy; the copies are separate. Reached by URL only: `https://kimina.co.ke/lessons/santuri-dna/`.
- `lessons/business-of-djing/` (2026-11-03) is the pairs workbook for SEMA DJ102 Lesson 10, "The Business of DJing", from the user's Google Doc lesson plan and learner worksheet: seven tasks matching the plan's timings (offer and proof, costing a fee, fishbowl and contract clinic, EPK build with a 60-second booker test, event design with the peer booking rule and break-even, negotiation role-play, action plan to Jadili). Same files as Santuri DNA, plus a fee calculator and a break-even calculator (`.calc`, hidden in print). `business-of-djing.pdf` is a headless Chrome print of the page (9 A4 pages). Reached by URL only: `https://kimina.co.ke/lessons/business-of-djing/`. No claude.ai doc copy or facilitator guide yet.
- 2026-10-28 verified: `npm run build` and `npm run check` pass; the page renders at desktop and 375 px width with no horizontal scroll and no console errors; the beat and song Play buttons advance their step and bar highlights. Not verified: audio by ear. Published to `main` on 2026-10-28 from branch `add/five-beats-lesson`.

## Technical constraints

- The public site remains static and database-free. Eleventy is now used as a local/deployment-time generator; no framework or runtime backend is shipped to visitors.
- Node dependencies are locked through `package-lock.json`. Use `npm install`, `npm run build`, `npm run check` and `npm run serve`.
- Keep CSS and JavaScript external rather than moving them inline.
- Prefer plain HTML, CSS and JavaScript over new dependencies.
- Page transitions should ignore external, mailto, hash and new-tab links.
- `.nojekyll` is included for GitHub Pages. `_redirects` is ignored by GitHub Pages and provides extensionless aliases only on compatible hosts. Visible links retain `.html` for GitHub Pages and direct-file compatibility.
- The canonical production domain is `https://kimina.co.ke/` (the GitHub Pages custom domain in `CNAME`; kimina.santuri.org points elsewhere and does not serve this site, checked 2026-10-23). Keep social-image URLs absolute on this domain.
- Do not restore the obsolete booking-oriented `images/og-image.jpg` in current metadata unless explicitly requested.

## Verification after edits

- Run `npm run build` and `npm run check`. The latter checks `landing.js`, `bookings.js`, `stellar-player.js`, `release-player.js`, generated references (including track audio files) and required content counts.
- Confirm every local `src` and stylesheet/script reference exists.
- Confirm every main page uses `images/favicon.svg` and the exact tagline `MUSIC.EDUCATION.SOUND`.
- Confirm Bookings still contains seven service cards and seven `booking-link` buttons unless the request changes that number.
- Confirm Downloads does not claim or link unreleased files.
- Check desktop, tablet and mobile layouts when browser rendering is available.
- Visually inspect newly converted images before referencing them; prior conversion tooling produced a valid-looking but black JPEG.

## Local CMS and publishing

- Git uses the SSH remote `git@github.com:Kimina-Santuri/kimina-website-main.git` with a repository-specific SSH identity configured locally.
- The dependency-light local CMS in `cms/` edits Markdown collections, accepts controlled image uploads, validates the generated site and publishes content through Git.
- `cms/server.js` is bound only to `127.0.0.1`. It launches Eleventy preview, reads and writes the Markdown collections, validates before publishing and calls Git with argument arrays rather than shell interpolation.
- `cms/public/` contains the local editorial interface. `cms/schema.js` defines Releases, Performances, Residencies and Downloads forms. Releases also have a Tracks editor with audio upload (MP3, M4A, AAC, OGG, Opus, WAV, FLAC into `downloads/<slug>/`), reordering and automatic duration detection; the server rejects non-https links, paths outside `downloads/` and malformed durations.
- The intended command is `npm run cms`, serving the editor at `http://127.0.0.1:3000` and preview at `http://127.0.0.1:8080`.
- `Kimina-CMS.command` is the double-clickable macOS launcher; it installs dependencies only when missing, starts the CMS and opens the editor automatically.
- Saving remains local and updates the preview. Publishing is locked to `main` by default and must remain a separate deliberate action.
- The `Published` checkbox controls whether an entry is included in the local generated preview as well as the eventual live build; checking it and saving locally does not push anything by itself.
- The Publish action must continue to: reject unrelated working-tree changes, fetch/check that GitHub is not ahead, run build and validation, stage only `site/content`, `images/uploads` and `downloads`, commit, then push.
- Downloads use external HTTP/HTTPS shop or file links with user-defined button labels; the CMS does not require hosted download uploads.
- Download entries may optionally appear in Works using `include_in_works`, `work_types`, `work_image` and `work_image_alt`.
- Local API verification covers collection reads, mutation-token rejection, save/read-back, uploads, Git diagnostics and branch-locked publishing.

Last reviewed: 2026-09-02.

## 2026-10-28: PUSH 2 × TRAKTOR cheat sheet

- `downloads/push2-traktor/cheatsheet.svg` replaced with the repo's new one (stem pads solid/off, solid hotcues and
  loops). Built with `npm run build`; only that file was committed (unrelated untracked SEMA files left alone) and
  pushed (cbd448f). Not checked: the live page after deploy.

## 2026-10-30: Santuri DNA pairs workbook

- Added `lessons/santuri-dna/` on branch `add/santuri-dna-lesson` (see Lessons). Verified: `npm run build` and
  `npm run check` pass; renders at 375 px with no horizontal scroll and no console errors; tick boxes update the
  progress bar; the PDF is 7 A4 pages with timers, tick boxes and the site bar hidden. Not verified: timer beep by ear.
  Published to `main` (c3d049a) and confirmed live with the PDF reachable.

## 2026-11-02: Supabase project, stage 1 (admin sign-in and records)

- Decision (user, 2026-11-02): a new, separate **Kimina** Supabase project (not Santuri's `gudbkpwxszdtirewawep`) for a hosted CMS at kimina.co.ke/admin, records for clients, students, invoices and payments, a personal booking calendar to replace Calendly, and student-only materials. Cloudflare was considered; Supabase was chosen for the calendar (same design as santuri-bookings). Only Kimina signs in for now.
- Plan: 1 database and admin sign-in → 2 hosted CMS (an Edge Function holding a GitHub token commits content; GitHub Actions deploys as now; the Mac CMS stays as a fallback) → 3 records screens and Contact-page enquiries → 4 own calendar replacing Calendly → 5 student materials by private link.
- This relaxes "static and database-free": visitors still get a static site; only /admin (and later the calendar and Contact form) talks to Supabase.
- `supabase/migrations/202611020001_admin_and_records.sql`: `private.admins` + `public.is_admin()`; tables `services` (the seven Bookings services with prices), `people` (is_client / is_student), `enquiries`, `lessons` (Five Beats, Santuri DNA), `student_lessons`, `invoices` (numbered K-YYYY-NNN), `payments` (M-Pesa/cash/bank/card/other; trigger blocks overpaying, paying a void invoice, or a payment for a different person) and the `invoice_balances` view. RLS: admins only; anon has no grants at all.
- Verified in PGlite (scratchpad test, not yet in the repo): anon refused everywhere; another signed-in account sees no rows and can't insert or update; admin flows, invoice numbering and payment rules work. `npm run build` and `npm run check` pass and `supabase/` is not in `_site`.
- Not done: the user creates the project, runs the migration, signs in once and adds themself to `private.admins`; free projects pause after about a week idle (plan a weekly GitHub Actions ping); turn off public sign-ups in Supabase Auth.

## 2026-11-02: Supabase MCP for this folder

- Added the hosted Supabase MCP (`https://mcp.supabase.com/mcp`, HTTP, browser sign-in) in Claude Code local scope for this folder only, **full access** (user's choice) so the agent can create the Kimina project and run the migration, asking before each change.
- Not scoped to a project yet because the Kimina project doesn't exist. Once it does, re-add it with `?project_ref=<ref>` so it can't touch Santuri's projects. (Done 2026-11-02, see below.)
- Not done: the user signs in with `/mcp` → supabase → Authenticate.

## 2026-11-02: Kimina Supabase project created, stage-1 migration applied

- Project **kimina**, ref `akswkkcihswupkunstrj`, region eu-central-1 (Frankfurt), in the "Santuri East Africa"
  organisation (free plan; user's choice, this uses the account's second free-project slot). URL
  `https://akswkkcihswupkunstrj.supabase.co`.
- Applied `supabase/migrations/202611020001_admin_and_records.sql` through the MCP (as migration `admin_and_records`,
  without its `begin`/`commit` lines, since the tool wraps it in a transaction).
- Verified: 7 services and 2 lessons seeded; all 7 public tables have RLS with one admin policy each; anon has no
  select on `people` or `invoice_balances`. Security advisor raises one warning, that signed-in users can call
  `public.is_admin()`; that is intended (it only answers "am I an admin?" and the policies depend on it).
- 2026-11-02: the Supabase MCP for this folder is now scoped to `?project_ref=akswkkcihswupkunstrj` (still full access,
  so it cannot see Santuri's projects).
- 2026-11-02: user `kimina@santuri.org` created (confirmed) and added to `private.admins`; it is the only account.
- Not done: turn off public sign-ups in Auth.

## 2026-11-02: Supabase keep-alive

- `supabase/migrations/202611020002_keepalive_ping.sql` adds `public.ping()` (returns 'ok', reads no tables; anon and
  authenticated may call it). Applied through the MCP as migration `keepalive_ping`.
- `.github/workflows/supabase-keepalive.yml` calls it Mondays and Thursdays 06:00 UTC (09:00 Nairobi), plus a manual
  "Run workflow" button. It holds the project's publishable key (`sb_publishable_…`), which is public by design.
- Verified: `curl` to `/rest/v1/rpc/ping` with that key returns `"ok"`; the same key reading `people` is refused
  (permission denied). A manual run on GitHub replied "ok".

## 2026-11-02: Stage 2, hosted CMS at /admin

- `admin/` (`index.html`, `admin.css`, `admin.js`; copied through by Eleventy, `noindex`): sign-in with Supabase Auth
  email and password, then the same forms as the Mac CMS. **Save and publish** makes one commit on `main` and the
  existing deploy updates the site in about two minutes; the side panel shows the latest deploy run (polls after a save).
  Photos (JPEG/PNG/WebP) are resized in the browser to 2400 px on the long side before upload; audio up to 25 MB.
  Uploads become GitHub blobs at once and are committed with the next save, only if the entry still uses them.
- `supabase/functions/cms/index.ts` (Edge Function `cms`, deployed, `verify_jwt` off because it checks the user itself
  through `/auth/v1/user` and `public.is_admin()`): actions `state`, `list`, `read`, `upload`, `save`, `status`.
  Same field rules as `cms/server.js`; refuses a save if the file changed since it was opened (sha check) or the new
  slug already exists; retries once if `main` moved. CORS allows kimina.co.ke and 127.0.0.1/localhost:8080.
- Needs the Edge Function secret `GITHUB_TOKEN`: a fine-grained token for `Kimina-Santuri/kimina-website-main` only,
  Contents read/write and Actions read, 1-year expiry. Renew it before it expires (the page says so if GitHub refuses it).
- `supabase/functions/cms/schema.json` is generated from `cms/schema.js` by `node tools/export-cms-schema.js`;
  `npm run check` fails if it is out of date. After changing the schema, regenerate it and redeploy the function.
- The Mac CMS (`npm run cms`) stays as a fallback; both write the same files. Pull before using the Mac CMS after
  saving on /admin, or its publish will refuse (GitHub ahead).
- Verified: `npm run build` and `npm run check` pass; the function refuses no token, the publishable key and a forged
  token (401); CORS preflight from kimina.co.ke passes; sign-in and studio layouts at 375 px and desktop, no horizontal
  scroll, no console errors. The user signed in locally with `GITHUB_TOKEN` set and saved the Nyokabi entry unchanged:
  the first save committed c31fc87 (YAML formatting only: quotes dropped from five alt texts, same as the Mac CMS
  writes), the second said "No changes to save". So list, read and a real commit work. Not verified: an upload, the
  deploy-status panel after a save.

## 2026-11-02: Stage 3, Contact enquiries and records in /admin

- Contact page: a form (name, email or phone, topic, message) below the email routes, which stay. It posts to the
  public Edge Function `enquiry` (`supabase/functions/enquiry/index.ts`, `verify_jwt` off). `contact-form.js` sends it
  as JSON and shows the reply inline; without JavaScript it is a normal form post and the function redirects to
  `contact.html#enquiry-sent` / `-error` / `-limited`, shown by CSS `:target` alone.
- Spam guards: hidden `website` trap field and a 3-second minimum from page load (both answered with a fake success),
  then `public.submit_enquiry()` (migration `202611020003_contact_enquiries.sql`, service role only) allows 5 per hashed
  IP per hour and 60 a day in total. Raw IPs are never stored; attempt rows are deleted after two days.
- `enquiries.topic` added (collaboration, education, live-sound, booking, press, general); contact enquiries must have
  an email or phone. There is no email notification yet: new enquiries show as a red count on Enquiries in /admin.
- `/admin` now has Website (the CMS) and Records: **Enquiries** (status, notes, email/phone/WhatsApp links, "Add to
  people"), **People** (clients and students; their invoices, payments and lessons), **Invoices** (new invoice with
  the service price filled in, record M-Pesa/cash/bank payments, void, Print / PDF). `admin/records.js` talks to the
  tables directly with the admin's token; RLS keeps them admin-only. Public-form values are always set as text.
- Verified: migration applied; anon cannot call `submit_enquiry` or read any records query (each one parses and is
  refused); the function stores real messages, drops the trap, rejects a form with no email/phone, rate-limits on the
  sixth message, and redirects a no-JS post; the Contact page form sends from the browser and clears; Records render
  with sample data at 375 px and desktop with no horizontal scroll and no errors; invoice print content is right.
  Test rows were deleted. The user's signed-in test sent a real Contact message and the Records screens read
  enquiries, people and invoices (200 in the API logs), but no person, invoice or payment was ever written (no POST or
  PATCH logged, tables empty). Not verified: creating people, invoices and payments; the printed invoice on paper.
  "Add to people" now shows its error instead of failing silently.

## 2026-11-02: Email address removed from the site

- User's request (bots and spam). Contact: the big email link is now "Send a message ↓" to the form; the four routes
  link to `?topic=…#enquiry` and `contact-form.js` chooses that topic. Bookings: "Email Kimina" became "Send a message"
  (`contact.html?topic=booking#enquiry`). Error texts in the form, `contact-form.js` and the `enquiry` function no
  longer mention the address. The printed invoice in /admin still shows it (it goes to the client, not the site).

## 2026-11-02: GoatCounter visitor counts

- Every published page loads GoatCounter (`https://kimina.goatcounter.com/count`, script `https://gc.zgo.at/count.js`,
  async): the five static pages, `site/_layouts/base.njk` (all generated pages) and both lesson pages. No cookies;
  stats at https://kimina.goatcounter.com (the user's account, created 2026-11-02). /admin is not counted.
- Add the same line to any new standalone page (lessons, manuals are generated elsewhere and not counted).

## 2026-11-03: The Business of DJing pairs workbook

- Added `lessons/business-of-djing/` on `main` (user chose not to branch; see Lessons). Verified: `npm run build` and
  `npm run check` pass; renders at 375 px with no horizontal scroll and no console errors; both calculators reproduce the
  worked examples (KES 8,500 / 12,800 / 17,000; 64,900 and 130 tickets); tick boxes update the progress bar.
  Not verified: the PDF pages by eye (no PDF renderer here), timer beep by ear. Committed and pushed on its own;
  unrelated uncommitted changes (admin, bookings, eleventy config) were already in the tree and left alone. The `lessons` table
  in Supabase does not list this lesson yet.
