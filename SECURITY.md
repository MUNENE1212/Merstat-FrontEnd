# Security

## Reporting a vulnerability

Email **security@merstat.org** with a description and reproduction steps.
We will respond within 3 working days.

## Out of scope

- Denial-of-service attacks.
- Self-XSS (paste your own payload into your own browser).
- Missing security headers on subdomains we don't control.

## Data handling

- Forms are submitted to Netlify Forms (Honeypot + Cloudflare Turnstile).
- CV uploads go directly from the browser to Cloudflare R2 via a presigned
  URL issued by a Netlify Function. CVs are not stored in Netlify's database.
- Analytics are cookieless (Plausible) and do not require consent.
- We do not embed third-party fonts, trackers, ad networks, or social widgets.
- Cloudflare Turnstile is privacy-preserving and does not require consent in
  the EU/UK when used as a security control.

## Security headers

Set in `netlify.toml` for every response:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'; …` (see `netlify.toml` for the full policy)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), …`

## Dependency policy

- `npm ci` on every CI run (locked versions).
- Dependabot weekly PRs for `npm` and GitHub Actions.
- `npm audit` is run on every CI but not enforced (low priority for a
  static site; review Dependabot PRs within 7 days).
