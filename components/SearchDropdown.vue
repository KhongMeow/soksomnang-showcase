<script setup lang="ts">
interface DropdownOption {
  id: string
  label: string
  sub?: string
}

const props = defineProps<{
  options: DropdownOption[]
  value: string
  placeholder: string
  label?: string
  size?: "sm" | "md"
}>()

const emit = defineEmits<{ (e: "change", id: string, label: string): void }>()

const buttonClass = computed(() =>
  props.size === "sm"
    ? "w-full flex items-center justify-between px-3 py-2 rounded-xl border bg-white text-left transition-colors"
    : "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 bg-white text-left transition-colors",
)

const valueClass = computed(() =>
  props.size === "sm"
    ? "text-sm"
    : "",
)

const open = ref(false)
const query = ref("")
const containerRef = ref<HTMLDivElement | null>(null)

const selectedLabel = computed(() => props.options.find((o) => o.id === props.value)?.label ?? "")

const filtered = computed(() =>
  props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.value.toLowerCase()) ||
      (o.sub ?? "").toLowerCase().includes(query.value.toLowerCase()),
  ),
)

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside)
})

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
    query.value = ""
  }
}

function select(id: string, label: string) {
  emit("change", id, label)
  open.value = false
  query.value = ""
}
</script>

<template>
  <div class="relative" ref="containerRef">
    <label v-if="label" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ label }}</label>
    <button
      type="button"
      @click="open = !open; query = ''"
      :class="[buttonClass, open ? 'border-[#00b4c8]' : 'border-gray-200 hover:border-gray-300']"
    >
      <span :class="[valueClass, value ? 'text-gray-900 font-medium' : 'text-gray-400']">
        {{ value ? selectedLabel : placeholder }}
      </span>
      <span class="text-gray-400 transition-transform" :class="{ 'rotate-180': open }">
        <IconChevronDown />
      </span>
    </button>

    <div
      v-if="open"
      class="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
    >
      <div class="p-2 border-b border-gray-100">
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <span class="text-gray-400"><IconSearch /></span>
          <input
            autofocus
            type="text"
            v-model="query"
            placeholder="ស្វែងរក..."
            class="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>
      <div class="max-h-52 overflow-y-auto">
        <div v-if="filtered.length === 0" class="px-4 py-6 text-center text-gray-400 text-sm">គ្មានលទ្ធផល</div>
        <button
          v-for="o in filtered"
          :key="o.id"
          type="button"
          @click="select(o.id, o.label)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#e0f9fb] transition-colors"
          :class="o.id === value ? 'bg-[#e0f9fb] text-[#0f2a4a] font-semibold' : 'text-gray-700'"
        >
          <span class="flex-1">
            <span class="block text-sm font-medium">{{ o.label }}</span>
            <span v-if="o.sub" class="block text-xs text-gray-400 mt-0.5">{{ o.sub }}</span>
          </span>
          <span v-if="o.id === value" class="text-[#00b4c8]"><IconCheck /></span>
        </button>
      </div>
    </div>
  </div>
</template>
