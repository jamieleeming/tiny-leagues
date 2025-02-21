import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Updated CSP to allow MUI styles and fonts
  const cspContent = mode === 'production' 
    ? `
      default-src 'self';
      script-src 'self' 'unsafe-inline';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src 'self' https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co;
      frame-ancestors 'none';
      form-action 'self';
    `.replace(/\s+/g, ' ').trim()
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline';"

  return {
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
    base: '/tiny-leagues/',
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})
