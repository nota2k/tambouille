import axios from 'axios'

/**
 * Le message qu'une erreur d'API porte, ou celui qu'on avait prévu.
 *
 * Quinze `catch (err: any)` faisaient ce travail chacun de son côté. Le `any`
 * ne coûtait pas qu'une entorse au lint : il faisait passer
 * `err.response.data.message` pour une chaîne sans que rien ne l'ait vérifié.
 * Or l'API n'en renvoie pas toujours une — NestJS rend un TABLEAU dès que
 * plusieurs champs sont invalides, et ce tableau atterrissait tel quel dans un
 * `ref<string>`, que Vue affichait collé par des virgules.
 *
 * Le corps de la réponse est donc traité pour ce qu'il est, une valeur
 * inconnue : une chaîne passe, un tableau de chaînes est assemblé, et tout le
 * reste — un nombre, un objet, une réponse vide, une panne de réseau qui n'a
 * pas de corps du tout — laisse la place au repli que l'appelant a choisi.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback

  const corps = error.response?.data as { message?: unknown } | undefined
  const message = corps?.message

  if (typeof message === 'string') return message

  if (Array.isArray(message)) {
    const lignes = message.filter((ligne): ligne is string => typeof ligne === 'string')
    if (lignes.length) return lignes.join(', ')
  }

  return fallback
}

/**
 * Le statut HTTP d'une erreur d'API, ou rien s'il n'y en a pas eu.
 *
 * La distinction compte : une panne de réseau ne porte aucune réponse, donc
 * aucun statut. `ResetPasswordView` s'en sert pour n'accuser le lien que sur un
 * vrai refus de l'API, et non dès que la requête échoue.
 */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
