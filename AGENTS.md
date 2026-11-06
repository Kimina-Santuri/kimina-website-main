# Kimina Portfolio — Codex Handoff

## Purpose

This is Kimina’s static personal portfolio for music, education, sound engineering, creative technology, residencies and bookings. Keep it minimal, editorial and professional. The site should feel like one coherent artistic identity while giving each destination its own generative visual theme.

## Product decisions to preserve

- Use pure white backgrounds, black typography and thin black rules. Photography may remain in colour.
- Use JetBrains Mono throughout.
- Keep the enlarged `K.` mark at the upper left and the exact masthead tagline `MUSIC.EDUCATION.SOUND` at the upper right.
- Keep shared navigation in this order: Works, Performances, Bookings, Residencies, Downloads, Tech, About, Contact.
- Desktop navigation stays fixed on the left; mobile navigation becomes a bordered bottom bar.
- Keep page content restrained, with generous whitespace and square geometry.
- Maintain semantic HTML, descriptive image alt text, visible keyboard focus styles and reduced-motion support.
- Do not invent projects, releases, credits, social profiles or downloadable materials. Add them only when the user provides factual content or assets.
- Downloads contains only user-supplied entries and external destinations. Do not invent or claim files, releases or products.
- Performances currently contains the 24 February 2026 Kilele Experimental Night, the 8 August 2026 Nyokabi Kariuki farewell performance at The Mist and the 5 September 2026 SMEM residency recap with Goffbaby. Add further entries only when the user supplies event details, credits or documentation.
- Keep the stellar drone opt-in. It may restore only when a visitor has explicitly enabled both playback and the session-only “Continue between pages” option; otherwise never autoplay audio.

## Current pages and animation themes

- `index.html`: landing page, short introduction and the alien orrery (`orrery.js`, not `landing.js`; see 2026-11-06 below)
- `works.html`: selected work and reactive dot field
- `performances.html`: live archive and layered waveforms
- `kilele-performance.html`: Kimina For Me Please at Kilele Experimental Night, poster, context and seven-image gallery
- `bookings.html`: booking calendar at the top, service cards below, flowing signal waves
- `residencies.html`: residency archive and orbital forms
- `smem-residency.html`: dedicated SMEM residency story, twelve-image gallery, credits and constellation field
- `downloads.html`: external shops/download destinations and rippling grid
- `tech.html`: websites and software, generated from `site/tech.njk`, constellation field
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

- Desktop uses three columns and centers the seventh card. Tablet uses two columns and mobile uses one. The page column is centred on desktop (clear of the fixed left navigation) and the cards are separate boxes with a gap (24 px desktop, 20 px tablet, 16 px mobile).
- Do not add feature lists unless explicitly requested.
- Keep the small regular-weight metadata line on every card with its duration, format and price.
- Keep the compact bordered contact panel below the cards.
- The full About section no longer belongs on Bookings; it lives at `about.html`.
- Keep the `K.` and Santuri logo lockup in the booking masthead.
- Since 2026-11-03 the booking calendar sits at the top of `bookings.html` (`#book`), with the seven service cards below it; each card's "Choose a time" button (`data-service`) selects that service in the calendar and scrolls up to it (without JavaScript it opens `bookings.html?service=<slug>#book`). `book.html` only forwards old links, keeping `?service=` and `?cancel=`. Calendly is no longer used.
- Every booking button must retain the `booking-link` class.

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

## 2026-11-02: Stage 4, own booking calendar (replaces Calendly)

- User's choices: bookings are confirmed instantly; busy = this system's bookings and blocks plus Kimina's Google
  Calendar; emails from kimina@santuri.org through Zoho SMTP; hours Mon–Sat 09:00–18:00 (editable in /admin).
  Defaults chosen by the agent and editable in /admin → Calendar → Hours & settings: 60-minute sessions starting on
  the hour, 12 hours' minimum notice, 60 days ahead. Services keep their `price_note`; no payment at booking.
- Database: migrations `202611020004_booking_calendar.sql` and `202611020005_booking_cancel_link.sql` (both applied).
  Tables `booking_settings`, `booking_hours` (0 = Sunday), `booking_blocks`, `bookings` (an exclusion constraint makes
  overlapping live bookings impossible), `services.session_minutes`; private `calendar_busy`, `calendar_state`,
  `email_outbox`, `booking_attempts`. A trigger on `bookings` queues every email (confirmation, Kimina's alert,
  cancellation, client-cancel notice, moved) and marks the Google event for sync; Contact enquiries now queue an alert
  email too. Public (anon) may only call `booking_services()` and `booking_slots()`; booking, cancelling and the worker
  helpers are service-role only. Clients are added to People (matched by email or phone) as clients.
