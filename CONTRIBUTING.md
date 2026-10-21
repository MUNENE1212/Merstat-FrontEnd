# Contributing to the Merstat site

Thanks for your interest. This is a small codebase — please read the
[AGENTS.md](./AGENTS.md) file first, then this one.

## Branching

- `main` is the production branch. Every push to `main` deploys.
- Work in topic branches: `feature/<thing>`, `fix/<thing>`, `content/<thing>`.
- PRs require green CI.

## Local development

```bash
npm ci
npm run dev
```

The dev server runs at `http://localhost:4321`.

## Quality gates

Run these locally before pushing:

```bash
npm run format:fix    # Prettier
npm run lint:fix      # ESLint
npm run check         # astro check + tsc
npm run build         # Astro build (must succeed)
```

CI also runs:

- **Lighthouse CI** with the budgets in `lighthouserc.cjs`
- **pa11y-ci** with the WCAG 2.2 AA budget in `.pa11yci.json`

If your PR fails any of these, the merge button is disabled.

## Commit messages

- Imperative mood: "Add", "Fix", "Refactor" — not past tense.
- One subject line, max 72 chars.
- Body explains **why**, not what (the diff shows what).

## Accessibility

WCAG 2.2 AA is enforced. If you add a new interactive element:

- It must be reachable by keyboard.
- It must have a visible focus ring (default ring in `base.css` is fine).
- It must have an accessible name (`aria-label`, `aria-labelledby`, or
  visible text).
- It must hit at least 24×24 CSS pixels (`min-height: 44px` is the default).

If you add a form, use one of the existing components in
`src/components/forms/` as a reference — every form has honeypot, form-name
hidden input, Turnstile, and a redirect to `/thanks/`.

## Performance

- New images must be AVIF or WebP, with `width`/`height` set.
- New pages must be lean — keep the LCP image under 150 KB.
- Don't add third-party scripts without a perf-budget conversation.

## Content

- New services, case studies, methods, trainings, and jobs go in
  `src/content/<collection>/<slug>.md`.
- Use the Proofmap 6-block structure for case studies:
  snapshot → setup → complication → solution → results → takeaway.
- Use the Knapsack 7-element structure for service pages:
  benefit-led headline → empathy → outcomes → process → proof → FAQ → CTA.
- Use anonymous "partner descriptors" (e.g. "a multilateral climate fund")
  — never name a client without their written permission.

## Code of conduct

By contributing, you agree to act with integrity, respect confidentiality,
and not introduce anything that would compromise the security or privacy
of our users.
