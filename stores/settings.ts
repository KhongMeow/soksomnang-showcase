import { defineStore } from "pinia"

export const useSettingsStore = defineStore("settings", () => {
  const kgPerTaka = ref(4)
  const headsPerTaka = ref(100)
  const expenseCategories = ref<string[]>([])

  async function load() {
    try {
      const api = useApi()
      const s = await api.get<any>("/settings")
      kgPerTaka.value = s.kgPerTaka ?? 4
      headsPerTaka.value = s.headsPerTaka ?? 100
      expenseCategories.value = s.expenseCategories ?? []
    } catch {
      // keep defaults if the backend is unavailable
    }
  }

  return { kgPerTaka, headsPerTaka, expenseCategories, load }
})
