import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';
import { maxDimensionFor, toWebp } from './image';

/** Une image de test, produite ici pour ne dépendre d'aucun fichier joint. */
function image(
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp' = 'jpeg',
) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 90 },
    },
  })
    [format]()
    .toBuffer();
}

describe('maxDimensionFor', () => {
  it('donne à chaque usage le plafond de son plus grand affichage', () => {
    expect(maxDimensionFor('avatars')).toBe(512);
    expect(maxDimensionFor('covers')).toBe(1400);
    expect(maxDimensionFor('banners')).toBe(2000);
  });

  it('retombe sur le plafond des pochettes pour un usage inconnu', () => {
    expect(maxDimensionFor('misc')).toBe(1400);
  });
});

describe('toWebp', () => {
  it('convertit un JPEG en WebP', async () => {
    const { buffer, contentType, extension } = await toWebp(
      await image(800, 800),
      'covers',
    );

    expect(contentType).toBe('image/webp');
    expect(extension).toBe('.webp');
    expect((await sharp(buffer).metadata()).format).toBe('webp');
  });

  it('allège vraiment le fichier', async () => {
    const original = await image(2000, 2000, 'png');
    const { buffer } = await toWebp(original, 'covers');

    expect(buffer.length).toBeLessThan(original.length);
  });

  it('réduit au plafond de l’usage, en gardant les proportions', async () => {
    const { buffer } = await toWebp(await image(3000, 1500), 'covers');
    const { width, height } = await sharp(buffer).metadata();

    expect(width).toBe(1400);
    expect(height).toBe(700);
  });

  it('réduit un avatar plus fort qu’une pochette', async () => {
    const { buffer } = await toWebp(await image(3000, 3000), 'avatars');

    expect((await sharp(buffer).metadata()).width).toBe(512);
  });

  it('n’agrandit jamais une petite image', async () => {
    const { buffer } = await toWebp(await image(120, 90), 'covers');
    const { width, height } = await sharp(buffer).metadata();

    expect(width).toBe(120);
    expect(height).toBe(90);
  });

  it('laisse tel quel un WebP déjà sous le plafond, plutôt que de le réencoder', async () => {
    const original = await image(600, 600, 'webp');
    const { buffer } = await toWebp(original, 'covers');

    expect(buffer).toBe(original);
  });

  it('réduit tout de même un WebP trop grand', async () => {
    const original = await image(2400, 2400, 'webp');
    const { buffer } = await toWebp(original, 'covers');

    expect(buffer).not.toBe(original);
    expect((await sharp(buffer).metadata()).width).toBe(1400);
  });

  it('applique l’orientation EXIF avant que l’encodage ne la jette', async () => {
    // 6 : « tourner d'un quart de tour ». Une photo prise de travers par un
    // téléphone arrive comme cela, et le WebP produit ne porte plus la
    // consigne — elle doit donc être appliquée aux pixels.
    const couchee = await sharp({
      create: {
        width: 900,
        height: 300,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const { buffer } = await toWebp(couchee, 'covers');
    const { width, height } = await sharp(buffer).metadata();

    expect(width).toBe(300);
    expect(height).toBe(900);
  });

  it('refuse ce qui n’est pas une image, quoi qu’en dise le type déclaré', async () => {
    await expect(
      toWebp(Buffer.from('pas une image du tout'), 'covers'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
