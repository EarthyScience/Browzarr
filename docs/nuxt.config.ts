export default defineNuxtConfig({
  extends: ['docus'],

  compatibilityDate: '2025-07-18',

  css: ['~/assets/css/main.css'],

  site: {
    name: 'Browzarr Documentation'
  },

  // Disable server-only modules
  mcp: false,

  llms: false,

  content: {
    build: {
      markdown: {
        highlight: {
          langs: [
            'bash', 'diff', 'json', 'js', 'ts', 'html', 'css',
            'vue', 'shell', 'mdc', 'md', 'yaml',
            'python',
          ],
        },
      },
    },
  },

  // Nitro static build config
  nitro: {
    preset: 'static',
  },
  vite: {
    optimizeDeps: {
      include: [
        '@comark/vue',
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  }
})
