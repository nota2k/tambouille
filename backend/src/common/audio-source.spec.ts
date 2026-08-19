import { audioSourceFor } from './audio-source';

const bases = { r2: 'https://cdn.example', api: 'https://api.example' };

function mix(overrides: Partial<Parameters<typeof audioSourceFor>[0]> = {}) {
  return { audioUrl: null, sourceType: null, sourceRef: null, ...overrides };
}

describe('audioSourceFor', () => {
  it('résout une clé R2 sur le bucket public', () => {
    expect(audioSourceFor(mix({ audioUrl: 'audio/abc.mp3' }), bases)).toEqual({
      url: 'https://cdn.example/audio/abc.mp3',
      mimeType: 'audio/mpeg',
    });
  });

  it("résout un fichier d'avant la migration sur cette API", () => {
    expect(
      audioSourceFor(mix({ audioUrl: '/uploads/audio/abc.m4a' }), bases),
    ).toEqual({
      url: 'https://api.example/uploads/audio/abc.m4a',
      mimeType: 'audio/mp4',
    });
  });

  it('résout une source distante sur son URL', () => {
    expect(
      audioSourceFor(
        mix({
          sourceType: 'remote',
          sourceRef: 'https://ailleurs.example/e.ogg',
        }),
        bases,
      ),
    ).toEqual({
      url: 'https://ailleurs.example/e.ogg',
      mimeType: 'audio/ogg',
    });
  });

  it('ignore les paramètres de requête pour deviner le type', () => {
    expect(
      audioSourceFor(
        mix({
          sourceType: 'remote',
          sourceRef: 'https://x.example/e.flac?t=1',
        }),
        bases,
      )?.mimeType,
    ).toBe('audio/flac');
  });

  it("retombe sur audio/mpeg quand l'extension est inconnue", () => {
    expect(
      audioSourceFor(
        mix({ sourceType: 'remote', sourceRef: 'https://x.example/stream' }),
        bases,
      )?.mimeType,
    ).toBe('audio/mpeg');
  });

  it("rend null pour un mix Mixcloud : aucune URL de fichier n'existe", () => {
    expect(
      audioSourceFor(
        mix({ sourceType: 'mixcloud', sourceRef: '/Notamusic/antimythes/' }),
        bases,
      ),
    ).toBeNull();
  });
});
