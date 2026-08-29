import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiErrorMessage, apiErrorStatus } from '../apiError'

/** Une erreur telle qu'axios la lève, avec le corps que l'API a renvoyé. */
function erreurApi(data: unknown): AxiosError {
  const erreur = new AxiosError('Request failed')
  erreur.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return erreur
}

describe('apiErrorMessage', () => {
  it('rend le message de l’API quand elle en donne un', () => {
    expect(apiErrorMessage(erreurApi({ message: 'Pseudo déjà pris.' }), 'repli')).toBe(
      'Pseudo déjà pris.',
    )
  })

  /**
   * Le cas que le `any` laissait passer : NestJS renvoie un TABLEAU quand
   * plusieurs champs sont invalides, et il atterrissait tel quel dans un
   * `ref<string>`, que Vue affichait collé par des virgules.
   */
  it('assemble les messages quand l’API en renvoie plusieurs', () => {
    const erreur = erreurApi({ message: ['email must be an email', 'password too short'] })
    expect(apiErrorMessage(erreur, 'repli')).toBe('email must be an email, password too short')
  })

  it('se rabat sur le repli quand le corps ne dit rien d’utilisable', () => {
    expect(apiErrorMessage(erreurApi({}), 'repli')).toBe('repli')
    expect(apiErrorMessage(erreurApi({ message: 42 }), 'repli')).toBe('repli')
    expect(apiErrorMessage(erreurApi(null), 'repli')).toBe('repli')
    expect(apiErrorMessage(erreurApi('une chaîne nue'), 'repli')).toBe('repli')
  })

  it('se rabat sur le repli pour ce qui n’est pas une erreur d’API', () => {
    expect(apiErrorMessage(new Error('réseau coupé'), 'repli')).toBe('repli')
    expect(apiErrorMessage('pas une erreur', 'repli')).toBe('repli')
    expect(apiErrorMessage(undefined, 'repli')).toBe('repli')
  })

  /** Un tableau vide, ou qui ne contient rien de lisible, ne vaut pas mieux que rien. */
  it('ignore un tableau sans chaîne exploitable', () => {
    expect(apiErrorMessage(erreurApi({ message: [] }), 'repli')).toBe('repli')
    expect(apiErrorMessage(erreurApi({ message: [null, 7] }), 'repli')).toBe('repli')
  })
})

describe('apiErrorStatus', () => {
  it('rend le statut d’une réponse d’erreur', () => {
    expect(apiErrorStatus(erreurApi({}))).toBe(400)
  })

  /**
   * Une panne de réseau n'a pas de réponse, donc pas de statut. Le distinguer
   * d'un 400 est tout l'intérêt : la page de réinitialisation n'accuse le lien
   * que sur un vrai refus de l'API.
   */
  it('rend undefined quand il n’y a pas de réponse du tout', () => {
    expect(apiErrorStatus(new Error('réseau coupé'))).toBeUndefined()
    expect(apiErrorStatus('pas une erreur')).toBeUndefined()
  })
})
