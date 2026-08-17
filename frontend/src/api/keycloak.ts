/**
 * Le flux `authorization_code` + PKCE contre le realm du club, écrit sur les
 * primitives du navigateur plutôt qu'avec une bibliothèque OIDC.
 *
 * Ce n'est pas de l'ascétisme : l'`id_token` obtenu ici est échangé dans la
 * seconde contre le JWT de Tambouille, et tout ce qu'une bibliothèque apporte
 * — renouvellement silencieux, rafraîchissement, surveillance de session — ne
 * s'exécuterait jamais. Restent `crypto.getRandomValues`, `crypto.subtle`,
 * `sessionStorage` et `URLSearchParams`.
 *
 * Le client est public : il n'a pas de secret, et PKCE est la seule chose qui
 * lie le code d'autorisation à celui qui l'a demandé.
 */

const ISSUER: string = (import.meta.env.VITE_KEYCLOAK_ISSUER ?? '').replace(/\/+$/, '')
const CLIENT_ID: string = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? ''

/** Doit correspondre au mot près à une URI enregistrée sur le realm. */
const REDIRECT_PATH = '/auth/callback'

// Le verifier et le `state` ne survivent qu'à l'aller-retour, dans l'onglet qui
// l'a entamé — `sessionStorage` et non `localStorage` : deux onglets menant
// chacun leur connexion ne doivent pas se marcher dessus.
const VERIFIER_KEY = 'keycloak.verifier'
const STATE_KEY = 'keycloak.state'
const INTENT_KEY = 'keycloak.intent'

// Survit à la connexion par mot de passe, contrairement aux trois clés
// ci-dessus qui ne survivent qu'à un aller-retour. C'est l'*intention* de
// rattacher, et surtout pas un jeton : un `id_token` se périme en quelques
// minutes et aurait toutes les chances d'expirer pendant la saisie du mot de
// passe. On en redemande un neuf, ce qui ne coûte rien puisque la session sur
// le realm est encore ouverte.
const PENDING_LINK_KEY = 'keycloak.pendingLink'

/** Ce que l'appelant voulait faire, à retrouver au retour.
 *  `link` part des réglages et y revient ; `relink` est la reprise d'une
 *  connexion refusée, et ramène là où l'état de la carte est visible. */
export type KeycloakIntent = 'signin' | 'link' | 'relink'

/** Faux tant que les deux variables ne sont pas renseignées : le bouton se tait
 *  alors au lieu d'envoyer l'utilisateur sur une URL incomplète. */
export function isKeycloakConfigured(): boolean {
  return Boolean(ISSUER && CLIENT_ID)
}

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/** Note qu'une carte reste à rattacher une fois la session ouverte. */
export function markPendingLink(): void {
  sessionStorage.setItem(PENDING_LINK_KEY, '1')
}

/**
 * Lit l'intention **et l'efface** : elle ne vaut que pour la connexion qui suit
 * immédiatement. Sans cette consommation en un temps, quelqu'un qui renonce ici
 * verrait sa prochaine connexion, des heures plus tard, partir sans prévenir
 * vers le realm.
 */
export function takePendingLink(): boolean {
  const pending = sessionStorage.getItem(PENDING_LINK_KEY) === '1'
  sessionStorage.removeItem(PENDING_LINK_KEY)
  return pending
}

export function clearPendingLink(): void {
  sessionStorage.removeItem(PENDING_LINK_KEY)
}

/** Efface tout ce qui ne devait durer que le temps de l'aller-retour. */
export function clearKeycloakFlow(): void {
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(INTENT_KEY)
}

/**
 * Quitte la page vers l'écran de connexion du realm. Ne rend jamais la main :
 * la suite se passe au retour, dans `exchangeKeycloakCode`.
 */
export async function startKeycloakFlow(intent: KeycloakIntent): Promise<void> {
  const verifier = randomToken(32)
  const state = randomToken(16)

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(INTENT_KEY, intent)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${window.location.origin}${REDIRECT_PATH}`,
    // `profile` en plus d'`email` : c'est lui qui porte le claim `name`, dont le
    // backend tire le nom affiché d'un compte créé par une carte. Sans ce scope,
    // tous les comptes créés naîtraient nommés d'après leur adresse.
    scope: 'openid email profile',
    state,
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: 'S256',
  })

  window.location.assign(`${ISSUER}/protocol/openid-connect/auth?${params.toString()}`)
}

export class KeycloakFlowError extends Error {}

/**
 * Traite le retour du realm et rend l'`id_token`. Efface l'état de l'aller-retour
 * dans tous les cas, y compris en erreur : un verifier qui traîne serait rejoué
 * au retour suivant, sur un `state` qui ne lui correspond plus.
 */
export async function exchangeKeycloakCode(
  search: string,
): Promise<{ idToken: string; intent: KeycloakIntent }> {
  const params = new URLSearchParams(search)
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const intent = (sessionStorage.getItem(INTENT_KEY) ?? 'signin') as KeycloakIntent
  clearKeycloakFlow()

  // Le realm a refusé ou l'utilisateur a renoncé : il n'y a pas de code à
  // échanger, et le message vient de lui.
  const providerError = params.get('error')
  if (providerError) {
    throw new KeycloakFlowError(params.get('error_description') ?? providerError)
  }

  const code = params.get('code')
  const state = params.get('state')
  // Comparé avant de toucher au code. Un `state` absent ou différent veut dire
  // que ce retour n'appartient pas à la demande partie d'ici — on n'échange rien.
  if (!expectedState || state !== expectedState) {
    throw new KeycloakFlowError("Cette réponse ne correspond à aucune demande partie d'ici.")
  }
  if (!code || !verifier) {
    throw new KeycloakFlowError('Réponse incomplète du fournisseur.')
  }

  const response = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      // Renvoyée à l'identique : le realm la compare à celle de la demande.
      redirect_uri: `${window.location.origin}${REDIRECT_PATH}`,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })

  if (!response.ok) {
    throw new KeycloakFlowError("L'échange du code d'autorisation a échoué.")
  }

  const payload = (await response.json()) as { id_token?: string }
  if (!payload.id_token) {
    throw new KeycloakFlowError("Le fournisseur n'a pas renvoyé de jeton d'identité.")
  }

  return { idToken: payload.id_token, intent }
}
