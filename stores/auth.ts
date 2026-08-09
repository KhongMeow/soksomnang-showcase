import { defineStore } from "pinia"
import type { Role } from "~/utils/data"

export interface AuthUser {
  id: string
  username: string
  name: string
  role: Role
  branchId?: string | null
  permissions?: Record<string, boolean>
}

export const useAuthStore = defineStore("auth", () => {
  const token = useCookie<string | null>("auth:token", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
  })

  const role = useCookie<Role | null>("auth:role", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!role.value)

  async function login(username: string, password: string) {
    const api = useApi()
    const res = await api.post<{ token: string; user: AuthUser }>(
      "/auth/login",
      { username, password },
    )
    token.value = res.token
    role.value = res.user.role
    user.value = res.user
    return res.user
  }

  async function fetchMe() {
    const api = useApi()
    const me = await api.get<AuthUser>("/auth/me")
    user.value = me
    role.value = me.role
    return me
  }

  function logout() {
    token.value = null
    role.value = null
    user.value = null
  }

  /** Whether the current user has a permission (admin always passes). */
  function has(permission: string): boolean {
    if (role.value === "admin") return true
    return !!user.value?.permissions?.[permission]
  }

  return { token, role, user, isLoggedIn, has, login, logout, fetchMe }
})
