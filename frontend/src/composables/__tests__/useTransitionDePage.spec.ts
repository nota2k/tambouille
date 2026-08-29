import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  couvrirLaPage,
  signalerImage,
  useTransitionDePage,
  reinitialiserPourTest,
} from '../useTransitionDePage'

/**
 * Ce qui se joue ici n'est pas une animation, c'est une panne évitée.
 *
 * Le voile est un aplat opaque sur toute la page : s'il ne se lève pas, il n'y a
 * plus de site. Ces tests tiennent la seule promesse qui compte — il se lève
 * TOUJOURS — et les trois chemins par lesquels il y arrive.
 */

/** Ce que le composant lit, sans monter de composant. */
function etat() {
  return useTransitionDePage()
}

const MAXIMUM = 1400
const GRACE = 200
const FONDU = 550

describe('useTransitionDePage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reinitialiserPourTest()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("couvre la page dès qu'on le lui demande", () => {
    couvrirLaPage()
    expect(etat().visible.value).toBe(true)
    expect(etat().sortie.value).toBe(false)
  })

  it('lève le voile dès que la dernière pochette est arrivée', () => {
    couvrirLaPage()
    signalerImage.attendue()
    signalerImage.attendue()

    signalerImage.arrivee()
    expect(etat().sortie.value).toBe(false)

    signalerImage.arrivee()
    expect(etat().sortie.value).toBe(true)

    vi.advanceTimersByTime(FONDU)
    expect(etat().visible.value).toBe(false)
  })

  it("ne fait pas attendre une page qui n'a aucune image", () => {
    couvrirLaPage()
    vi.advanceTimersByTime(GRACE)
    expect(etat().sortie.value).toBe(true)

    vi.advanceTimersByTime(FONDU)
    expect(etat().visible.value).toBe(false)
  })

  /**
   * Le cas qui compte le plus : une pochette hors écran en `loading="lazy"`
   * n'est jamais demandée tant qu'on ne défile pas jusqu'à elle. L'attendre,
   * c'est attendre indéfiniment — et la minuterie est ce qui l'empêche.
   */
  it("lève le voile même si une pochette n'arrive jamais", () => {
    couvrirLaPage()
    signalerImage.attendue()

    vi.advanceTimersByTime(GRACE)
    expect(etat().visible.value).toBe(true)

    vi.advanceTimersByTime(MAXIMUM - GRACE)
    expect(etat().sortie.value).toBe(true)

    vi.advanceTimersByTime(FONDU)
    expect(etat().visible.value).toBe(false)
  })

  it('lève le voile quand une pochette échoue au lieu de charger', () => {
    couvrirLaPage()
    signalerImage.attendue()
    // `CoverImage` appelle `arrivee()` sur `error` comme sur `load` : une
    // pochette manquante ne doit pas retenir la page.
    signalerImage.arrivee()

    expect(etat().sortie.value).toBe(true)
  })

  /**
   * Une navigation rapide ne doit pas hériter du compte de la précédente.
   * C'est le défaut qui faisait tenir le voile quatre secondes : le compte
   * n'était pas remis à zéro, et les pochettes de la vue quittée restaient dues.
   */
  it('repart de zéro à chaque navigation, sans traîner les pochettes de la précédente', () => {
    couvrirLaPage()
    signalerImage.attendue()
    signalerImage.attendue()

    // On quitte la vue avant que ses pochettes ne soient arrivées.
    couvrirLaPage()
    expect(etat().visible.value).toBe(true)
    expect(etat().sortie.value).toBe(false)

    // La nouvelle vue n'a qu'une pochette : elle suffit à lever le voile.
    signalerImage.attendue()
    signalerImage.arrivee()
    expect(etat().sortie.value).toBe(true)
  })

  it("ne dépasse jamais la durée maximale, quoi qu'il arrive", () => {
    couvrirLaPage()
    for (let i = 0; i < 20; i++) signalerImage.attendue()

    vi.advanceTimersByTime(MAXIMUM + FONDU)
    expect(etat().visible.value).toBe(false)
  })

  it('recouvre la page à la navigation suivante, une fois le voile levé', () => {
    couvrirLaPage()
    vi.advanceTimersByTime(GRACE + FONDU)
    expect(etat().visible.value).toBe(false)

    couvrirLaPage()
    expect(etat().visible.value).toBe(true)
    expect(etat().sortie.value).toBe(false)
  })
})
