// nuxt.config.ts
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils'
  ],

  runtimeConfig: {
    mongoUri: process.env.NUXT_MONGO_URI,

    session: {
      // @ts-ignore
      password: process.env.NUXT_SESSION_PASSWORD
    },

    public: {}
  },

  imports: {
    autoImport: true
  }
})
