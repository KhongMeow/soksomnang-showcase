<template>
  <div class="flex flex-col items-center justify-center py-12 text-gray-400">
    <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-8 h-8">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35M11 8v3M11 14h.01" />
      </svg>
    </div>
    <p class="text-sm font-medium"><slot /></p>
  </div>
</template>
