import { storeToRefs } from "pinia"
import { useAuthStore } from "~/stores/auth"

export const useAuth = () => {
  const store = useAuthStore()
  return {
    ...storeToRefs(store),
    has: store.has,
    login: store.login,
    logout: store.logout,
    fetchMe: store.fetchMe,
  }
}
