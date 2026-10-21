# Secrets

Two separate places: GitHub Actions (for deploys) and the VPS (for the running
service). Neither belongs in a committed file.

## GitHub Actions secrets

Set at `https://github.com/MUNENE1212/Merstat-FrontEnd/settings/secrets/actions`

| Secret            | What it is                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `VPS_HOST`        | `69.164.244.165`                                                 |
| `VPS_DEPLOY_USER` | `root`                                                           |
| `VPS_SSH_KEY`     | Private key whose public half is in `/root/.ssh/authorized_keys` |

There is no Netlify token any more. If you find `NETLIFY_AUTH_TOKEN` or
`NETLIFY_SITE_ID` still set, delete them — nothing reads them.

## Runtime secrets on the VPS

`/var/www/merstat-api/.env`, mode `600`, owned by `root`. The template with
every key documented is `api/.env.example`.

The values that matter:

| Key                    | Consequence if wrong or missing                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`      | Wrong = legitimate users blocked; too broad = the presign endpoint hands anonymous upload URLs to anyone |
| `TURNSTILE_SECRET_KEY` | Missing = every submission rejected. The Cloudflare **test** key means every submission is accepted      |
| `R2_ENDPOINT` etc.     | Missing = `presign` returns 500 and CV upload is broken                                                  |
| `SMTP_*`               | Optional. Empty = submissions are recorded to disk only                                                  |

Checking what is actually set (values are not printed):

```bash
sudo grep -oE '^[A-Z_]+' /var/www/merstat-api/.env | sort
sudo stat -c '%a %U' /var/www/merstat-api/.env     # want: 600 root
```

## Build-time variables

Only `SITE_URL` is read at build time, and CI sets it. Anything prefixed
`PUBLIC_` in `astro.config.mjs` is embedded into the HTML — treat those as
public, not secret.

## Rotation

- **Turnstile** — change the key in Cloudflare, then in `.env`, then
  `pm2 reload ecosystem.config.cjs`.
- **R2** — issue a new API token, update `.env`, reload. Delete the old token
  only after the reload succeeds.
- **Deploy key** — add the new public key alongside the old in
  `/root/.ssh/authorized_keys`, update `VPS_SSH_KEY`, verify a deploy works,
  then remove the old line.

## What is deliberately not secret

`public/admin/config.js` names the CMS repo and backend in clear text. That is
fine: Sveltia authenticates through GitHub OAuth and the repo's own permissions
are the access control. Do not put a token in that file.

Submissions in `/var/www/merstat/shared/form-submissions/` are mode `640`,
`root:www-data`, and contain real names, emails and messages. They are not
public and should not be copied into the repo.
