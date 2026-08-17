<script setup lang="ts">
import { isKeycloakConfigured, startKeycloakFlow, type KeycloakIntent } from '@/api/keycloak'

/**
 * Emmène vers le realm du club. Contrairement au bouton Google, il n'y a rien à
 * rendre par un script tiers : c'est un bouton ordinaire qui quitte la page.
 *
 * Ce qu'il faut faire du jeton au retour — ouvrir une session ou rattacher une
 * carte — est la politique de l'appelant, portée ici par `intent` et retrouvée
 * au retour par la vue de rappel.
 */
const props = withDefaults(defineProps<{ intent?: KeycloakIntent; label?: string }>(), {
  intent: 'signin',
  label: 'Continuer avec ma carte de membre',
})

const configured = isKeycloakConfigured()

function onClick() {
  void startKeycloakFlow(props.intent)
}
</script>

<template>
  <button v-if="configured" type="button" class="w-full tb-btn" @click="onClick">
    {{ props.label }}
  </button>
</template>
