import { defineStore } from "pinia"

export const usePurchaseRequestsStore = defineStore("purchaseRequests", () => {
  const pending = ref(0)

  async function refresh() {
    try {
      const api = useApi()
      const r = await api.get<{ pending: number }>("/purchase-requests/count")
      pending.value = r.pending ?? 0
    } catch {
      pending.value = 0
    }
  }

  return { pending, refresh }
})
