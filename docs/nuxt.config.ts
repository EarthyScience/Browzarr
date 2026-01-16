export default defineNuxtConfig({
  extends: ['docus'],

  compatibilityDate: '2025-07-18',

  css: ['~/assets/css/main.css'],

  site: {
    name: 'docs'
  },

  // Disable server-only modules
  mcp: false,

  llms: false,

  // Nitro static build config
  nitro: {
    preset: 'static',
  }
})
