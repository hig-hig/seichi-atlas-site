import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://seichi-atlas-site-ykg8.vercel.app',
  integrations: [sitemap()],
});