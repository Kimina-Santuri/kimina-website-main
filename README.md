# Kimina Portfolio

A minimal black-and-white portfolio for Kimina: music producer, educator, sound engineer and creative technologist.

## Site structure

- `index.html` — landing page with the short introduction
- `works.html` — category-aware project archive for releases, installations, instruments, research and collaborations
- `performances.html` — live archive with the Kilele Experimental Night and SMEM residency recap
- `kilele-performance.html` — Kimina For Me Please at Kilele 2026, with poster, context and seven-image gallery
- `bookings.html` — seven services with Calendly booking links
- `residencies.html` — residencies and research, including the current SMEM residency
- `smem-residency.html` — the first individual project page: SMEM residency story, ten-image gallery and credits
- `downloads.html` — release-ready index; no downloads are published yet
- `about.html` — full biography and a seven-image editorial gallery
- `contact.html` — tailored email enquiry routes
- `404.html` — custom “Signal lost” page

The shared navigation order is Works, Performances, Bookings, Residencies, Downloads, About and Contact. The masthead tagline is `MUSIC.EDUCATION.SOUND`.

## Visual system

- Pure white backgrounds, black typography and thin black rules
- JetBrains Mono throughout
- Enlarged `K.` site mark and matching SVG favicon
- Colour photography where project or service images are used
- Mouse-reactive canvas themes:
  - Landing: Lissajous curves
  - Works: dot field
  - Performances: layered waveforms
  - Bookings: signal waves
  - Residencies: orbital forms
  - SMEM residency: constellation field
  - Downloads: rippling grid
  - About: connected threads
  - Contact: pulse rings
  - 404: lost signal
- Subtle page transitions with static compositions for reduced-motion preferences
- A site-wide opt-in stellar drone combining sine, triangle and sawtooth voices, quieter upper partials and filtered noise
- Cursor-reactive filtering, evolving stereo movement, generated convolution reverb and feedback echo
- Discreet player controls for volume, an evolving luminosity/distance readout and optional session continuity between internal pages
- Persistent tonal-centre selection for A minor, F minor, C minor and D minor
- Minor-key pitches redistributed across a newly shuffled four-octave register every 30 seconds
- A randomly selected voice rises three additional octaves for a “High signal” state approximately every 90 seconds
- Textural transitions through Drift, Convergence, Transit, Flare and Afterglow without continuous pitch drift

## Run locally

Install the locked development dependencies once, then start Eleventy:

```sh
npm install
npm run serve
```

The browser receives ordinary static HTML, CSS and JavaScript. Eleventy is used only to generate the `_site/` deployment folder from the structured content and templates.

## Editorial content

- `.pages.yml` — Pages CMS form and media configuration
- `site/content/` — releases, performances, residencies and downloads
- `site/_layouts/` — shared archive and detail-page structures
- `site/_includes/` — reusable navigation
- `docs/CONTENT-WORKFLOW.md` — publishing instructions

Pages CMS saves content and media to GitHub. New entries are generated into permanent `.html` pages during deployment; there is no public CMS database or runtime API.

## Booking setup

All seven services currently use:

```text
https://calendly.com/kimina-santuri/one-on-one-sessions
```

Every booking button has the `booking-link` class. When the Calendly widget is unavailable, links continue to work as normal navigation.

## Assets and metadata

- `images/favicon.svg` — white-square `K.` favicon
- `images/og-portfolio.jpg` — current 1200 × 630 portfolio social card
- `images/smem.jpg` — original SMEM residency photograph used by Works and Residencies
- `images/kilele/poster.jpg` — lead image for the Kilele Experimental Night performance
- `images/kilele/` — poster and seven supplied performance photographs used by the Kilele detail page
- `images/about/` — seven photographs used by the About portrait and gallery
- `landing.css` and `landing.js` — portfolio layouts and page-specific animations
- `stellar-player.js` — dependency-free Web Audio player shared by every page. Its four voices use luminosity and distance values for Proxima Centauri, Sirius, Vega and Betelgeuse as musical control data.
- `bookings.css` and `bookings.js` — Bookings layout, Calendly behavior and signal-wave animation

The canonical site URL is `https://kimina.santuri.org/`. Social metadata uses absolute URLs on this domain.

## Deployment

`.github/workflows/deploy.yml` installs the locked Eleventy version, builds `_site/`, validates the result and deploys the static artifact to GitHub Pages. The repository’s Pages source must be set to **GitHub Actions** before merging the migration into `main`.

`CNAME` keeps the canonical `kimina.santuri.org` domain in the generated artifact. `.nojekyll` prevents additional Jekyll processing. `_redirects` works only on compatible hosts such as Netlify; GitHub Pages ignores it, so visible navigation retains `.html` links.

## Verification

After changes:

```sh
npm run build
npm run check
```

The check covers `landing.js`, `bookings.js` and `stellar-player.js`, local generated references, the shared masthead/favicon, the seven booking cards and links, and the Downloads empty state. Desktop, tablet and mobile layouts should also be inspected before publishing design changes.
