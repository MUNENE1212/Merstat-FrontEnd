/**
 * PM2 process definition for merstat-api.
 *
 * Deployed to the VPS as part of the api/ directory. Run from
 * /var/www/merstat-api with:
 *   pm2 start ecosystem.config.cjs
 *
 * This service is deliberately NOT part of the release cycle. The static site
 * is swapped by symlink and needs no restart, but restarting the API on every
 * content deploy would drop in-flight form submissions for no reason. Update
 * it by hand (git pull + pm2 reload) when api/ changes.
 */
module.exports = {
  apps: [
    {
      name: 'merstat-api',
      script: 'server.mjs',
      cwd: '/var/www/merstat-api',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '200M',
      // PM2 does not read .env files, and nothing here loads one for it. Without
      // this, TURNSTILE_SECRET_KEY is undefined at runtime and every submission
      // is rejected by the fail-closed spam check. --env-file-if-exists (Node
      // >= 20.12) keeps the process startable before .env has been written.
      node_args: '--env-file-if-exists=/var/www/merstat-api/.env',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3011',
      },
    },
  ],
};
