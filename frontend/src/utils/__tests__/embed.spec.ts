import { describe, expect, it } from 'vitest'
import { embedCode, HAUTEUR_EMBED_MIX, HAUTEUR_EMBED_PLAYLIST } from '@/utils/embed'

describe('embedCode', () => {
  it('produit un iframe sur l’adresse donnée, à la hauteur demandée', () => {
    const code = embedCode('https://tambouille.fr/embed/mixes/nelly/mix-57', 200)

    expect(code).toContain('src="https://tambouille.fr/embed/mixes/nelly/mix-57"')
    expect(code).toContain('height="200"')
    expect(code).toContain('width="100%"')
  })

  it('délègue au lecteur la permission de lecture, sans quoi le bouton du cadre reste muet', () => {
    expect(embedCode('https://tambouille.fr/embed/mixes/nelly/mix', 200)).toContain(
      'allow="autoplay"',
    )
  })

  it('ne charge le lecteur qu’une fois atteint dans la page hôte', () => {
    expect(embedCode('https://tambouille.fr/embed/mixes/nelly/mix', 200)).toContain(
      'loading="lazy"',
    )
  })

  it('échappe l’adresse : ce code est collé tel quel dans le HTML d’un tiers', () => {
    const code = embedCode('https://tambouille.fr/e?a=1&b=2"><script>alert(1)</script>', 200)

    expect(code).not.toContain('<script>')
    expect(code).toContain('&amp;')
    expect(code).toContain('&quot;')
    expect(code).toContain('&lt;')
  })

  it('donne plus de place à une playlist qu’à un mix : elle a une liste à montrer', () => {
    expect(HAUTEUR_EMBED_PLAYLIST).toBeGreaterThan(HAUTEUR_EMBED_MIX)
  })
})
