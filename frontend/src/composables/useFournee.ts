import { ref, onMounted, type Ref } from 'vue'
import { apiClient } from '@/api/client'
import { parseFournee, selectFournee, type FourneeSource, type MixRef } from '@/content/fournees'
import type { Fournee, Mix } from '@/types'

/**
 * Les fichiers de fournée, embarqués au build. `eager` parce qu'ils pèsent
 * quelques centaines d'octets chacun et qu'un import différé ferait payer un
 * aller-retour pour décider s'il faut afficher un bandeau.
 */
const FICHIERS = import.meta.glob('@/content/fournees/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Les fournées lisibles. Un fichier fautif est écarté avec son chemin plutôt
 * que de faire échouer le chargement de toute la home : la CI est censée
 * l'avoir arrêté avant (voir `fournees.spec.ts`), et si elle ne l'a pas fait,
 * une home amputée de son bandeau vaut mieux qu'une home blanche.
 */
export function loadFourneeSources(): FourneeSource[] {
  const sources: FourneeSource[] = []
  for (const [path, raw] of Object.entries(FICHIERS)) {
    if (path.endsWith('README.md')) continue
    try {
      sources.push(parseFournee(raw, path))
    } catch (error) {
      console.error('Fournée ignorée :', error)
    }
  }
  return sources
}

/**
 * Les mix d'une fournée, **dans l'ordre du fichier** et non dans celui des
 * réponses. Un mix supprimé depuis l'écriture renvoie 404 : il disparaît de la
 * liste sans bruit, une fournée amputée d'un titre restant plus lisible qu'une
 * home en erreur.
 *
 * L'interrogation se fait par compte et titre, comme l'adresse du mix : le
 * compte n'est pas décoratif, un titre d'URL n'étant unique que par compte.
 */
export async function resolveMixes(refs: MixRef[]): Promise<Mix[]> {
  const reponses = await Promise.allSettled(
    refs.map((ref) => apiClient.get<Mix>(`/mixes/by-slug/${ref.username}/${ref.slug}`)),
  )
  const mixes: Mix[] = []
  for (const reponse of reponses) {
    if (reponse.status === 'fulfilled') mixes.push(reponse.value.data)
  }
  return mixes
}

/**
 * En dessous de trois mix survivants, pas de bandeau : la bande du gabarit n'a
 * plus de tenue. Ce seuil ne contredit pas les comptes exacts exigés par le
 * parseur — celui-ci porte sur ce que le fichier déclare, au build ; celui-là
 * sur ce qui survit, au chargement.
 */
const MIX_MINIMUM = 3

/** L'éditorial seul : ce que le fichier dit, sans ses dates ni ses identifiants. */
function sansMixes(source: FourneeSource): Fournee {
  const { from: _from, to: _to, display: _display, mixRefs: _mixRefs, ...editorial } = source
  return { ...editorial, mixes: [] }
}

/**
 * Le bandeau du moment, **rendu avant ses mix**.
 *
 * Tout ce qui fait sa hauteur — le gabarit, le titre, l'intro, la couleur — est
 * lu dans un fichier embarqué au build, donc connu sans attendre personne. Les
 * mix, eux, demandent cinq appels à l'API. Les avoir attendus pour monter le
 * bandeau insérait 835 pixels en tête de page vers 900 ms et poussait tout le
 * reste vers le bas : à lui seul, ce saut valait 0,77 de décalage cumulé, sur
 * un seuil de 0,1.
 *
 * `mixes` vide se lit donc « pas encore arrivés » et non « aucun » : quand la
 * fournée n'a pas ses trois mix, c'est `fournee` elle-même qui repasse à null.
 */
export function useFournee(): { fournee: Ref<Fournee | null> } {
  const source = selectFournee(loadFourneeSources(), new Date())
  const fournee = ref<Fournee | null>(source ? sansMixes(source) : null)

  onMounted(async () => {
    if (!source) return
    const mixes = await resolveMixes(source.mixRefs)
    // Un bandeau amputé de sa bande n'a plus de tenue : il disparaît, au prix
    // d'un décalage que seule une erreur éditoriale peut provoquer — un fichier
    // qui cite des mix supprimés depuis.
    if (mixes.length < MIX_MINIMUM) {
      fournee.value = null
      return
    }
    fournee.value = { ...sansMixes(source), mixes }
  })

  return { fournee }
}
