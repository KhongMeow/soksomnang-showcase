import type { FetchOptions } from 'ofetch'

interface ApiClient {
  baseURL: string
  get: <T>(url: string, query?: Record<string, any>) => Promise<T>
  post: <T>(url: string, body?: any) => Promise<T>
  patch: <T>(url: string, body?: any) => Promise<T>
  put: <T>(url: string, body?: any) => Promise<T>
  del: <T>(url: string) => Promise<T>
}

export const useApi = (): ApiClient => {
  const config = useRuntimeConfig()
  const baseURL = (config.public.apiBase as string) || '/api'
  const requestFetch = useRequestFetch()

  async function request<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const token = useCookie<string | null>('auth:token')
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) ?? {}),
    }
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }
    return requestFetch(url, { baseURL, ...options, headers } as any) as Promise<T>
  }

  return {
    baseURL,
    get: <T>(url: string, query?: Record<string, any>) =>
      request<T>(url, { method: 'GET', query }),
    post: <T>(url: string, body?: any) =>
      request<T>(url, { method: 'POST', body }),
    patch: <T>(url: string, body?: any) =>
      request<T>(url, { method: 'PATCH', body }),
    put: <T>(url: string, body?: any) =>
      request<T>(url, { method: 'PUT', body }),
    del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  }
}
