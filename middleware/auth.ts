export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn, user, fetchMe, logout } = useAuth()

  if (!isLoggedIn.value && to.path !== "/login" && to.path !== "/showcase") {
    return navigateTo("/login")
  }

  if (isLoggedIn.value && to.path === "/login") {
    return navigateTo("/dashboard")
  }

  if (isLoggedIn.value && !user.value) {
    try {
      await fetchMe()
    } catch {
      logout()
      if (to.path !== "/login") {
        return navigateTo("/login")
      }
    }
  }
})
