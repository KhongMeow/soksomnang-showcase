import { onMounted, onUnmounted } from "vue"

/**
 * Loads a paged list from `fetcher` and appends more items as the user
 * scrolls near the bottom of the page.
 */
export function useInfiniteList<T>(
  fetcher: (offset: number, limit: number) => Promise<T[]>,
  limit = 20,
) {
  const items = shallowRef<T[]>([])
  const loading = ref(false)
  const hasMore = ref(true)

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    loading.value = true
    try {
      const batch = await fetcher(items.value.length, limit)
      if (batch.length < limit) hasMore.value = false
      items.value.push(...batch)
    } catch (e) {
      console.error(e)
      hasMore.value = false
    } finally {
      loading.value = false
    }
  }

  function onScroll() {
    if (
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 200
    ) {
      loadMore()
    }
  }

  onMounted(() => {
    loadMore()
    window.addEventListener("scroll", onScroll)
    window.addEventListener("resize", onScroll)
  })

  onUnmounted(() => {
    window.removeEventListener("scroll", onScroll)
    window.removeEventListener("resize", onScroll)
  })

  return { items, loading, hasMore, loadMore }
}
