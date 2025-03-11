import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSP configuration
const cspContent = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://www.google-analytics.com https://zlsmhizixetvplocbulz.supabase.co;
  connect-src 'self' 
    https://zlsmhizixetvplocbulz.supabase.co 
    wss://zlsmhizixetvplocbulz.supabase.co 
    https://*.supabase.co 
    https://*.supabase.net 
    https://api.supabase.io
    https://www.google-analytics.com
    https://*.analytics.google.com;
  frame-src 'self';
  form-action 'self';
`.replace(/\s+/g, ' ').trim()

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/,
          `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`
        )
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
