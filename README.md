# Kimina Bookings

A lightweight, responsive booking website for Kimina's music production, education, recording and live sound services at Santuri East Africa.

## Current services

1. Music Production Tutoring
2. DJ Tutoring
3. Production Session
4. Mixing & Mastering
5. Recording Services
6. Sound Tech & Live Engineer
7. General Consultation

## Run locally

There is no build step or package installation. Open `index.html` directly in a browser, or run a static server from the project directory:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Booking setup

All seven service cards use the current Calendly booking event:

```text
https://calendly.com/kimina-santuri/one-on-one-sessions
```

Each card has the `booking-link` class and opens this event in the Calendly popup. If dedicated events are created later, replace the relevant card URLs in `index.html`.

Every service card displays its own duration, delivery format and starting price. Additional booking requirements are collected through the Calendly form.

## Project structure

- `index.html` — semantic page content, seven service cards and booking links
- `style.css` — black-and-white visual system and responsive layouts
- `script.js` — Calendly popup integration, automatic footer year and topographic canvas animation
- `images/` — logos and service photography
- `AGENTS.md` — project context and editing guidance for future Codex sessions

The production site URL is `https://kimina.santuri.org/`. Open Graph and Twitter Card metadata use `images/og-image.jpg` for social previews.

## Design notes

- The interface uses only black and white.
- The masthead has a small logo on the left and a small “Production · Education · Sound” tagline on the right.
- Cards do not contain feature lists.
- The final card is centered on three-column desktop layouts.
- An About Kimina section appears beneath the service cards and above the contact panel.
- Layout changes to two columns below `920px` and one column below `620px`.
- Motion-sensitive visitors receive a static background through `prefers-reduced-motion`.

## Deployment

The project consists entirely of static files and can be deployed to GitHub Pages, Netlify, Cloudflare Pages or any standard web host.
