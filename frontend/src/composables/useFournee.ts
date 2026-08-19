import { ref, onMounted, type Ref } from 'vue'
import { apiClient } from '@/api/client'
import { parseFournee, selectFournee, type FourneeSource } from '@/content/fournees'
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
 */
export async function resolveMixes(ids: string[]): Promise<Mix[]> {
  const reponses = await Promise.allSettled(ids.map((id) => apiClient.get<Mix>(`/mixes/${id}`)))
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

export function useFournee(): { fournee: Ref<Fournee | null> } {
  const fournee = ref<Fournee | null>(null)

  onMounted(async () => {
    const source = selectFournee(loadFourneeSources(), new Date())
    if (!source) return
    const mixes = await resolveMixes(source.mixIds)
    if (mixes.length < MIX_MINIMUM) return
    const { from: _from, to: _to, mixIds: _mixIds, ...editorial } = source
    fournee.value = { ...editorial, mixes }
  })

  return { fournee }
}
