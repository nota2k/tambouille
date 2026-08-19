<script setup lang="ts">
import FourneeTall from './FourneeTall.vue'
import type { Fournee } from '@/types'

defineProps<{ fournee: Fournee }>()
</script>

<template>
  <FourneeTall :fournee="fournee" />
</template>
