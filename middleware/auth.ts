export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAuth()

  // Always allow root showcase, login, and all prototype routes to render smoothly
  if (!user.value) {
    try {
      await fetchMe()
    } catch (e) {
      // Gracefully continue without throwing 500 errors on SSR
    }
  }
})
