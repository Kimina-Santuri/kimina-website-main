# Kimina Portfolio

A minimal black-and-white portfolio for Kimina: music producer, educator, sound engineer and creative technologist.

## Site structure

- `index.html` — landing page with the short introduction
- `works.html` — selected projects, currently beginning with the SMEM collaboration
- `performances.html` — live archive beginning with the 2026 SMEM residency recap
- `bookings.html` — seven services with Calendly booking links
- `residencies.html` — residencies and research, including the current SMEM residency
- `smem-residency.html` — dedicated SMEM residency story, ten-image gallery and credits
- `downloads.html` — release-ready index; no downloads are published yet
- `about.html` — portrait and full biography
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
- An opt-in stellar drone on the landing page with independently crossfading voices, cursor-reactive filtering and stereo movement

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
- `images/about-web.jpg` — About portrait
- `landing.css` and `landing.js` — portfolio layouts and page-specific animations
- The landing-page sound engine is dependency-free and built with the Web Audio API. Its four voices use luminosity and distance values for Proxima Centauri, Sirius, Vega and Betelgeuse as musical control data.
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
