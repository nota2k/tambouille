<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'

const props = defineProps<{ selected: string[] }>()
const emit = defineEmits<{
  toggle: [tag: string]
  close: []
}>()

const tags = ref<string[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await apiClient.get<string[]>('/mixes/tags')
    tags.value = data
  } finally {
    loading.value = false
  }
})

function isSelected(tag: string) {
  return props.selected.includes(tag)
}

function onToggle(tag: string) {
  emit('toggle', tag)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center pt-24" @click.self="emit('close')">
    <div class="absolute inset-0 bg-black/40" @click="emit('close')" />

    <div
      class="relative z-10 w-full max-w-lg rounded-2xl bg-tambouille-surface p-6 shadow-2xl"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Filtrer par tags</h2>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-full hover:bg-tambouille-surface-hover"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="py-8 text-center text-tambouille-muted">Chargement...</div>

      <div v-else-if="tags.length === 0" class="py-8 text-center text-tambouille-muted">
        Aucun tag disponible.
      </div>

      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="tag in tags"
          :key="tag"
          class="rounded-full border px-3 py-1.5 text-sm transition"
          :class="
            isSelected(tag)
              ? 'border-tambouille-accent bg-tambouille-accent text-white'
              : 'border-tambouille-border hover:border-tambouille-accent hover:text-tambouille-accent'
          "
          @click="onToggle(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>
  </div>
</template>
