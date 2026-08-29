"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifierTitre = slugifierTitre;
exports.slugUnique = slugUnique;
const LONGUEUR_MAXIMALE = 70;
const REPLI = 'mix';
function slugifierTitre(titre) {
    const sansAccents = titre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    const brut = sansAccents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!brut)
        return REPLI;
    return couperProprement(brut);
}
function couperProprement(valeur) {
    if (valeur.length <= LONGUEUR_MAXIMALE)
        return valeur;
    const coupe = valeur.slice(0, LONGUEUR_MAXIMALE);
    const dernierTiret = coupe.lastIndexOf('-');
    if (dernierTiret <= 0)
        return coupe;
    return coupe.slice(0, dernierTiret);
}
async function slugUnique(titre, estPris) {
    const base = slugifierTitre(titre);
    if (!(await estPris(base)))
        return base;
    for (let n = 2; n <= 100; n++) {
        const candidat = `${base}-${n}`;
        if (!(await estPris(candidat)))
            return candidat;
    }
    throw new Error(`Impossible de trouver un slug libre pour « ${titre} »`);
}
//# sourceMappingURL=slug.js.map