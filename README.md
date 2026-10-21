# Merstat — Marketing Site

[![CI status](https://github.com/merstat/merstat-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/merstat/merstat-frontend/actions/workflows/ci.yml)

Marketing site for **Merstat Development Limited**, a Nairobi-based development
consulting firm. The site is built with [Astro 5](https://astro.build) and
self-hosted on a VPS: nginx serves the static build, and a small Node service
handles forms and CV uploads.

> Building programs. Measuring change. Sustaining impact.

## Stack

- **Astro 5** — content-driven static site with typed content collections (Zod).
- **Sveltia CMS** — git-backed headless CMS for non-technical editors at `/admin/`.
- **merstat-api** (Node) + **Cloudflare Turnstile** — form pipeline with a server-side spam check that fails closed.
- **merstat-api** + **Cloudflare R2** — CV uploads go straight to R2 via a presigned URL, keeping PII off the box.
- **Plausible Analytics** — cookieless, GDPR-clean, ~1 KB script.
- **`web-vitals`** — real-user Core Web Vitals forwarded to Plausible custom events.
- **Pagefind** — static, build-time, multilingual search.
- **TypeScript** strict mode throughout.

## Quickstart

```bash
# Install
npm ci

# Dev server (http://localhost:4321)
npm run dev

# Build
npm run build

# Preview built site
npm run preview

# Type check
npm run check

# Lint and format
npm run lint
npm run format
```

## Architecture

```
src/
├── components/         # Shared Astro components
│   ├── forms/          # ContactForm, TrainingForm, CareerForm
│   ├── SEO.astro       # Single source of truth for <head>
│   ├── Nav.astro       # Hamburger nav with native <details> disclosure
│   ├── Footer.astro    # NAP, social, legal
│   ├── Hero.astro      # Page-top hero
│   └── ServiceCard.astro, CaseStudyCard.astro, JobCard.astro
├── content/            # Typed content collections (Markdown + frontmatter)
│   ├── services/       # 13 services
│   ├── case-studies/   # 4 anonymised case studies (Proofmap 6-block)
│   ├── methods/        # 10 methodologies
│   ├── trainings/      # 11 training tracks
│   ├── jobs/           # 6 open roles
│   ├── pages/          # Long-form Markdown bodies (home, about)
│   ├── posts/          # Insights blog (future)
│   └── team/           # Team bios (future)
├── content.config.ts   # Zod schemas for every collection
├── i18n/               # Translation dictionary (en, sw, fr)
├── layouts/            # BaseLayout (page wrapper)
├── pages/              # File-based routes
│   ├── index.astro
│   ├── about.astro
│   ├── services/       # index + [slug].astro (Knapsack 7-element template)
│   ├── results.astro
│   ├── trainings.astro
│   ├── careers.astro
│   ├── contact.astro
│   ├── thanks.astro
│   └── 404.astro
├── styles/             # Single source of CSS truth
│   ├── tokens.css      # Design tokens (--color-*, --space-*, --fs-*)
│   ├── fonts.css       # Self-hosted Inter variable font
│   ├── base.css        # Reset, typography baseline, focus ring, skip link
│   └── utilities.css   # .glass-card, .section, .grid, .btn, .badge, .prose
└── utils/              # site.ts (constants), jsonld.ts (structured data)

public/
├── images/             # Partner logos, hero, team.svg
├── fonts/inter-var.woff2
├── admin/              # Sveltia CMS mount
├── method-notes/       # Lead-magnet PDFs (upload when ready)
├── og/                 # Open Graph fallback SVGs
├── manifest.webmanifest
├── robots.txt
└── favicon.svg

api/
├── server.mjs         # node:http router — /api/health, /api/presign, /api/forms/:name
├── forms.mjs          # honeypot + Turnstile verification, JSONL storage, optional email
├── presign.mjs        # AWS SigV4 presigned Cloudflare R2 PUT URLs
├── request.mjs        # normalises Web Request vs Node IncomingMessage
└── ecosystem.config.cjs  # PM2 definition

ops/
├── nginx-merstat.org.conf  # vhost: security headers, redirects, caching, /api proxy
└── merstat-deploy          # release manager; the only thing the CI deploy key can run

.github/workflows/
├── ci.yml              # lint, build, a11y, lighthouse, smoke + api tests
└── deploy.yml          # Production deploy to the VPS over SSH
```

## Editing content

There are three ways to edit content:

### 1. Sveltia CMS (recommended for non-developers)

Visit `https://merstat.org/admin/`. Log in with GitHub. Edit services,
case studies, methods, training tracks, jobs, posts, and team members in a
friendly UI. Changes commit to `main` and trigger a deploy.

### 2. Markdown in `src/content/`

Each content type is a folder under `src/content/`. Files have YAML
frontmatter validated by Zod schemas in `src/content.config.ts`. Build
will fail if frontmatter doesn't match.

```bash
# Add a new service
$EDITOR src/content/services/new-service.md

# Add a new job
$EDITOR src/content/jobs/new-role.md
```

### 3. Direct GitHub edits

Edit any `.md` file in `src/content/` via the GitHub web UI.

## Adding a new service page

1. Create `src/content/services/my-service.md`:

```md
---
title: 'My Service'
shortTitle: 'My Service'
tagline: 'A clear value-prop sentence'
summary: '1-2 sentences for cards'
description: 'Meta description (155 chars)'
icon: 'fa-leaf'
order: 50
heroOutcome: 'Outcome-led headline (Knapsack)'
empathy: '1-2 sentence problem framing'
outcomes:
  - 'Outcome bullet 1'
  - 'Outcome bullet 2'
process:
  - title: 'Step 1'
    body: 'What happens in step 1'
  - title: 'Step 2'
    body: 'What happens in step 2'
proof:
  - 'Trust bullet 1'
faqs:
  - question: 'Q?'
    answer: 'A.'
---

Body content goes here as Markdown.
```

2. Run `npm run dev` — the new page appears at `/services/my-service/`.

## Performance, accessibility, and SEO budgets

The repo enforces these budgets in CI (`lighthouserc.cjs`, `.pa11yci.json`):

- **LCP** ≤ 2.5 s, **INP** ≤ 200 ms, **CLS** ≤ 0.1 (p75, mobile)
- **Lighthouse Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 90, SEO ≥ 90**
- **pa11y**: zero new WCAG 2.2 AA failures per PR
- **HTML** ≤ 30 KB / page, **CSS** ≤ 30 KB, **Fonts** ≤ 100 KB total
- **Third-party origins** ≤ 2 (Plausible + Cloudflare Turnstile when configured)

## Deployment

Two workflows drive the project:

| Workflow     | Triggers             | What it does                                                        |
| ------------ | -------------------- | ------------------------------------------------------------------- |
| `ci.yml`     | every push, every PR | install, lint, build, smoke + API tests, a11y, Lighthouse           |
| `deploy.yml` | push to `main`       | rebuilds and deploys to the VPS over SSH (GitHub environment gated) |

There is no per-PR preview deploy — that was a Netlify feature with no
self-hosted equivalent. Reviewers should check the CI checks and, if they need
a rendered preview, ask for a manual deploy via **Actions → Deploy to VPS →
Run workflow**.

### Host setup

Already done on the VPS; documented so it can be repeated or audited:

1. `ops/nginx-merstat.org.conf` → `/etc/nginx/sites-available/merstat.org`,
   symlinked into `sites-enabled/`. Run `nginx -t` before every reload.
2. `ops/merstat-deploy` → `/usr/local/sbin/merstat-deploy`, bound to the CI
   deploy key with a forced command.
3. `api/` → `/var/www/merstat-api`, running under PM2 with `/api/` proxied to
   `127.0.0.1:3011`.
4. Add the three `VPS_*` secrets listed in [`docs/SECRETS.md`](./docs/SECRETS.md).
5. Point the `@` A record at `69.164.244.165` and issue the cert — see
   [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

### Branch protection (recommended)

On `https://github.com/MUNENE1212/Merstat-FrontEnd/settings/branches`:

- Protect `main`.
- Require pull request before merging.
- Require approvals: 1.
- Require status checks to pass before merging:
  - `Lint & type check`
  - `Build`
  - `Accessibility (pa11y)`
  - `Lighthouse CI`
- Require linear history (squash or rebase).
- Do not allow force pushes.

## Forms

Three forms post to `merstat-api` with honeypot + Cloudflare Turnstile. The
handler verifies the Turnstile token server-side and **fails closed** — if
`siteverify` cannot be reached, the submission is rejected rather than trusted:

- **Service request** — `ContactForm.astro` on `/contact/`
- **Training booking** — `TrainingForm.astro` on `/trainings/`
- **Career application** — `CareerForm.astro` on `/careers/`

CV uploads request a Cloudflare R2 presigned URL from `/api/presign`, which
checks the request `Origin` against an allow-list before signing — without that
check the endpoint would be an open, anonymous upload bucket.

**Before the site can accept real submissions**, set in
`/var/www/merstat-api/.env` on the VPS:

- `TURNSTILE_SECRET_KEY` — real secret. The test key accepts every submission.
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — CV uploads
- `ALLOWED_ORIGINS` — must include every origin the site is served from

Full list and consequences: [`docs/SECRETS.md`](./docs/SECRETS.md).

## Localisation

Translation dictionary in `src/i18n/ui.ts`. Currently ships English.
Swahili and French dictionaries are stubbed — fill them in before launching
those locales. Astro i18n config in `astro.config.mjs`.

## Migration from legacy `/templates/`

The legacy static HTML is gone. `ops/nginx-merstat.org.conf` still includes
301 redirects from the old paths (`/Bookus`, `/Aboutus`,
`/Results&Methods`, `/templates/*`) to the new canonical URLs — leave these in
place for one full year after launch, then audit Search Console for any
remaining inbound links and remove the redirects once 404 traffic is zero.

`netlify.toml` is kept in the repo purely as the historical source of the
security-header policy. The running config is the nginx vhost; if you change
headers, change both.

See [`docs/ROLLBACK.md`](./docs/ROLLBACK.md) for the rollback procedure.

## License

© Merstat Development Limited. All rights reserved.
See [`LICENSE`](./LICENSE).
