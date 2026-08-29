import {
  buildPreviewHtml,
  escapeHtml,
  previewDescription,
  previewTitle,
  SITE_NAME,
  type PreviewPage,
} from './preview.builder';

const page: PreviewPage = {
  title: 'Tabouïedire par Klaus Vomi',
  description: 'Deux heures de dub.',
  canonical: 'https://tambouille.example/mixes/abc',
};

describe('previewTitle', () => {
  it('suffixe le nom du site', () => {
    expect(previewTitle('Mon mix')).toBe(`Mon mix — ${SITE_NAME}`);
  });

  it('ne répète pas le nom du site', () => {
    expect(previewTitle(SITE_NAME)).toBe(SITE_NAME);
  });
});

describe('previewDescription', () => {
  it('retombe sur le texte de repli quand le champ est vide', () => {
    expect(previewDescription(null, 'un mix')).toBe('un mix');
    expect(previewDescription('   ', 'un mix')).toBe('un mix');
  });

  it('replie les retours à la ligne des champs libres', () => {
    expect(previewDescription('Deux\n\nlignes', 'x')).toBe('Deux lignes');
  });

  it('coupe à l’espace, sous la limite', () => {
    const longue = 'mot '.repeat(80);
    const description = previewDescription(longue, 'x');

    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('…')).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('neutralise les caractères qui sortiraient de la balise', () => {
    expect(escapeHtml('a & b < c > "d" \'e\'')).toBe(
      'a &amp; b &lt; c &gt; &quot;d&quot; &#39;e&#39;',
    );
  });
});

describe('buildPreviewHtml', () => {
  it('publie titre, description et URL sur les balises Open Graph', () => {
    const html = buildPreviewHtml(page);

    expect(html).toContain(
      `<meta property="og:title" content="Tabouïedire par Klaus Vomi — ${SITE_NAME}">`,
    );
    expect(html).toContain(
      '<meta property="og:description" content="Deux heures de dub.">',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://tambouille.example/mixes/abc">',
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://tambouille.example/mixes/abc">',
    );
  });

  it('renvoie vers la vraie page qui n’est pas un robot, et se tient hors de l’index', () => {
    const html = buildPreviewHtml(page);

    expect(html).toContain(
      '<meta http-equiv="refresh" content="0; url=https://tambouille.example/mixes/abc">',
    );
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<a href="https://tambouille.example/mixes/abc">');
  });

  it('n’annonce une carte large que lorsqu’il y a une image', () => {
    expect(buildPreviewHtml(page)).toContain(
      '<meta name="twitter:card" content="summary">',
    );

    const avecImage = buildPreviewHtml({
      ...page,
      image: 'https://cdn.example/cover.jpg',
    });
    expect(avecImage).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(avecImage).toContain(
      '<meta property="og:image" content="https://cdn.example/cover.jpg">',
    );
  });

  it('omet l’audio quand aucun fichier n’est jouable', () => {
    expect(buildPreviewHtml(page)).not.toContain('og:audio');

    const avecAudio = buildPreviewHtml({
      ...page,
      audio: { url: 'https://cdn.example/a.mp3', mimeType: 'audio/mpeg' },
    });
    expect(avecAudio).toContain(
      '<meta property="og:audio" content="https://cdn.example/a.mp3">',
    );
    expect(avecAudio).toContain(
      '<meta property="og:audio:type" content="audio/mpeg">',
    );
  });

  it('échappe ce qui viendrait de la base dans un attribut', () => {
    const html = buildPreviewHtml({
      ...page,
      title: 'Un « mix » <b>gras</b> & "cité"',
    });

    expect(html).toContain('&lt;b&gt;gras&lt;/b&gt; &amp; &quot;cité&quot;');
    expect(html).not.toContain('<b>gras</b>');
  });

  it('ne laisse pas une donnée fermer la balise script des données structurées', () => {
    const html = buildPreviewHtml({
      ...page,
      jsonLd: { name: '</script><img src=x onerror=alert(1)>' },
    });

    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script');
  });
});