- Edge Functions: `booking` (public: book, look up and cancel by the 48-hex cancel token; asks Google about the exact
  time first, then `create_booking()` re-checks; 3 bookings per visitor per day, 40 a day in total; honeypot and 4 s
  minimum) and `worker` (pg_cron `kimina-booking-worker` every 5 minutes with the Vault secret `worker_secret`, and
  nudged right after a booking or cancel): reminders 12–30 h ahead for bookings made earlier than that, Google busy
  times for the bookable window, Google events (`kb<uuid>` ids, deleted on cancel), then the email queue (6 tries with
  growing gaps). Shared Google code: `supabase/functions/_shared/google.ts` (service account, `calendar.events` scope).
  Email wording: `supabase/functions/worker/emails.ts`.
- Pages: `book.html`, `book.css`, `book.js` (service → month grid → times → details; `?service=` preselects,
  `?cancel=<token>` shows the cancel screen; phone-only clients see their cancel link on screen). /admin Records →
  Calendar: upcoming/past/cancelled bookings (cancel, done, no-show, private notes), blocks, hours and settings, and a
  health panel (Google busy-time refresh, email queue and last error).
- Secrets (all set 2026-11-03, see below): `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (calendar
  kimina@santuri.org shared with the service account, "Make changes to events") and the SMTP ones for ZeptoMail.
- Verified: free times (12 h notice, 09:00–17:00 starts, Sunday closed); in a rolled-back transaction a booking,
  a refused overlap, person linking, the four queued emails and cancel-by-token; anon refused on every table and
  private function; worker refuses no/wrong secret and runs from pg_cron (200); a real browser booking on the local
  preview, a refused second booking of the same time for another service, and cancelling by link (test rows, person,
  queued emails and attempts deleted afterwards); /admin Calendar screens with sample data; 375 px layouts.
  Not verified: Google Calendar and Zoho (no credentials yet), reminder emails, the admin screens against real data.

## 2026-11-03: The Business of DJing pairs workbook

- Added `lessons/business-of-djing/` on `main` (user chose not to branch; see Lessons). Verified: `npm run build` and
  `npm run check` pass; renders at 375 px with no horizontal scroll and no console errors; both calculators reproduce the
  worked examples (KES 8,500 / 12,800 / 17,000; 64,900 and 130 tickets); tick boxes update the progress bar.
  Not verified: the PDF pages by eye (no PDF renderer here), timer beep by ear. Committed and pushed on its own;
  unrelated uncommitted changes (admin, bookings, eleventy config) were already in the tree and left alone. The `lessons` table
  in Supabase does not list this lesson yet.

## 2026-11-03: Google Calendar connected

- The user set up the Google service account and the secrets. The first real runs found two bugs, both fixed:
  `set_calendar_busy()` updated `calendar_state` with no WHERE clause, which Supabase refuses (migration
  `202611030001_calendar_busy_fix.sql`, applied; 0004 edited to match), and Google's freeBusy needs the
  `calendar.freebusy` scope as well as `calendar.events` (`_shared/google.ts`; `worker` and `booking` redeployed).
- Verified: a worker run read 9 busy periods from kimina@santuri.org. Not verified yet: creating an event (no
  bookings exist), email (the worker still reports SMTP_USER or SMTP_PASS missing).
- Email (same day): Zoho refuses every SMTP sign-in from Supabase (535 Authentication Failed) on smtppro.zoho.com
  and smtp.zoho.com, with PLAIN and LOGIN, although the same address and the same app password (matching 6-character
  SHA-256 fingerprint) sign in fine from the Mac (`smtplib`, both servers). IMAP/POP are on and the user is the Zoho
  admin. So Zoho is blocking sign-ins from Supabase's servers. The worker now cleans pasted values, tries both Zoho
  servers and both methods when `SMTP_HOST` is unset, only signs in when emails are queued, and logs server, method,
  username and a password fingerprint (never the password) with each failure. The two test emails were paused
  (`next_try_at` +7 days) to avoid locking the Zoho account. Test booking 05fbf484… (6 Nov 09:00) and its Google
  event still exist. Next: user's choice of a fix (see the chat), then cancel the test booking.
- Fix (same day): email now goes through **ZeptoMail** (Zoho's service for website email, already paid for on the
  user's account), Mail Agent `KiminaWebsite` on santuri.org. Secrets: `SMTP_HOST` smtp.zeptomail.com, `SMTP_USER`
  emailapikey, `SMTP_PASS` the agent's SMTP password (set by the user), `SMTP_FROM` kimina@santuri.org (needed because
  the username isn't an address), `SMTP_SENDER_NAME` Kimina. Save dashboard secrets one at a time: "Bulk save" with
  several rows stored nothing (twice). The dashboard's Digest column is SHA-256 of the value, handy for checking.
- Verified end to end: the test booking's confirmation and Kimina's alert sent through Zepto and arrived (user
  confirmed); cancelling by its link sent both cancellation emails and deleted the Google event. Test booking,
  its TEST person, four emails and attempt row deleted afterwards. Not verified: the reminder email, /admin
  Calendar screens against real data, book.html live (not pushed yet).

## 2026-11-03: Bookings page cards redesigned

- User's request ("rework the bookings page", then "Redesign the cards"; no specific notes). Kept every booking
  decision above: three columns with the seventh centred, two on tablet, one on mobile, the metadata line, the
  contact panel, the masthead and seven `booking-link` buttons; card wording unchanged.
- Each card now has a numbered top row (01–07 with the category), a 3:2 photo, and a full-width "Choose a time →"
  bar (54 px tall; a visually hidden "for <service>" keeps the seven links distinct for screen readers). A
  three-step strip under the heading says how booking works (choose a session; pick a free day and time in Nairobi
  time; confirmation email with a cancel link). Card borders are drawn per card, so no stray line runs beside the
  centred seventh card.
- Photos: the seven originals totalled about 16 MB (four were 6000 px wide). `images/services/<slug>-480.jpg` and
  `-900.jpg` are 3:2 centre crops (Pillow, quality 70, progressive) used with `srcset`: about 144 KB for all seven at
  480 px and 368 KB at 900 px. Originals are kept and unchanged. Each crop was checked by eye (no black frames).
- Alt texts rewritten to describe what each photo actually shows (several described a different scene).
- Verified: `npm run build` and `npm run check` pass; desktop (prices and buttons aligned across each row), 800 px
  (two columns) and 375 px (one column) with no horizontal scroll; book.html still renders and preselects the
  service; no console errors. Not verified: a real phone on mobile data.

## 2026-11-03: Calendar moved onto the Bookings page

- User's request: the booking calendar at the top of the Bookings page and the cards below it, linking back up;
  cards centred with space between them; new card text (drafted by the agent from the old wording, same prices and
  metadata, approved by the user). Heading "Book a session" with the intro, the three-step strip and the calendar;
  then "The sessions" with the seven cards.
- `book.js` handles the card buttons (selects the service, hides a finished booking panel, scrolls to `#book` and
  focuses it; a click before the services load is kept and applied). `book.html` is now a noindex forwarding page.
  Email links (cancel, book again) point to `bookings.html…#book`; `worker` redeployed.
