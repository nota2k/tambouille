/**
 * Google Identity Services, chargé quand on en a besoin et pas avant.
 *
 * La bibliothèque était appelée par une balise `<script>` d'`index.html`, donc
 * sur les six cent mille pages du site pour les trois qui s'en servent :
 * connexion, inscription, réglages. Cent kilo-octets transférés, deux cent
 * soixante-douze analysés, dont Lighthouse mesurait 83 % de code jamais
 * exécuté — et une origine tierce de plus à ouvrir pendant que l'accueil
 * essaie d'afficher sa première image.
 *
 * Elle part désormais du bouton lui-même, au montage. Le retard ainsi introduit
 * est celui d'un utilisateur qui vient d'arriver sur la page de connexion et
 * n'a pas encore lu le formulaire : il ne se voit pas, là où le poids se voyait
 * partout ailleurs.
 */

/** Ce que Tambouille utilise de la bibliothèque, et rien de plus. */
export interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (response: { credential: string }) => void
      }): void
      renderButton(
        parent: HTMLElement,
        options: { theme: string; size: string; text: string; locale: string },
      ): void
    }
  }
}

const SRC = 'https://accounts.google.com/gsi/client'

/**
 * La promesse est retenue au niveau du module : trois boutons montés dans la
 * même session — c'est le cas des réglages, où le formulaire réapparaît —
 * partagent le même chargement au lieu d'insérer trois balises.
 */
let chargement: Promise<GoogleIdentity | null> | null = null

function objetGlobal(): GoogleIdentity | undefined {
  return (window as unknown as { google?: GoogleIdentity }).google
}

export function loadGoogleIdentity(): Promise<GoogleIdentity | null> {
  if (chargement) return chargement

  chargement = new Promise<GoogleIdentity | null>((resolve) => {
    // Déjà là : une balise laissée par une version précédente, ou un rechargement
    // à chaud en développement.
    const dejaLa = objetGlobal()
    if (dejaLa) return resolve(dejaLa)

    const balise = document.createElement('script')
    balise.src = SRC
    balise.async = true
    balise.defer = true
    /**
     * Un échec ne remonte pas en exception : le formulaire de connexion par
     * mot de passe est juste au-dessus et reste utilisable. Le bouton Google,
     * lui, ne s'affiche simplement pas — ce que `renderButton` ne pourrait pas
     * faire de toute façon.
     *
     * `chargement` est remis à null pour qu'une seconde visite de la page
     * retente, plutôt que de mémoriser un échec réseau passager.
     */
    balise.onerror = () => {
      chargement = null
      resolve(null)
    }
    balise.onload = () => resolve(objetGlobal() ?? null)
    document.head.appendChild(balise)
  })

  return chargement
}
