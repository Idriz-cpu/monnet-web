import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.monnet.lu',
  i18n: { defaultLocale: 'de', locales: ['de', 'fr'] },
  vite: { plugins: [tailwindcss()] },
});
