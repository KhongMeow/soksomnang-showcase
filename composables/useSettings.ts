import { storeToRefs } from "pinia"
import { useSettingsStore } from "~/stores/settings"

export const useSettings = () => {
  const store = useSettingsStore()
  return {
    ...storeToRefs(store),
    load: store.load,
  }
}
