import { describe, it, expect } from 'vitest'
import {
  buildSeoHead,
  DEFAULT_DESCRIPTION,
  normalizeDescription,
  pageTitle,
  SITE_NAME,
  truncate,
} from '../seo'

const URL_COURANTE = 'https://tambouille.example/mixes/abc'

function contenu(head: ReturnType<typeof buildSeoHead>, key: string) {
  return head.meta.find((tag) => tag.key === key)?.content
}

describe('pageTitle', () => {
  it('suffixe le nom du site', () => {
    expect(pageTitle('Mon mix')).toBe(`Mon mix — ${SITE_NAME}`)
  })

  it('ne répète pas le nom du site', () => {
    expect(pageTitle(SITE_NAME)).toBe(SITE_NAME)
  })

  it('retombe sur le nom du site quand le titre est vide', () => {
    expect(pageTitle('   ')).toBe(SITE_NAME)
    expect(pageTitle(undefined)).toBe(SITE_NAME)
  })
})

describe('normalizeDescription', () => {
  it('réduit les retours à la ligne des champs libres à une seule ligne', () => {
    expect(normalizeDescription('Deux\n\nparagraphes   espacés ')).toBe('Deux paragraphes espacés')
  })

  it('rend une chaîne vide pour une description absente', () => {
    expect(normalizeDescription(null)).toBe('')
  })
})

describe('truncate', () => {
  it('laisse intact ce qui tient dans la limite', () => {
    expect(truncate('court', 20)).toBe('court')
  })

  it('coupe au dernier espace et signale la coupe', () => {
    expect(truncate('un deux trois quatre', 14)).toBe('un deux trois…')
  })

  it('coupe en plein mot quand il n’y a pas d’espace exploitable', () => {
    expect(truncate('a'.repeat(30), 10)).toBe(`${'a'.repeat(9)}…`)
  })
})

describe('buildSeoHead', () => {
  it('décrit une page par défaut sans rien inventer', () => {
    const head = buildSeoHead({}, URL_COURANTE)

    expect(head.title).toBe(SITE_NAME)
    expect(contenu(head, 'description')).toBe(DEFAULT_DESCRIPTION)
    expect(contenu(head, 'og:type')).toBe('website')
    expect(head.canonical).toBe(URL_COURANTE)
    expect(head.jsonLd).toBeNull()
  })

  it('reprend le titre et la description sur les balises Open Graph et Twitter', () => {
    const head = buildSeoHead(
      { title: 'Mon mix', description: 'Une heure de techno.' },
      URL_COURANTE,
    )

    expect(contenu(head, 'og:title')).toBe(`Mon mix — ${SITE_NAME}`)
    expect(contenu(head, 'twitter:title')).toBe(`Mon mix — ${SITE_NAME}`)
    expect(contenu(head, 'og:description')).toBe('Une heure de techno.')
    expect(contenu(head, 'twitter:description')).toBe('Une heure de techno.')
  })

  it('n’annonce une carte large que lorsqu’il y a une image à montrer', () => {
    expect(contenu(buildSeoHead({}, URL_COURANTE), 'twitter:card')).toBe('summary')

    const avecImage = buildSeoHead({ image: 'https://cdn.example/cover.jpg' }, URL_COURANTE)
    expect(contenu(avecImage, 'twitter:card')).toBe('summary_large_image')
    expect(contenu(avecImage, 'og:image')).toBe('https://cdn.example/cover.jpg')
  })

  it('n’ajoute la balise robots que sur les pages retirées de l’index', () => {
    expect(contenu(buildSeoHead({}, URL_COURANTE), 'robots')).toBeUndefined()
    expect(contenu(buildSeoHead({ noindex: true }, URL_COURANTE), 'robots')).toBe('noindex, follow')
  })

  it('préfère la canonique donnée à l’URL courante', () => {
    const head = buildSeoHead({ canonical: 'https://tambouille.example/mixes/xyz' }, URL_COURANTE)
    expect(head.canonical).toBe('https://tambouille.example/mixes/xyz')
    expect(contenu(head, 'og:url')).toBe('https://tambouille.example/mixes/xyz')
  })

  it('sérialise les données structurées telles quelles', () => {
    const head = buildSeoHead({ jsonLd: { '@type': 'MusicRecording', name: 'Mix' } }, URL_COURANTE)
    expect(head.jsonLd).toBe('{"@type":"MusicRecording","name":"Mix"}')
  })

  it('replie une description multiligne trop longue sur une ligne tronquée', () => {
    const longue = `${'mot '.repeat(80)}`
    const head = buildSeoHead({ description: `Intro\n\n${longue}` }, URL_COURANTE)
    const description = contenu(head, 'description') ?? ''

    expect(description.length).toBeLessThanOrEqual(160)
    expect(description).not.toContain('\n')
    expect(description.endsWith('…')).toBe(true)
  })
})
