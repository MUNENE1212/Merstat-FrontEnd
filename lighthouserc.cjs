// Performance, accessibility, and SEO budgets enforced by Lighthouse CI.
// See performance.md §10 for the rationale and targets.
// https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
module.exports = {
  ci: {
    collect: {
      // Static URLs from the built site — Netlify preview URLs would override.
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        // Pretend to be a mid-tier Android on slow 4G.
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      // 404.html and admin/ are deliberately noindex, and Lighthouse's SEO
      // category fails "is-crawlable" on a page we have explicitly asked
      // search engines to ignore. Hold those pages to the accessibility and
      // performance budgets only — they are never ranking targets, but they
      // still need to be usable.
      matchingUrlPattern: '^https?://(?!.*(?:/404\\.html|/admin/)).*\\.html?$',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median' }],
        'categories:best-practices': ['error', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'median' }],

        // CWV thresholds (median of 3 runs).
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        interactive: ['warn', { maxNumericValue: 3500 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],

        // Hard fails.
        'errors-in-console': 'error',
        'no-document-write': 'error',
        'is-on-https': 'error',
        'uses-text-compression': 'error',
        'uses-long-cache-ttl': ['warn', { minScore: 0.5 }],

        // The lighthouse:no-pwa preset declares these three as
        // ['error', {}] — an empty options object, which LHCI reads as
        // minScore 0.9. These audits are conditional (no LCP image, no
        // lazy image, no animation) and report score: null when they do
        // not apply, which LHCI scores as NaN and fails. Turn them off
        // here and re-enable a check explicitly if a page ever needs one.
        'prioritize-lcp-image': 'off',
        'non-composited-animations': 'off',
        'lcp-lazy-loaded': 'off',

        // network-dependency-tree-insight is a Lighthouse 13 "insight"
        // audit, not a pass/fail metric: it reports score 0 with an empty
        // network tree whenever it finds no critical-chain problem, and
        // LHCI's minScore getter maps the 'informative' display mode to 0.
        // Asserting it fails every page regardless of site quality. It is
        // a diagnostic for investigating perf, not a budget.
        'network-dependency-tree-insight': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
