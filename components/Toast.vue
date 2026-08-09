<script setup lang="ts">
const props = defineProps<{
  message: string
  type?: "success" | "error"
}>()

const emit = defineEmits<{ (e: "close"): void }>()

onMounted(() => {
  const t = setTimeout(() => emit("close"), 3000)
  onUnmounted(() => clearTimeout(t))
})
</script>

<template>
  <div
    class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white font-semibold text-sm"
    :class="type === 'success' ? 'bg-[#15803d]' : 'bg-[#dc2626]'"
  >
    <IconCheck v-if="type === 'success'" />
    <IconWarning v-else />
    {{ message }}
  </div>
</template>
