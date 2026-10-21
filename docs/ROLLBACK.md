# Rollback

## 1. Previous release (fastest — instant)

The site is a symlink swap, so there is nothing to rebuild:

```bash
merstat-deploy rollback      # back one release
merstat-deploy status        # confirm what is live
```

Five releases are kept at `/var/www/merstat/releases/`, so there is room for
several rollbacks. To go further back, point `current` at the release by name:

```bash
ln -sfn /var/www/merstat/releases/<release-name>/dist /var/www/merstat/current
```

Roll back **content** only. A bad `api/` change is a separate problem — see
below.

## 2. Git revert (fixes the source, ~3 min)

Prefer this when the bad commit should not stay in history:

```bash
git revert <bad-sha>
git push origin main
```

CI rebuilds and deploys normally. Never force-push to `main`.

## 3. Rolling back the API

The form handler is **not** part of the release cycle — `rollback` will not
touch it. To revert `api/`:

```bash
cd /var/www/merstat-api
cp -r server.mjs forms.mjs presign.mjs request.mjs /root/merstat-api-bak-$(date +%F)
git pull && pm2 reload ecosystem.config.cjs
curl -sS http://127.0.0.1:3011/api/health
```

Keep a copy of the current files before overwriting; the box has no git
history for this directory.

If the API is down entirely, form submissions fail (nginx returns 502). The
static site is unaffected — it keeps serving.

---

## DNS rollback

If merstat.org stops resolving or the certificate will not issue:

1. Shujaa → merstat.org → DNS → set the `@` A record back to `35.157.26.135`.
2. Propagation is minutes to 24 hours.

The previous values were Netlify's (`35.157.26.135`, `63.176.8.218`). Name
servers never changed, so there is nothing else to revert.

> A-record rollback is the only genuinely painful step here — it depends on
> TTL and resolver caching. This is why the certificate is issued **after**
> DNS moves and verified before you walk away.

---

## Recovering a bad nginx change

The box is shared, so a broken vhost can take down 18 other sites.

```bash
nginx -t                       # does it even parse?
cp /root/backups/<timestamp>/sites-available/merstat.org \
   /etc/nginx/sites-available/merstat.org
systemctl reload nginx
```

Backups of `/etc/nginx` are under `/root/backups/`.

---

## Before you call it recovered

```bash
merstat-deploy status
curl -sSI https://merstat.org | head -1
pm2 list | grep -cE 'online'                  # 9 with merstat-api
systemctl is-active postfix dovecot nginx
```

The last two are the regression guard: they should read `active`/`active`/`active`
and `9`. If they do not, this is not a merstat problem — investigate the box.
