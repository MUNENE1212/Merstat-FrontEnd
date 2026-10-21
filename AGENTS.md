# AGENTS.md — Working agreements for AI agents and humans

## Architecture (single source of truth)

- **Layouts** — only `BaseLayout.astro` exists. New pages import it.
- **Components** — `<Nav />`, `<Footer />`, `<SEO />` are shared. Pages MUST
  use `<SEO />`; do not write raw `<meta>` tags in pages.
- **Styling** — only `tokens.css`, `fonts.css`, `base.css`, `utilities.css`.
  Component styles live in `<style>` blocks inside Astro components.
- **Content** — every page section that lists services / case studies / jobs /
  methods / trainings pulls from `src/content/*` collections. Never hardcode
  arrays of content in `.astro` files.
- **i18n** — use `useTranslations(getLangFromUrl(Astro.url))` for user-visible
  strings. Never hardcode strings in templates; add them to `src/i18n/ui.ts`.
- **JSON-LD** — builders live in `src/utils/jsonld.ts`. Add a new builder if
  the type isn't there; don't handwrite JSON-LD in pages.

## Conventions

- **File names**: kebab-case for content files (`dced-systems-mel.md`).
- **Routes**: trailing slash (`/services/`, `/services/dced-systems-mel/`).
- **Frontmatter**: every collection field is defined in `src/content.config.ts`.
  Build fails on schema mismatch.
- **Images**: AVIF first, WebP fallback, JPEG last. Always `width`/`height`.
  Use Astro's `<Image />` component for responsive `srcset`.
- **CSS**: prefer tokens (`var(--space-4)`, `var(--color-accent)`) over raw values.
- **Accessibility**: every interactive control needs a `min-height: 44px`,
  every `<img>` needs an `alt`, every form `<input>` needs a `<label>`.
- **Forms**: every form must have a honeypot input named `bot-field` and a
  hidden `form-name` input matching the form's `name` attribute. Both are
  enforced server-side by `api/forms.mjs` — dropping one silently disables
  spam filtering for that form.
- **Links**: internal links use trailing-slash absolute paths (`/services/`,
  not `services.html`).

## Workflow for a content change

1. Edit the relevant `.md` file in `src/content/`.
2. `npm run dev` and check the change at `http://localhost:4321/`.
3. Run `npm run format` and `npm run lint:fix`.
4. Commit. CI runs Lighthouse + pa11y.

## Workflow for a new page

1. Add the route under `src/pages/` (e.g. `src/pages/insights/index.astro`).
2. Add content collection if needed (`src/content.config.ts`).
3. Add translations to `src/i18n/ui.ts`.
4. Add nav link to `src/utils/site.ts` `NAV_LINKS`.
5. Add JSON-LD builder to `src/utils/jsonld.ts` if new type needed.
6. Update sitemap priority in `astro.config.mjs` if needed.

## Workflow for a new form

1. Create `src/components/forms/MyForm.astro`.
2. Use `<form name="…" method="POST" action="/api/forms/myform">`.
3. Include a hidden `<input type="hidden" name="form-name" value="myform">`
   — the handler rejects a mismatch.
4. Include the honeypot: a `bot-field` input hidden from humans. It must be
   present but unfilled; anything in it is treated as a bot.
5. Add the Cloudflare Turnstile widget, and post its token as
   `cf-turnstile-response`. Verification is server-side and fails closed.
6. Update `src/pages/thanks.astro` to show a relevant message for
   `?intent=myform`.
7. If the form accepts a file, request a presigned URL from `/api/presign`
   rather than posting the file through the form — see `CareerForm.astro`.

## Forbidden

- ❌ Don't write raw HTML in pages when a component exists.
- ❌ Don't write `<style>` blocks outside of `.astro` files.
- ❌ Don't bypass content collections and hardcode content in pages.
- ❌ Don't add third-party scripts without updating the perf budget.
- ❌ Don't add new colours or font sizes — add a token first.
- ❌ Don't commit `dist/`, `.astro/`, `node_modules/`.
- ❌ Don't commit `/var/www/merstat-api/.env` or any real secret value.

## Things to remember

- The form's `name` and its hidden `form-name` field must match exactly; a
  mismatch is rejected with 400.
- The `?intent=` query is preserved by the 302 on success. A bare `/thanks`
  loses it and every visitor sees the generic message.
- Pages without `<SEO />` will lack canonical, OG, and JSON-LD. Don't skip it.
- `<Hero />` takes `eyebrow`, `headline`, `lead`, and CTAs. Don't reinvent it.
- Sitemap auto-generates from content collections. There is no RSS
  integration installed, despite what this file used to claim.
- `output: 'static'` — there is no SSR and no API routes. Forms and the R2
  presign are a separate Node service (`api/`) that nginx proxies at `/api/`.
