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
- A site-wide opt-in stellar drone with independently crossfading fundamentals and upper partials, cursor-reactive filtering and evolving stereo movement
- Discreet player controls for volume, an evolving luminosity/distance readout and optional session continuity between internal pages
- Persistent tonal-centre selection for A minor, F minor, C minor and D minor
- Thirty-second generative transitions through Drift, Convergence, Transit, Flare and Afterglow harmonic fields

## Run locally

There is no build step or dependency installation. Open `index.html` directly, or run:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

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

The site is static and can be hosted without a build step. `.nojekyll` prevents GitHub Pages from applying Jekyll processing. `_redirects` works only on compatible hosts such as Netlify; GitHub Pages ignores it, so visible navigation retains `.html` links.

## Verification

After changes:

```sh
node --check landing.js
node --check bookings.js
```

Also confirm that local references exist, the Bookings page still contains seven cards and seven `booking-link` buttons, and desktop/mobile layouts remain usable.
