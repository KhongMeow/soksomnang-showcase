import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-01",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
    },
  },
  routeRules: {
    "/**": {
      headers: {
        "X-Frame-Options": "SAMEORIGIN",
        "Access-Control-Allow-Origin": "*",
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: "Soksomnang - ប្រព័ន្ធគ្រប់គ្រង",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0",
        },
      ],
    },
  },
})
