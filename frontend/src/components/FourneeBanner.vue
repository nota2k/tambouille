<script setup lang="ts">
import FourneeLarge from './FourneeLarge.vue'
import FourneeTall from './FourneeTall.vue'
import type { Fournee } from '@/types'

defineProps<{ fournee: Fournee }>()
</script>

<template>
  <FourneeLarge v-if="fournee.layout === 'large'" :fournee="fournee" />
  <FourneeTall v-else :fournee="fournee" />
</template>
