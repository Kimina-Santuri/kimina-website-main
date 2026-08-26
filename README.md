# Kimina Portfolio

A minimal black-and-white portfolio for Kimina: music producer, educator, sound engineer and creative technologist.

## Site structure

- `index.html` — landing page with the short introduction
- `works.html` — selected projects, currently beginning with the SMEM collaboration
- `bookings.html` — seven services with Calendly booking links
- `residencies.html` — residencies and research, including the current SMEM residency
- `downloads.html` — release-ready index; no downloads are published yet
- `about.html` — portrait and full biography
- `contact.html` — tailored email enquiry routes
- `404.html` — custom “Signal lost” page

The shared navigation order is Works, Bookings, Residencies, Downloads, About and Contact. The masthead tagline is `MUSIC.EDUCATION.SOUND`.

## Visual system

- Pure white backgrounds, black typography and thin black rules
- JetBrains Mono throughout
- Enlarged `K.` site mark and matching SVG favicon
- Colour photography where project or service images are used
- Mouse-reactive canvas themes:
  - Landing: Lissajous curves
  - Works: dot field
  - Bookings: signal waves
  - Residencies: orbital forms
  - Downloads: rippling grid
  - About: connected threads
  - Contact: pulse rings
  - 404: lost signal
- Subtle page transitions with static compositions for reduced-motion preferences

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
- `style.css` and `script.js` — Bookings layout, Calendly behavior and signal-wave animation

The canonical site URL is `https://kimina.santuri.org/`. Social metadata uses absolute URLs on this domain.

## Deployment

The site is static and can be hosted without a build step. `_redirects` provides extensionless route mappings and a custom 404 fallback on compatible hosts such as Netlify. Confirm equivalent rewrite behavior before changing visible `.html` links on another host.

## Verification

After changes:

```sh
node --check landing.js
node --check script.js
```

Also confirm that local references exist, the Bookings page still contains seven cards and seven `booking-link` buttons, and desktop/mobile layouts remain usable.
