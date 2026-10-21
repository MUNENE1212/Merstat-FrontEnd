import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';

// =============================================================
// Shared primitives
// =============================================================
const localeEnum = z.enum(['en', 'sw', 'fr']);
const localeCode = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional(),
});

const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
  variant: z.enum(['primary', 'ghost']).default('primary'),
});

// =============================================================
// 1. Pages — single Markdown body per locale (home, about, etc.)
// =============================================================
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeEnum.default('en'),
    draft: z.boolean().default(false),
    image: z.string().optional(),
    canonical: z.string().optional(),
  }),
});

// =============================================================
// 2. Services — the 13 services offered.
// Each becomes a full detail page.
// =============================================================
const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    tagline: z.string(),
    summary: z.string(), // 1-2 sentences for cards
    description: z.string(), // meta description
    icon: z.string(), // Font Awesome class, e.g. "fa-cogs"
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),

    // Knapsack 7-element template fields (optional — component falls back).
    heroOutcome: z.string().optional(), // outcome-led headline
    empathy: z.string().optional(), // 2-3 sentence problem framing
    outcomes: z.array(z.string()).optional(), // bullet outcomes-not-features
    process: z
      .array(
        z.object({
          title: z.string(),
          body: z.string(),
        }),
      )
      .optional(),
    proof: z.array(z.string()).optional(), // trust bullets
    faqs: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        }),
      )
      .optional(),

    relatedCaseStudies: z.array(reference('case-studies')).optional(),
    relatedMethods: z.array(reference('methods')).optional(),
    relatedTrainings: z.array(reference('trainings')).optional(),
    cta: ctaSchema.optional(),
  }),
});

// =============================================================
// 3. Case studies (Proofmap 6-block structure).
// =============================================================
const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    partnerDescriptor: z.string(), // "a multilateral climate fund"
    sector: z.string(), // e.g. "Climate / WASH"
    geography: z.string(), // e.g. "East Africa"
    year: z.number(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
    services: z.array(reference('services')).optional(),

    // 6 blocks (Proofmap):
    snapshot: z.string(), // 2-3 sentence elevator
    setup: z.string(), // context / starting point
    complication: z.string(), // the challenge
    solution: z.string(), // what we did
    results: z.array(z.string()),
    takeaway: z.string(), // what the reader should learn
  }),
});

// =============================================================
// 4. Methods — discrete methodologies we apply.
// =============================================================
const methods = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/methods' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    icon: z.string(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
    relatedServices: z.array(reference('services')).optional(),
  }),
});

// =============================================================
// 5. Trainings — flagship tracks.
// =============================================================
const trainings = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/trainings' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    outcome: z.string(),
    icon: z.string(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
    modules: z.array(z.string()),
    deliverables: z.array(z.string()).optional(),
    audience: z.string().optional(),
    duration: z.string().optional(),
    relatedServices: z.array(reference('services')).optional(),
  }),
});

// =============================================================
// 6. Jobs — open positions.
// =============================================================
const jobs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/jobs' }),
  schema: z.object({
    title: z.string(),
    type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']),
    badge: z.string(), // "Full-time" / "Project-based" / "Consultant Roster"
    location: z.string(), // "Nairobi or remote within Africa"
    team: z.string(), // "MEL" / "TPM" / "Climate" / "Jobs & Inclusion"
    summary: z.string(),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
    datePosted: z.string(), // ISO yyyy-mm-dd
    validThrough: z.string().optional(),
    youWill: z.array(z.string()),
    youBring: z.array(z.string()),
  }),
});

// =============================================================
// 7. Posts — Insights / thought leadership (future).
// =============================================================
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Merstat'),
    tags: z.array(z.string()).default([]),
    category: z.enum(['MEL', 'TPM', 'ESG', 'Climate', 'Jobs', 'Inclusion', 'News']).default('MEL'),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
    cover: z.string().optional(),
  }),
});

// =============================================================
// 8. Team — leadership and staff.
// =============================================================
const team = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    photo: z.string().optional(),
    linkedin: z.string().optional(),
    email: z.string().optional(),
    languages: z.array(z.string()).default(['English']),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    locale: localeEnum.default('en'),
  }),
});

export const collections = {
  pages,
  services,
  'case-studies': caseStudies,
  methods,
  trainings,
  jobs,
  posts,
  team,
};

export type Locale = z.infer<typeof localeEnum>;
