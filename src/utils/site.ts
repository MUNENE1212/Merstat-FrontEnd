/**
 * Site-wide constants. Single source for brand identity used across
 * layouts, structured data, sitemap, and OG defaults.
 */
export const SITE = {
  name: 'Merstat Development Limited',
  shortName: 'Merstat',
  tagline: 'Building programs. Measuring change. Sustaining impact.',
  description:
    'Merstat is a development partner that designs programs, strengthens systems, and provides independent monitoring across Africa, the Middle East, and Asia. Specialists in MEL, third-party monitoring, ESG, climate MRV, jobs measurement, and capacity building.',
  url: process.env.SITE_URL || 'https://merstat.org',
  locale: 'en',
  foundingDate: '2015',
  email: 'contact@merstat.org',
  careersEmail: 'careers@merstat.org',
  phone: '+254 728 893 405',
  phoneRaw: '+254728893405',
  address: {
    street: 'Westlands',
    city: 'Nairobi',
    region: 'Nairobi County',
    country: 'KE',
    countryName: 'Kenya',
    postalCode: '00100',
  },
  hours: 'Mo-Fr 09:00-17:00',
  social: {
    linkedin: 'https://www.linkedin.com/company/merstat',
    twitter: 'https://twitter.com/merstatdev',
    facebook: 'https://www.facebook.com/merstat',
    instagram: 'https://www.instagram.com/merstat',
    youtube: '',
    github: '',
  },
  // Areas served — used for LocalBusiness / ProfessionalService JSON-LD
  areasServed: [
    'KE', // Kenya
    'UG', // Uganda
    'TZ', // Tanzania
    'RW', // Rwanda
    'ET', // Ethiopia
    'SO', // Somalia
    'NG', // Nigeria
    'GH', // Ghana
    'SN', // Senegal
    'CD', // DR Congo
    'JO', // Jordan
    'LB', // Lebanon
    'BD', // Bangladesh
    'NP', // Nepal
    'PH', // Philippines
    'GB', // UK (programme office)
    'US', // USA (programme office)
  ],
} as const;

export const NAV_LINKS = [
  { href: '/', key: 'nav.home' },
  { href: '/about/', key: 'nav.about' },
  { href: '/services/', key: 'nav.services' },
  { href: '/results/', key: 'nav.results' },
  { href: '/trainings/', key: 'nav.trainings' },
  { href: '/careers/', key: 'nav.careers' },
  { href: '/contact/', key: 'nav.contact' },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];
