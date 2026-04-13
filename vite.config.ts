// Cache bust: 1773221234
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Proxy Groq API calls to bypass browser CORS restriction
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1/chat/completions'),
      },
      // Proxy LeadHunter External API (/api/external/...)
      '/api/lh/external': {
        target: 'https://leadhunter.uk/api/external',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/lh\/external/, ''),
      },
      // Proxy LeadHunter Standard API (/api/...)
      '/api/lh/standard': {
        target: 'https://leadhunter.uk',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/lh\/standard/, '/api'),
      },
      // Proxy LeadHunter SSE events (/api/jobs/:id/events)
      '/api/lh-events': {
        target: 'https://leadhunter.uk/api/jobs',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/lh-events\/([^\/]+)/, '/$1/events'),
      },
      // Proxy Sender API (/api/sender/...)
      '/api/sender': {
        target: 'https://leadhunter.uk/api/sender',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/sender/, ''),
      },
      // Proxy Browser Agent (/api/browser/...) to local britsync-server
      '/api/browser': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false, // Local server
      },
      // Proxy Chatbot API to local britsync-server
      '/api/bot': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Team Session Management
      '/api/team': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Authentication
      '/api/auth': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
