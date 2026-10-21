// Flat config for ESLint 9+. Keep this minimal; rely on Astro's defaults.
import astroPlugin from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**', '.netlify/**', 'public/_assets/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
      'prefer-const': 'error',
    },
  },
  {
    // TypeScript needs its own parser. Without this, ESLint's default
    // espree parser chokes on type annotations and every .ts file
    // reports "Parsing error: Unexpected token".
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off', // TypeScript handles this
      'prefer-const': 'error',
    },
  },
  ...astroPlugin.configs.recommended,
  {
    files: ['**/*.astro'],
    rules: {
      'no-unused-vars': 'off', // Astro script blocks use vars that are referenced via templating
    },
  },
];
