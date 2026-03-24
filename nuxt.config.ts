export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@clerk/nuxt'],

  nitro: {
    preset: 'vercel',
    experimental: {
      wasm: true,
    },
  },

  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    public: {
      appName: 'LUL Extractor',
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    },
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'LUL Extractor',
      meta: [
        { name: 'description', content: 'Extract hours from LUL payslip PDFs into Excel' },
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
