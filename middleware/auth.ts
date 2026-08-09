export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn, user, fetchMe, logout } = useAuth()

  // Allow root showcase and login routes publicly
  if (to.path === "/" || to.path === "/showcase") {
    return
  }

  if (!isLoggedIn.value && to.path !== "/login") {
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
