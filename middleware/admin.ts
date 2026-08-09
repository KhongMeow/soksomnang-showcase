export default defineNuxtRouteMiddleware((to) => {
  const { role } = useAuth()
  if (role.value !== "admin") {
    return navigateTo("/dashboard")
  }
})
