import type { Thing, WithContext } from 'schema-dts';
import { SITE } from './site';

/**
 * Build the Organization JSON-LD (homepage only).
 * https://schema.org/Organization
 */
export function organizationJsonLd(): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: `${SITE.url}/og/logo.png`,
    description: SITE.description,
    foundingDate: SITE.foundingDate,
    email: SITE.email,
    telephone: SITE.phoneRaw,
    areaServed: SITE.areasServed.map((code) => ({
      '@type': 'Country',
      name: code,
    })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: SITE.email,
        telephone: SITE.phoneRaw,
        areaServed: 'Worldwide',
        availableLanguage: ['English', 'Swahili', 'French'],
      },
    ],
    sameAs: [
      SITE.social.linkedin,
      SITE.social.twitter,
      SITE.social.facebook,
      SITE.social.instagram,
    ].filter((url): url is string => Boolean(url)),
  };
}

/**
 * Build a ProfessionalService JSON-LD (contact page only).
 * https://schema.org/ProfessionalService
 */
export function professionalServiceJsonLd(): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE.url}/#service`,
    name: SITE.name,
    url: `${SITE.url}/contact/`,
    image: `${SITE.url}/og/og-default.png`,
    telephone: SITE.phoneRaw,
    email: SITE.email,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
    parentOrganization: {
      '@id': `${SITE.url}/#organization`,
    },
    areaServed: SITE.areasServed.map((code) => ({
      '@type': 'Country',
      name: code,
    })),
  };
}

/**
 * Build a Service JSON-LD (one per service page).
 */
export function serviceJsonLd(opts: {
  name: string;
  description: string;
  slug: string;
}): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE.url}/services/${opts.slug}/#service`,
    name: opts.name,
    description: opts.description,
    url: `${SITE.url}/services/${opts.slug}/`,
    provider: { '@id': `${SITE.url}/#organization` },
    areaServed: SITE.areasServed.map((code) => ({
      '@type': 'Country',
      name: code,
    })),
    serviceType: opts.name,
  };
}

/**
 * Build a JobPosting JSON-LD.
 * https://schema.org/JobPosting
 */
export function jobPostingJsonLd(opts: {
  title: string;
  description: string;
  datePosted: string; // ISO
  validThrough?: string; // ISO
  employmentType: string; // FULL_TIME / PART_TIME / CONTRACTOR / INTERN
  location: string;
  url: string;
}): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    '@id': `${opts.url}#job`,
    title: opts.title,
    description: opts.description,
    datePosted: opts.datePosted,
    validThrough:
      opts.validThrough ?? new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    employmentType: opts.employmentType,
    hiringOrganization: {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      sameAs: SITE.url,
      logo: `${SITE.url}/og/logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: opts.location,
        addressCountry: SITE.address.country,
      },
    },
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: SITE.areasServed.map((code) => ({
      '@type': 'Country',
      name: code,
    })),
    directApply: true,
    industry: 'International Development',
  };
}

/**
 * Build a BreadcrumbList JSON-LD.
 */
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; url: string }>,
): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Build a BlogPosting JSON-LD.
 */
export function blogPostingJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  image?: string;
}): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': opts.url,
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: `${SITE.url}/og/logo.png` },
    },
    image: opts.image ?? `${SITE.url}/og/og-default.png`,
  };
}

/**
 * Build a FAQPage JSON-LD.
 */
export function faqJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * JSON.stringify with safe escaping for inline <script type="application/ld+json">.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
