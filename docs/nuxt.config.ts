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

  // Nitro static build config
  nitro: {
    preset: 'static',
  }
})
