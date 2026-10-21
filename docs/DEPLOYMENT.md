# Deploying merstat.org

The site is self-hosted. There is no Netlify site, no Netlify account, and no
Netlify secret. Code deploys to the VPS `69.164.244.165` over SSH; DNS stays
at Shujaa and needs one A record changed.

```
GitHub push → Actions (build + gate) → tar over SSH → merstat-deploy → nginx
```

---

## What runs where

| Piece        | Where                        | Restart needed on deploy? |
| ------------ | ---------------------------- | ------------------------- |
| Static site  | `/var/www/merstat/current`   | No — symlink swap         |
| Form handler | `/var/www/merstat-api` (PM2) | No — deliberately not     |
| R2 presign   | same process, `/api/presign` | No                        |
| TLS          | certbot (system)             | No                        |

`merstat-api` is intentionally outside the release cycle: the static site is
swapped by symlink, but restarting the API on every content deploy would drop
in-flight submissions for nothing. Update it by hand when `api/` changes:

```bash
cd /var/www/merstat-api && git pull && pm2 reload ecosystem.config.cjs
```

---

## Deploying

Push to `main`. `.github/workflows/deploy.yml` runs `npm run build`, the smoke
and API test suites, then streams a tar of `dist/` over SSH. There is no
manual deploy step.

To deploy a specific ref without merging, use **Actions → Deploy to VPS →
Run workflow**.

### The deploy key

GitHub holds an SSH key restricted server-side:

```
command="/usr/local/sbin/merstat-deploy",restrict ssh-ed25519 … merstat-github-deploy
```

`command=` means the key can only ever run that one script — it cannot open a
shell, read a file, or tunnel, even if the private key leaks. `restrict`
additionally disables pty, agent and X11 forwarding.

Three secrets back this (set in repo settings, **not** in any file):

| Secret            | Value            |
| ----------------- | ---------------- |
| `VPS_HOST`        | `69.164.244.165` |
| `VPS_DEPLOY_USER` | `root`           |
| `VPS_SSH_KEY`     | the private key  |

Rotating the key: generate a new pair, add the new **public** line to
`/root/.ssh/authorized_keys` on the VPS, update `VPS_SSH_KEY`, then remove the
old line.

---

## Operating the deploy script

Only `root` on the box runs this, by hand or through the key:

```bash
merstat-deploy status      # what is live, and the 5 releases kept
merstat-deploy rollback    # switch back to the previous release
```

Rollback is a symlink swap — instant, no rebuild. Releases live in
`/var/www/merstat/releases/<utc>-<sha7>/`; the newest 5 are kept.

`merstat-deploy` refuses to switch to an archive that is missing
`index.html`, `404.html` or `_assets/`, so a truncated upload cannot take the
site down. Its deploy log is `/var/log/merstat-deploy.log`.

---

## Runtime configuration (on the VPS)

`/var/www/merstat-api/.env`, mode `600`, owned by `root`. Template and full key
list: `api/.env.example`. **Never commit this file.**

PM2 does not read `.env` files, so `ecosystem.config.cjs` passes
`--env-file-if-exists` to node. If that flag is dropped, `TURNSTILE_SECRET_KEY`
silently becomes undefined and **every** submission is rejected — the handler
fails closed by design.

### Before this site can accept real submissions

The box currently runs the Cloudflare **test** Turnstile secret, which makes
`siteverify` return success for any token. Until the real secret is in place,
the spam check is effectively off. Set at minimum:

- `TURNSTILE_SECRET_KEY` — real secret. Without it, no bot filtering.
- `R2_*` — required for CV upload. `presign` returns 500 until these exist.
- `ALLOWED_ORIGINS` — add `https://www.merstat.org` if you serve www.

Form submissions are appended to
`/var/www/merstat/shared/form-submissions/<form>.jsonl`, which survives
deploys. Optional SMTP vars email a copy; unset, submissions are disk-only.

> R2 credential names differ from the old Netlify function's — it now reads
> `R2_ENDPOINT` (the full bucket URL), not `R2_ACCOUNT_ID`.

---

## DNS (this is the part you do by hand)

Nameservers **stay** `dns1-4.p03.nsone.net`. Only two records change:

| Host  | Type  | Value            |
| ----- | ----- | ---------------- |
| `@`   | A     | `69.164.244.165` |
| `www` | CNAME | `@`              |

In the Shujaa client area: Domains → merstat.org → DNS / Nameservers.

| Host  | Type  | Value            | State                       |
| ----- | ----- | ---------------- | --------------------------- |
| `@`   | A     | `69.164.244.165` | done — live, cert issued    |
| `www` | CNAME | `@`              | **outstanding — see below** |

The `@` record replaced Netlify's two values (`35.157.26.135`, `63.176.8.218`).

No mail records are affected: merstat.org has no MX, SPF or DKIM today.

### `www` — the one record left

At the time of writing `www.merstat.org` returns **NXDOMAIN**: the old record
was removed and not replaced. Until it exists, nothing breaks for the apex
domain, but anyone typing `www.` gets a resolution failure.

Add a `www` CNAME pointing at `@`. Once it resolves to the VPS, add it to the
certificate — the current cert covers `merstat.org` only:

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d merstat.org -d www.merstat.org --agree-tos --non-interactive
nginx -t && systemctl reload nginx
```

The vhost already has a `www` HTTPS block that 301s to the apex; it just needs
the certificate to cover the name.

### Certificate

Issued with certbot's webroot plugin against `/var/www/certbot`, which the
port-80 block serves at `/.well-known/acme-challenge/` **before** the HTTPS
redirect — without that ordering, renewal silently fails. Valid to 19 Jan 2027,
`certbot.timer` is enabled and active, and `certbot renew --dry-run` has been
verified to succeed.

Note: certbot stores lineages as `/etc/letsencrypt/live/<name>`, and the vhost
reads that path directly. Do not hand-create files there — certbot refuses to
issue into a `live/` directory it did not create, with
`CertStorageError: live directory exists`.

---

## Verifying

Once DNS has moved and the cert is issued:

```bash
dig +short A merstat.org @1.1.1.1                  # 69.164.244.165
curl -sSI https://merstat.org | head -1            # HTTP/2 200

# Security headers — these came from netlify.toml and are easy to lose
curl -sSI https://merstat.org | grep -iE 'content-security-policy|strict-transport|x-frame'

# A real form submission returns 302 and preserves ?intent=
curl -sS -X POST https://merstat.org/api/forms/contact \
  -d 'form-name=contact&email=a@b.co&cf-turnstile-response=<token>' \
  -o /dev/null -w '%{http_code} -> %{redirect_url}'
```

On the box itself, after any nginx change: `nginx -t` **before** reloading.
The box is shared — 18 other vhosts, live mail, 9 PM2 apps.

---

## Local gate (same as CI)

```bash
npm run format:check && npm run lint && npm run build
npm run test:smoke && npm run test:api
```

`test:smoke` walks the built `dist/` and checks every internal link resolves —
85 pages. `test:api` starts the form/presign service and drives 20 assertions
over real HTTP. Both are provider-neutral, so they are valid before a deploy.
