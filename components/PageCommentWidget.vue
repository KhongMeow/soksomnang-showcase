<script setup lang="ts">
const props = defineProps<{
  screenId?: string
  screenTitle?: string
  route?: string
  compact?: boolean
}>()

const api = useApi()
const { user } = useAuth()

interface CommentItem {
  id: string
  screenId: string
  route: string
  author: string
  role: string
  tag: string
  text: string
  createdAt: string
  reactions?: Record<string, number>
}

const comments = ref<CommentItem[]>([])
const loading = ref(true)
const submitting = ref(false)

const newAuthor = ref("")
const newTag = ref("💡 Suggestion")
const newText = ref("")
const filterTag = ref("all")

const availableTags = [
  "💡 Suggestion",
  "🐛 Bug",
  "❤️ Love it",
  "❓ Question"
]

onMounted(() => {
  if (user.value?.name) {
    newAuthor.value = user.value.name
  } else {
    newAuthor.value = "Sok Somnang (Owner)"
  }
  fetchComments()
})

watch([() => props.screenId, () => props.route], () => {
  fetchComments()
})

async function fetchComments() {
  loading.value = true
  try {
    const res = await api.get<CommentItem[]>("/comments")
    if (props.screenId || props.route) {
      comments.value = res.filter((c) => {
        if (props.screenId && c.screenId === props.screenId) return true
        if (props.route && c.route === props.route) return true
        return false
      })
    } else {
      comments.value = res
    }
  } catch (e) {
    console.error("Failed to load comments", e)
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!newText.value.trim()) return
  submitting.value = true
  try {
    const payload = {
      screenId: props.screenId || "general",
      route: props.route || "/",
      author: newAuthor.value || "Anonymous Reviewer",
      role: user.value?.role || "reviewer",
      tag: newTag.value,
      text: newText.value.trim()
    }
    const created = await api.post<CommentItem>("/comments", payload)
    comments.value.unshift(created)
    newText.value = ""
  } catch (e) {
    console.error("Failed to post comment", e)
  } finally {
    submitting.value = false
  }
}

async function reactToComment(commentId: string, reactionType: string) {
  try {
    const updated = await api.post<CommentItem>("/comments/react", { commentId, reactionType })
    const target = comments.value.find((c) => c.id === commentId)
    if (target && updated.reactions) {
      target.reactions = updated.reactions
    }
  } catch (e) {
    console.error("Failed to react", e)
  }
}

