"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LARGEURS_DE_VARIANTE = void 0;
exports.repertoireImage = repertoireImage;
exports.cleDeVariante = cleDeVariante;
exports.clesDeVariantes = clesDeVariantes;
exports.estUneVariante = estUneVariante;
exports.LARGEURS_DE_VARIANTE = {
    covers: [400, 800],
    avatars: [128, 256],
    banners: [800, 1400],
};
function repertoireImage(cle) {
    const separateur = cle.indexOf('/');
    if (separateur < 1)
        return undefined;
    const repertoire = cle.slice(0, separateur);
    return repertoire in exports.LARGEURS_DE_VARIANTE ? repertoire : undefined;
}
function cleDeVariante(cle, largeur) {
    const point = cle.lastIndexOf('.');
    if (point < 1)
        return `${cle}-${largeur}`;
    return `${cle.slice(0, point)}-${largeur}${cle.slice(point)}`;
}
function clesDeVariantes(cle) {
    const repertoire = repertoireImage(cle);
    if (!repertoire)
        return [];
    if (estUneVariante(cle))
        return [];
    return exports.LARGEURS_DE_VARIANTE[repertoire].map((largeur) => cleDeVariante(cle, largeur));
}
function estUneVariante(cle) {
    const repertoire = repertoireImage(cle);
    if (!repertoire)
        return false;
    const point = cle.lastIndexOf('.');
    const sansExtension = point < 1 ? cle : cle.slice(0, point);
    const suffixe = sansExtension.match(/-(\d+)$/);
    if (!suffixe)
        return false;
    return exports.LARGEURS_DE_VARIANTE[repertoire].includes(Number(suffixe[1]));
}
//# sourceMappingURL=image-variantes.js.map