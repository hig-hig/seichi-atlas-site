import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://seichi-atlas.vercel.app',
  integrations: [sitemap()],
});