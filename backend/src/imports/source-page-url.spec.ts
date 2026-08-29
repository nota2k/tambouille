import { pageSourceDepuisRef } from './source-page-url';

describe('pageSourceDepuisRef', () => {
  it('rend la clé Mixcloud sous la forme d’une adresse de page', () => {
    expect(pageSourceDepuisRef('mixcloud', '/Notamusic/vorwerk-2/')).toBe(
      'https://www.mixcloud.com/Notamusic/vorwerk-2/',
    );
  });

  it('reconduit une référence SoundCloud, qui est déjà la page', () => {
    expect(
      pageSourceDepuisRef(
        'soundcloud',
        'https://soundcloud.com/dj-pute-acier/tumeur-belge-dj-pute-acier-2015',
      ),
    ).toBe(
      'https://soundcloud.com/dj-pute-acier/tumeur-belge-dj-pute-acier-2015',
    );
  });

  it('remonte d’un fichier Archive.org à la page de son item', () => {
    expect(
      pageSourceDepuisRef(
        'remote',
        'https://archive.org/download/Hzben-Mix57/Hzben-Mix57.mp3',
      ),
    ).toBe('https://archive.org/details/Hzben-Mix57');
  });

  it('remonte d’un mp3 Ouïedire à la page de son émission', () => {
    expect(
      pageSourceDepuisRef(
        'remote',
        'https://www.ouiedire.net/assets/emission/ailleurs-54/ouiedire_ailleurs-54_klaus-vomi_tabouiedire.mp3',
      ),
    ).toBe('https://ouiedire.net/emission/ailleurs-54');
  });

  it('accepte l’hôte Ouïedire sans `www.`', () => {
    expect(
      pageSourceDepuisRef(
        'remote',
        'https://ouiedire.net/assets/emission/ailleurs-131/ouiedire_ailleurs-131_rachitik-data_souvenir-des-sequelles.mp3',
      ),
    ).toBe('https://ouiedire.net/emission/ailleurs-131');
  });

  it('renonce sur un fichier LYL, dont le nom ne porte pas l’épisode', () => {
    expect(
      pageSourceDepuisRef(
        'remote',
        'https://static.lyl.live/uploads/CHRISTIAN_COIFFURE_JUILLET_da91f5c2f0.mp3',
      ),
    ).toBeNull();
  });

  it('renonce sur un hôte inconnu', () => {
    expect(
      pageSourceDepuisRef('remote', 'https://exemple.test/quelque-chose.mp3'),
    ).toBeNull();
  });

  it('renonce sur une référence absente', () => {
    expect(pageSourceDepuisRef('remote', null)).toBeNull();
    expect(pageSourceDepuisRef(null, null)).toBeNull();
  });

  it('renonce sur une référence qui n’est pas une adresse', () => {
    expect(pageSourceDepuisRef('remote', 'pas une url')).toBeNull();
  });
});
