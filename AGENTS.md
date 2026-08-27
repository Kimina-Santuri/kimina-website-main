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
- Downloads must remain an honest empty index until real files are supplied.
- Performances contains the 24 February 2026 Kilele Experimental Night and the 5 September 2026 SMEM residency recap with Goffbaby. Add further entries only when the user supplies event details, credits or documentation.
- Keep the stellar drone opt-in. It may restore only when a visitor has explicitly enabled both playback and the session-only “Continue between pages” option; otherwise never autoplay audio.

## Current pages and animation themes

- `index.html`: landing page, short introduction and Lissajous curves
- `works.html`: selected work and reactive dot field
- `performances.html`: future live archive and layered waveforms
- `kilele-performance.html`: Kimina For Me Please at Kilele Experimental Night, poster, context and seven-image gallery
- `bookings.html`: service cards and flowing signal waves
- `residencies.html`: residency archive and orbital forms
- `smem-residency.html`: dedicated SMEM residency story, ten-image gallery, credits and constellation field
- `downloads.html`: future releases and rippling grid
- `about.html`: full biography and connected threads
- `contact.html`: enquiry routes and cursor-following pulse rings
- `404.html`: custom “Signal lost” page and reactive signal line

All portfolio animations live in `landing.js` and are selected through the body’s `data-animation` attribute. The Bookings animation and Calendly behavior live in `bookings.js`. Pointer response should stay subtle. Reduced-motion users receive a static frame, not continuous animation or page transitions.

Every page includes the dependency-free Web Audio stellar drone from `stellar-player.js`. It starts only after visitor consent, fades smoothly, suspends while the page is hidden and responds subtly to cursor position through filtering and stereo movement. Four independently fading sine, triangle and sawtooth voices are mapped to Proxima Centauri, Sirius, Vega and Betelgeuse, joined by quieter upper partials and a slowly breathing filtered-noise layer. Generated convolution reverb and feedback echo provide depth. The saw voice stays deliberately quieter than the rounder waveforms. Voices hold minor-seventh chord tones while timbre, balance, filtering, space and effects move through 30-second Drift, Convergence, Transit, Flare and Afterglow states. At each state change, shuffle the four chord tones discretely across octave offsets −1, 0, +1 and +2; this creates register movement without continuous pitch drift. Every third state, randomly choose one voice for a “High signal” event three octaves above its assigned register; return it to the normal spread at the next state. The visitor-selected tonal centre may be A minor, F minor, C minor or D minor. A conventional shallow vibrato keeps the voices alive without creating slow tuning drift. Log-compressed luminosity shapes level and brightness; distance shapes spectral focus and fade duration. The expandable panel provides key, volume, an evolving star-data readout and a session-only continuity option. Browsers may require a manual resume after navigation; preserve that honest fallback state. Treat this as musical sonification rather than a literal representation of stellar sound.

## Works and residencies

- The only documented project currently shown in Works is the 2026 SMEM collaboration with Goffbaby. Do not populate empty categories with invented work.
- Works filters distinguish releases, installations, instruments, research and collaborations. SMEM is currently classified as research and collaboration, and links directly to its individual detail page.
- Each future documented work should receive its own detail page based on the semantic `project-main` structure used by `smem-residency.html`.
- Every visible HTML mention of Goffbaby should link to `https://goffbaby.com` in a new tab with `rel="noopener"`. Metadata and documentation references are plain text because they cannot provide contextual page links.
- The Residencies page describes the current three-week residency at the Swiss Museum and Centre for Electronic Music Instruments in Fribourg, developed through a Pro Helvetia Synergies collaboration.
- The documented closing recap and live set date is 5 September 2026.
- `images/smem.jpg` is the original user-supplied portrait photograph and is the active source on Works and Residencies.
- `images/smem-web.jpg` was produced by a failed conversion and renders black. Do not use it.
- The SMEM image should remain portrait-oriented to the left of the residency text on desktop and stack above it on mobile.
- The SMEM index entry links to `smem-residency.html`. Use that detail page as the template for future residency pages, with an editorial introduction, factual project description, responsive gallery, credits and previous/next navigation.
- Do not duplicate a photograph merely to make the gallery appear larger. Add gallery items only when the user supplies additional images.
- The active SMEM detail gallery uses the ten JPEGs inside `images/smem/`. Keep their descriptive alt text, lazy loading and natural image proportions. Ignore `.DS_Store` and `jpegmini_optimized.zip`.

## Kilele performance

- `kilele-performance.html` documents Kimina For Me Please at Kilele Experimental Night from 22:00 to 23:00 on 24 February 2026 at The Mist, The Mall, Westlands, Nairobi.
- `images/kilele/poster.jpg` is the lead image on the archive and detail page.
- The seven other JPEGs in `images/kilele/` form the performance gallery; preserve their natural proportions, descriptive alt text and lazy loading.
- Verified public context: Kilele’s third edition ran 23–28 February 2026 under the theme “Sound and Solidarity.” The user confirmed The Mist as the Experimental Night venue and 22:00–23:00 as Kimina For Me Please’s performance time.

## About and contact

- `about.html` contains the full biography originally written for the booking page. Preserve its wording unless the user explicitly requests a rewrite.
- The About portrait-and-copy composition is deliberately smaller and centered within the available page area, followed by a responsive editorial gallery using the seven photographs in `images/about/`.
- The shorter biography on the landing page is an introduction and remains separate from the full About text.
- Contact provides email routes for creative collaborations, workshops and education, live sound, and press/general enquiries.
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

## Technical constraints

- No framework, backend, database, dependency manager or build step is required.
- Keep CSS and JavaScript external rather than moving them inline.
- Prefer plain HTML, CSS and JavaScript over new dependencies.
- Page transitions should ignore external, mailto, hash and new-tab links.
- `.nojekyll` is included for GitHub Pages. `_redirects` is ignored by GitHub Pages and provides extensionless aliases only on compatible hosts. Visible links retain `.html` for GitHub Pages and direct-file compatibility.
- The canonical production domain is `https://kimina.santuri.org/`. Keep social-image URLs absolute on this domain.
- Do not restore the obsolete booking-oriented `images/og-image.jpg` in current metadata unless explicitly requested.

## Verification after edits

- Run `node --check landing.js`, `node --check bookings.js` and `node --check stellar-player.js`.
- Confirm every local `src` and stylesheet/script reference exists.
- Confirm every main page uses `images/favicon.svg` and the exact tagline `MUSIC.EDUCATION.SOUND`.
- Confirm Bookings still contains seven service cards and seven `booking-link` buttons unless the request changes that number.
- Confirm Downloads does not claim or link unreleased files.
- Check desktop, tablet and mobile layouts when browser rendering is available.
- Visually inspect newly converted images before referencing them; prior conversion tooling produced a valid-looking but black JPEG.

Last reviewed: 2026-08-26.