const filteredComments = computed(() => {
  if (filterTag.value === "all") return comments.value
  return comments.value.filter((c) => c.tag.includes(filterTag.value))
})

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="bg-[#0c1c30] border border-white/15 rounded-2xl p-4 lg:p-5 text-white shadow-2xl flex flex-col space-y-4">
    <!-- Header Title -->
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-base">
          💬
        </div>
        <div>
          <h3 class="text-sm font-extrabold text-white">
            មតិយោបល់ទំព័រ (Page Comments)
          </h3>
          <p class="text-[11px] text-cyan-300">
            {{ route ? `Route: ${route}` : (screenTitle ? `${screenTitle}` : "មតិយោបល់លើប្រព័ន្ធទាំងមូល") }}
          </p>
        </div>
      </div>
      <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
        {{ comments.length }} មតិ
      </span>
    </div>

    <!-- Tag Filter Pills -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
      <button
        @click="filterTag = 'all'"
        class="px-2.5 py-1 rounded-lg font-semibold transition-all border"
        :class="filterTag === 'all' ? 'bg-[#00b4c8] text-white border-[#00b4c8]' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/15'"
      >
        ទាំងអស់ (All)
      </button>
      <button
        v-for="t in availableTags"
        :key="t"
        @click="filterTag = t.split(' ')[1] || t"
        class="px-2.5 py-1 rounded-lg font-semibold transition-all border whitespace-nowrap"
        :class="filterTag === (t.split(' ')[1] || t) ? 'bg-[#00b4c8] text-white border-[#00b4c8]' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/15'"
      >
        {{ t }}
      </button>
    </div>

    <!-- Add New Comment Form -->
    <form @submit.prevent="submitComment" class="bg-[#061121] p-3.5 rounded-xl border border-white/10 space-y-3">
      <div class="flex items-center gap-2">
        <input
          v-model="newAuthor"
          type="text"
          placeholder="ឈ្មោះអ្នកបញ្ចេញមតិ..."
          class="flex-1 bg-[#10243d] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 font-semibold"
        />
        <select
          v-model="newTag"
          class="bg-[#10243d] border border-white/15 rounded-lg px-2 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 font-semibold"
        >
          <option v-for="t in availableTags" :key="t" :value="t">
            {{ t }}
          </option>
        </select>
      </div>

      <textarea
        v-model="newText"
        rows="2"
        placeholder="សរសេរមតិយោបល់ ឬស្នើសុំកែប្រែលើទំព័រនេះ (Comment / Feedback)..."
        class="w-full bg-[#10243d] border border-white/15 rounded-lg p-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 resize-none font-sans"
        required
      />

      <div class="flex items-center justify-between pt-1">
        <span class="text-[10px] text-gray-400">
          * មតិនឹងត្រូវបានរក្សាទុក Realtime លើ Vercel
        </span>
        <button
          type="submit"
          :disabled="submitting || !newText.trim()"
          class="px-4 py-1.5 rounded-lg bg-[#00b4c8] hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>{{ submitting ? "កំពុងផ្ញើ..." : "ផ្ញើប្រកាស (Post Comment)" }}</span>
          <span>✈️</span>
        </button>
      </div>
    </form>

    <!-- Comments List -->
    <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
      <div v-if="loading" class="text-center py-6 text-xs text-gray-400">
        កំពុងទាញយកមតិយោបល់...
      </div>

      <div v-else-if="filteredComments.length === 0" class="text-center py-8 bg-[#061121]/50 rounded-xl border border-dashed border-white/10">
        <div class="text-2xl mb-1">💬</div>
        <p class="text-xs font-semibold text-gray-300">មិនទាន់មានមតិយោបល់លើ {{ route || screenTitle || 'ទំព័រនេះ' }} នៅឡើយទេ</p>
        <p class="text-[11px] text-gray-500">ធ្វើជាអ្នកដំបូងដែលបញ្ចេញមតិលើទំព័រនេះ!</p>
      </div>

      <div
        v-for="c in filteredComments"
        :key="c.id"
        class="bg-[#08182b] border border-white/10 hover:border-cyan-500/40 p-3.5 rounded-xl space-y-2 transition-all"
      >
        <!-- Top row: Author & Tag & Time -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0">
              {{ c.author.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white">{{ c.author }}</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/10 text-cyan-300 uppercase">
                  {{ c.role }}
                </span>
              </div>
              <div class="text-[10px] text-gray-400">{{ formatTime(c.createdAt) }}</div>
            </div>
          </div>

          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            {{ c.tag }}
          </span>
        </div>

        <!-- Comment Content Text -->
        <p class="text-xs text-gray-200 leading-relaxed font-sans pl-1">
          {{ c.text }}
        </p>

        <!-- Bottom Row: Reactions -->
        <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
          <div class="flex items-center gap-2">
            <button
              @click="reactToComment(c.id, 'thumbsup')"
              class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 font-semibold transition-all flex items-center gap-1 border border-white/10"
            >
              <span>👍</span>
              <span>{{ c.reactions?.thumbsup || 0 }}</span>
            </button>
            <button
              @click="reactToComment(c.id, 'heart')"
              class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 font-semibold transition-all flex items-center gap-1 border border-white/10"
            >
              <span>❤️</span>
              <span>{{ c.reactions?.heart || 0 }}</span>
            </button>
            <button
              @click="reactToComment(c.id, 'rocket')"
              class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 font-semibold transition-all flex items-center gap-1 border border-white/10"
            >
              <span>🚀</span>
              <span>{{ c.reactions?.rocket || 0 }}</span>
            </button>
          </div>

          <span class="text-[10px] text-cyan-400 font-mono">
            {{ c.route }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