- Verified: build and check pass; a card button selected Mixing & Mastering, scrolled to the calendar and loaded
  its free days; `book.html?cancel=…` and `book.html?service=recording` forward with their query; 375 px with no
  horizontal scroll; no console errors. Not verified: a booking made from the new page (same code as before).

## 2026-11-03: Stage 5, student materials by private link

- User's choices: private link per student (no sign-in, no email codes, no checking against People "for now, low
  traffic, might change"); materials are uploaded files, links and a note per student.
- Migration `202611030002_student_materials.sql` (applied): `student_pages` (name, note, 48-hex `token`, `active`,
  `last_opened_at`, optional `person_id`), `materials` (file with `storage_path`/`file_name`/`size_bytes`, or https
  `url`; `for_all`), `material_pages` (which pages get which material). RLS admin-only. Private Storage bucket
  `materials` (50 MB per file, the free plan's limit; 1 GB in total on the free plan), admin-only policy on
  `storage.objects`. `public.student_page(token)` and `public.student_file(token, id)` are service-role only.
- Edge Function `learn` (public, `verify_jwt` off): `page` returns the note and items; `file` returns a Storage
  download link valid 5 minutes, made only when the student taps Download.
- `learn.html` + `learn.js` + `learn.css`: the student page, opened as `kimina.co.ke/learn.html#<token>`. The token is
  after `#`, so it never reaches servers or analytics; `noindex`, `no-referrer`, no GoatCounter. Not linked anywhere.
- /admin Records: **Student pages** (create; copy link, "Send on WhatsApp", "New link" which ends the old one; note;
  switch off; tick materials; delete) and **Materials** (upload a file or add a link, give it to all students or tick
  students; delete removes the stored file too).
- Verified: rolled-back SQL test (a page sees its own and all-students items only; another student's file refused;
  switched-off and unknown links return nothing); anon refused on the tables, functions and bucket; through the
  local /admin (user's existing session): created page and link, uploaded a PDF, the student page listed both, the
  download returned the file intact, switching the link off showed "Link not found", deleting removed rows and the
  stored file. Test data deleted. Security advisor: nothing new. Not verified: a real phone, large files, the
  WhatsApp button.
- Later, if traffic grows: email codes or a People check could be added on top of `student_pages`.

## 2026-11-03: Bookings numbers removed, learners link

- User's request: removed the 01–07 card numbers and the 01–03 numbers in the how-booking-works strip (nothing else
  changed; a centre-everything version was tried and dropped at the user's request). Added a "For learners" panel
  under "Not sure what you need?" linking to `learn.html`; opened without a private link, that page now explains
  where the link is and offers "Ask Kimina for your link" (Contact form, education topic).
- Verified: build and check pass; desktop render of the cards and both panels. Not verified: phone render of the
  new panel (same styles as the existing contact panel).

## 2026-11-03: Day timeline next to the free times

- User's request: "a simple visual with when I'm busy" by the Time step. Migration `202611030003_booking_day.sql`
  (applied) adds `public.booking_day(date)` (anon may call it): the day's open hours, the earliest bookable moment
  (minimum notice) and busy periods from bookings, blocks and Google Calendar busy times, merged (`range_agg`) and
  clipped to the open hours, with no titles or details. Null for closed, past and out-of-window days.
- `book.js` fetches it when a day is chosen (cached; cleared after a booking or a "taken" reply) and draws a bar:
  black = busy, hatched = too soon, outlined = the chosen session, with hour marks, a legend and a plain-words
  `aria-label`. Styles in `book.css` (`.day-line…`).
- Verified: rolled-back SQL test (overlapping blocks merged, a block past closing clipped); real data shows the
  11:00–13:00 Google busy time on 4 Nov in black with those hours missing from the buttons; desktop and 375 px.
- Note: this does publish when Kimina is busy (not what or why), at the user's request.
- 2026-11-03: minimum notice changed from 12 to 6 hours (user's request), in `booking_settings.min_notice_hours`
  (also editable in /admin → Calendar → Hours & settings). No page text mentions the number.

## 2026-11-03: Extra calendars that count as busy

- User's report: real busy times were missing because they live in other Google calendars. Migration
  `202611030004_extra_busy_calendars.sql` (applied) adds `booking_settings.busy_calendar_ids` (up to 20) and changes
  `set_calendar_busy()`: a non-null list always replaces the busy copy (with any problem recorded as the error);
  null only records the error, so a total failure keeps the last good copy.
- `_shared/google.ts`: `busyAcross(ids, from, to)` asks freeBusy for all calendars in one request and returns the
  merged busy list plus one problem line per unreadable calendar (`busyBetween` removed). `worker` and `booking`
  (live check before saving) use the main calendar plus the extras; bookings are still written only to
  `google_calendar_id`. /admin → Calendar → Hours & settings has "Other calendars that count as busy" (one ID per
  line) with a hint on finding IDs and sharing them ("See only free/busy" is enough).
- Verified: worker with no extras reads 9 busy periods; with a made-up extra ID it kept the 9, reported
  "… is not shared with the booking system" in the health panel's error, and the error cleared once removed.
  Not verified: a real second calendar (the user adds their IDs and shares them).
- Calendars that are only subscribed by URL (iCal links) or live outside Google can't be checked this way.

## 2026-11-06: Alien orrery on the landing page

- User's request: "the green and white and red version" of the Alien Orrery (`~/Documents/alien-orrery`) on the landing
  page, with systems randomising automatically. I took that to be the deep green and red look of chart 108 and put it on
  the site's pure white instead of pale pink: paper `#ffffff`, ink `#17463f`, ink2 `#7a9272`, accent `#b81f24`.
- `orrery.js` is generated once from the orrery's `index.html` and then lives here on its own: later changes must be made
  in both copies. Differences: one palette, no caption or buttons, no URL hash (the page uses `#about`), no page-wide CSS
  variables, suns kept right or top and clear of the navigation, home view not used. It draws on `.orrery-canvas`; the
  landing page no longer has `.ambient-canvas`, so `landing.js` draws nothing there (the Lissajous code is simply unused).
- Behaviour: a random system per visit, a 6 s dissolve to a new one every 120-180 s (only while resting on the chart), the
  random zoom from home world to supercluster. Nothing is drawn while the intro is scrolled away or the tab is hidden.
  `LITE` devices (4 cores or fewer, or 4 GB or less) get charts with no zoom; reduced-motion and Save-Data get one still.
  Test with `?seed=42`, `?still=1`, `?t=30`, `?z=2`.
- `landing.css`: `.orrery-canvas` uses `100lvh` so a phone's address bar doesn't trigger rebuilds; `.home .bio` is solid
  white; small home-page labels have white backings for legibility. `package.json` check and `eleventy.config.js` include
  `orrery.js`. Adds 92 KB (about 27 KB compressed).
- Verified: `npm run build` and `npm run check` pass; desktop and 390 px stills across several systems, with no horizontal
  scroll at 1440 px. In real Chrome at 1440x900 with shortened timers: the animation runs, systems change on their own
  (dissolve hides a stall of 0.3-0.4 s, up to about 0.6 s when LITE was forced), 0 frames while scrolled away, 120 frames
  a second after returning, no page errors, a median frame gap of 8.3 ms. Reduced motion with Chrome's own flag: one
  identical still at 3 s and 12 s.
- Not verified: a real phone (LITE memory and speed are the main risk), a real Save-Data connection, normal-speed swap
  timing watched by eye, Safari. **Not committed or pushed**: waiting for the user's go-ahead after the local preview.
  Unrelated untracked `Five Beats - SEMA.pdf` and `lesson-10-mix-missions.html` were left alone.
- Same day, user's requests: everything slowed ("20-30 secs"): journeys and pauses 20-30 s, and `PACE` 0.43 runs orbits, ships
  and suns at under half the full orrery's speed. Lanes to quick worlds (orbit under 90 s) end at a fixed port on the orbit,
  and ships are timed to meet the world there (`syncShips`), because tied lanes swung wildly. Radio and FTL comms added
  (`makeComms`, `drawComms`): radio from living worlds and home out to neighbourhood scale, FTL flashes at every scale.
  Verified: 60 systems with no lane still tied to a quick world and a 0 px miss between ships and worlds at ports (measured
  on the full orrery, same code); site test with shortened timers in real Chrome, full and LITE, no page errors; build and check
  pass. Not verified: a real phone (the user is testing after this push), Safari on iPhone. Pushed to `main` at the user's
  request. This supersedes "not committed or pushed" above.
- Caching: kimina.co.ke's `landing.css` is served with `max-age=14400` (4 hours), so the first push showed returning visitors the old
  stylesheet with an unpositioned canvas, which broke the page. Fixed with `?v=orrery1` on the home page's `landing.css` and `orrery.js`
  (raise it when either changes) and by `orrery.js` positioning its own canvas. Any other CSS change on this site has the same delay.

## 2026-11-06: Tech section and Orrery download

- User's request: a new section for tech work, listing the Santuri websites, Push 2 × Traktor, Daisy's site, ZAHABU's site and the orrery
  (the user confirmed Daisy and ZAHABU are happy to be listed), plus the Orrery as a download with a public MIT GitHub repo and an unsigned app.
  The user didn't choose a name or position, so I picked "Tech", after Downloads; easy to change.
- `site/tech.njk` is hand-written (not a CMS collection) and reuses the Works list classes, so `landing.css` is unchanged. `site/content/downloads/orrery.md`
  links to the release at github.com/Kimina-Santuri/alien-orrery. "Tech" added to `nav.njk` and the five static pages with a menu. Descriptions come
  only from each project's own AGENTS.md. No dates or claims beyond those.
- The website's `orrery.js` stays as pushed: it doesn't have the Mac app's living civilisations or new world types.

