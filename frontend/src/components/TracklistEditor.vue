<script setup lang="ts">
import type { TrackRow } from '@/utils/tracklist'

const rows = defineModel<TrackRow[]>({ required: true })

function addRow() {
  rows.value.push({ timecode: '', artist: '', title: '' })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
}
</script>

<template>
  <div>
    <div class="space-y-2">
      <div v-for="(row, index) in rows" :key="index" class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <input
          v-model="row.timecode"
          type="text"
          placeholder="mm:ss"
          class="w-20 shrink-0 rounded-lg border border-tambouille-border bg-tambouille-surface px-2 py-1.5 text-sm outline-none focus:border-tambouille-accent"
        />
        <input
          v-model="row.artist"
          type="text"
          placeholder="Artiste"
          maxlength="200"
          class="min-w-0 flex-1 rounded-lg border border-tambouille-border bg-tambouille-surface px-2 py-1.5 text-sm outline-none focus:border-tambouille-accent"
        />
        <input
          v-model="row.title"
          type="text"
          placeholder="Titre du morceau"
          maxlength="200"
          class="min-w-0 flex-1 rounded-lg border border-tambouille-border bg-tambouille-surface px-2 py-1.5 text-sm outline-none focus:border-tambouille-accent"
        />
        <button
          type="button"
          class="shrink-0 rounded-full p-1.5 text-tambouille-muted hover:bg-tambouille-surface-hover hover:text-red-400"
          title="Supprimer ce morceau"
          @click="removeRow(index)"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
            <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>

    <button type="button" class="mt-2 text-sm text-tambouille-accent hover:underline" @click="addRow">
      + Ajouter un morceau
    </button>
  </div>
</template>
