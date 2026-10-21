/**
 * Sveltia CMS configuration. Mounted at /admin/ via a redirect from
 * /admin/index.html (created from this file by build process).
 *
 * Editors:
 *   1. Create a GitHub OAuth app (Settings → Developer settings → OAuth Apps)
 *      with authorisation callback URL https://merstat.org/auth/callback
 *      and Homepage URL https://merstat.org. Note the client ID + secret.
 *   2. In Sveltia's admin screen (/admin/), open the backend setup dialog and
 *      enter those credentials. They are stored in the editor's browser.
 *   3. Visit /admin/ to log in.
 *   4. Editors can add jobs, case studies, training tracks, services, methods,
 *      posts, and team members through a friendly UI.
 *
 * The backend was `git-gateway` (Netlify Identity) until the move to the VPS;
 * git-gateway is a Netlify-provisioned service and cannot exist off Netlify.
 */
import { defineConfig } from 'sveltia-cms/config';

export default defineConfig({
  backend: {
    name: 'github',
    repo: 'MUNENE1212/Merstat-FrontEnd',
    branch: 'main',
  },
  media_folder: 'public/images',
  public_folder: '/images',
  site_url: 'https://merstat.org',
  display_url: 'https://merstat.org',
  logo_url: '/favicon.svg',
  search: true,
  locale: 'en_US',

  collections: [
    {
      name: 'services',
      label: 'Services',
      label_singular: 'Service',
      folder: 'src/content/services',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{title}} — {{shortTitle}}',
      view_groups: [{ label: 'By category', field: 'order' }],
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'shortTitle', label: 'Short title', widget: 'string' },
        { name: 'tagline', label: 'Tagline', widget: 'string' },
        { name: 'summary', label: 'Summary (1–2 sentences for cards)', widget: 'text' },
        { name: 'description', label: 'Meta description', widget: 'text' },
        {
          name: 'icon',
          label: 'Font Awesome icon class',
          widget: 'string',
          hint: 'fa-diagram-project, fa-leaf, etc.',
        },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
        { name: 'heroOutcome', label: 'Hero outcome headline', widget: 'string', required: false },
        {
          name: 'empathy',
          label: 'Empathy intro (1–2 sentences)',
          widget: 'text',
          required: false,
        },
        {
          name: 'outcomes',
          label: 'Outcomes (not features)',
          widget: 'list',
          required: false,
          field: { name: 'outcome', widget: 'string' },
        },
        {
          name: 'process',
          label: 'How we work (3–4 steps)',
          widget: 'list',
          required: false,
          field: {
            name: 'step',
            widget: 'object',
            fields: [
              { name: 'title', label: 'Step title', widget: 'string' },
              { name: 'body', label: 'Step body', widget: 'text' },
            ],
          },
        },
        {
          name: 'proof',
          label: 'Why Merstat bullets',
          widget: 'list',
          required: false,
          field: { name: 'point', widget: 'string' },
        },
        {
          name: 'faqs',
          label: 'FAQs',
          widget: 'list',
          required: false,
          field: {
            name: 'faq',
            widget: 'object',
            fields: [
              { name: 'question', label: 'Question', widget: 'string' },
              { name: 'answer', label: 'Answer', widget: 'text' },
            ],
          },
        },
        { name: 'body', label: 'Long body', widget: 'markdown' },
      ],
    },

    {
      name: 'case-studies',
      label: 'Case studies',
      label_singular: 'Case study',
      folder: 'src/content/case-studies',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{title}} — {{sector}} ({{year}})',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        {
          name: 'partnerDescriptor',
          label: 'Partner descriptor (anonymous)',
          widget: 'string',
          hint: 'e.g. "a multilateral climate fund"',
        },
        { name: 'sector', label: 'Sector', widget: 'string' },
        { name: 'geography', label: 'Geography', widget: 'string' },
        { name: 'year', label: 'Year', widget: 'number' },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
        { name: 'snapshot', label: 'Snapshot (2–3 sentences)', widget: 'text' },
        { name: 'setup', label: 'Setup', widget: 'text' },
        { name: 'complication', label: 'Complication', widget: 'text' },
        { name: 'solution', label: 'What we did', widget: 'text' },
        {
          name: 'results',
          label: 'Results (bullets)',
          widget: 'list',
          field: { name: 'result', widget: 'string' },
        },
        { name: 'takeaway', label: 'Takeaway', widget: 'text' },
      ],
    },

    {
      name: 'methods',
      label: 'Methods',
      label_singular: 'Method',
      folder: 'src/content/methods',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{title}}',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'summary', label: 'Summary', widget: 'string' },
        { name: 'description', label: 'Description', widget: 'text' },
        { name: 'icon', label: 'Font Awesome icon', widget: 'string' },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
      ],
    },

    {
      name: 'trainings',
      label: 'Training tracks',
      label_singular: 'Training track',
      folder: 'src/content/trainings',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{title}} — {{shortTitle}}',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'shortTitle', label: 'Short title', widget: 'string' },
        { name: 'outcome', label: 'Outcome (one sentence)', widget: 'string' },
        { name: 'icon', label: 'Font Awesome icon', widget: 'string' },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
        { name: 'duration', label: 'Format and duration', widget: 'string', required: false },
        { name: 'audience', label: 'Audience', widget: 'string', required: false },
        {
          name: 'modules',
          label: 'Modules',
          widget: 'list',
          field: { name: 'module', widget: 'string' },
        },
        {
          name: 'deliverables',
          label: 'Deliverables',
          widget: 'list',
          required: false,
          field: { name: 'deliverable', widget: 'string' },
        },
      ],
    },

    {
      name: 'jobs',
      label: 'Open roles',
      label_singular: 'Open role',
      folder: 'src/content/jobs',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{title}} — {{team}}',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        {
          name: 'type',
          label: 'Employment type',
          widget: 'select',
          options: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'],
        },
        {
          name: 'badge',
          label: 'Display badge',
          widget: 'string',
          hint: 'e.g. "Full-time" or "Project-based"',
        },
        { name: 'location', label: 'Location', widget: 'string' },
        { name: 'team', label: 'Team / practice', widget: 'string' },
        { name: 'summary', label: 'One-line summary', widget: 'string' },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
        {
          name: 'datePosted',
          label: 'Date posted (ISO yyyy-mm-dd)',
          widget: 'datetime',
          date_format: 'YYYY-MM-DD',
          time_format: false,
          picker_utc: true,
        },
        {
          name: 'validThrough',
          label: 'Valid through (ISO yyyy-mm-dd)',
          widget: 'datetime',
          required: false,
          date_format: 'YYYY-MM-DD',
          time_format: false,
          picker_utc: true,
        },
        {
          name: 'youWill',
          label: 'You will…',
          widget: 'list',
          field: { name: 'item', widget: 'string' },
        },
        {
          name: 'youBring',
          label: 'You bring…',
          widget: 'list',
          field: { name: 'item', widget: 'string' },
        },
      ],
    },

    {
      name: 'posts',
      label: 'Insights',
      label_singular: 'Insight',
      folder: 'src/content/posts',
      create: true,
      delete: true,
      slug: '{{year}}-{{month}}-{{slug}}',
      summary: '{{title}} — {{category}}',
      fields: [
        { name: 'title', label: 'Title', widget: 'string' },
        { name: 'description', label: 'Description', widget: 'text' },
        {
          name: 'pubDate',
          label: 'Published date',
          widget: 'datetime',
          date_format: 'YYYY-MM-DD',
          time_format: false,
          picker_utc: true,
        },
        { name: 'author', label: 'Author', widget: 'string', default: 'Merstat' },
        {
          name: 'category',
          label: 'Category',
          widget: 'select',
          default: 'MEL',
          options: ['MEL', 'TPM', 'ESG', 'Climate', 'Jobs', 'Inclusion', 'News'],
        },
        {
          name: 'tags',
          label: 'Tags',
          widget: 'list',
          required: false,
          field: { name: 'tag', widget: 'string' },
        },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
        {
          name: 'cover',
          label: 'Cover image path',
          widget: 'image',
          required: false,
          allow_multiple: false,
        },
        { name: 'body', label: 'Body', widget: 'markdown' },
      ],
    },

    {
      name: 'team',
      label: 'Team',
      label_singular: 'Team member',
      folder: 'src/content/team',
      create: true,
      delete: true,
      slug: '{{slug}}',
      summary: '{{name}} — {{role}}',
      fields: [
        { name: 'name', label: 'Name', widget: 'string' },
        { name: 'role', label: 'Role', widget: 'string' },
        { name: 'bio', label: 'Bio', widget: 'text' },
        { name: 'photo', label: 'Photo', widget: 'image', required: false, allow_multiple: false },
        { name: 'linkedin', label: 'LinkedIn URL', widget: 'string', required: false },
        { name: 'email', label: 'Email', widget: 'string', required: false },
        {
          name: 'languages',
          label: 'Languages',
          widget: 'list',
          default: ['English'],
          field: { name: 'lang', widget: 'string' },
        },
        { name: 'order', label: 'Sort order', widget: 'number', default: 100 },
        { name: 'draft', label: 'Draft', widget: 'boolean', default: false },
      ],
    },
  ],
});
