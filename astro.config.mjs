// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://merstat.org',

  // Pure static output — no adapter needed. dist/ is served directly by nginx
  // on the VPS. Set output: 'hybrid' plus a server adapter only if a route
  // ever needs SSR; the forms and the R2 presign live in a separate Node
  // service (merstat-api) behind /api/.
  output: 'static',

  // 5x faster builds on most CI runners.
  experimental: {
    clientPrerender: true,
  },

  i18n: {
    locales: ['en', 'sw', 'fr'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: {
      sw: 'en',
      fr: 'en',
    },
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  build: {
    inlineStylesheets: 'auto', // inline small stylesheets, link large ones
    assets: '_assets',
  },

  image: {
    // Astro's <Image> will generate a default responsive srcset.
    // Per-image sizes are configured via `widths` / `sizes` props in templates.
  },

  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
    ssr: {
      noExternal: ['schema-dts'],
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          sw: 'sw-KE',
          fr: 'fr-FR',
        },
      },
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Homepage gets highest priority.
        if (item.url === '/') {
          return { ...item, priority: 1.0, changefreq: 'weekly' };
        }
        // Service and case-study pages: high priority.
        if (item.url.startsWith('/services/') || item.url.startsWith('/results/')) {
          return { ...item, priority: 0.9 };
        }
        return item;
      },
    }),
  ],
});
