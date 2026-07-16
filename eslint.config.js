import js from '@eslint/js';
import globals from 'globals';
import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    // Use TypeScript parser for Astro frontmatter blocks
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
  },
  {
    // TypeScript and JavaScript source files
    files: ['**/*.{js,ts,mjs}'],
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-console': 'warn',
    },
  },
  {
    // Browser-side scripts need browser globals
    files: ['src/scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Astro API endpoints run in an SSR/edge environment with Web API globals
    files: ['src/pages/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Response: 'readonly',
      },
    },
  },
  {
    // Library files run at build time in Node 18+ with Web API globals
    files: ['src/lib/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: 'readonly',
        AbortController: 'readonly',
        console: 'readonly',
      },
    },
  },
];
