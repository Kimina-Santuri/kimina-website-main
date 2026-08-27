# Content workflow

The public site is generated from structured content and static templates.

## Editing content

1. Open [Pages CMS](https://app.pagescms.org/) and sign in with the GitHub account that can edit this repository.
2. Install or grant the Pages CMS GitHub App access to this repository.
3. Choose Releases, Performances, Residencies or Downloads.
4. Create or edit an entry. Keep `Published` disabled while the entry is incomplete.
5. Supply factual copy, descriptive image alternative text, credits and working links.
6. Enable `Published` and save when the entry is ready.

Pages CMS writes the entry and uploaded media to GitHub. A push to `main` triggers the build, validation and GitHub Pages deployment workflow.

## Local preview

```sh
npm install
npm run serve
```

The generated site is written to `_site/`. Do not edit `_site/` directly; it is disposable build output.

## Content locations

- `site/content/releases/` — documented releases and their detail pages
- `site/content/performances/` — upcoming events and archived performances
- `site/content/residencies/` — residency index entries and detail pages
- `site/content/downloads/` — downloadable files; unpublished or fileless entries are not listed
- `site/_layouts/` — shared page structures
- `site/_includes/` — shared masthead and navigation fragments
- `images/` — public images and uploaded media

The current Kilele and SMEM entries are the factual reference examples. Do not duplicate their photographs or invent missing credits, links or release files.
