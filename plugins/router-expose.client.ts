export default defineNuxtPlugin(() => {
  const router = useRouter()
  if (import.meta.client) {
    ;(window as any).__nuxt_router__ = router
  }
})
