/**
 * Les pseudos du forum qu'un compte Tambouille a le droit de revendiquer.
 *
 * Sans cette liste, n'importe quel compte inscrit pourrait saisir le pseudo
 * d'un membre prolifique de Musiques Incongrues et faire paraître ses mix SOUS
 * SON PROPRE COMPTE. Le design range explicitement la publication du contenu
 * d'autrui dans ce qu'il ne traite pas.
 *
 * Lue à chaque appel plutôt qu'au chargement : `backend/.env` vit sur le
 * serveur, et une liste changée doit prendre effet au redémarrage sans qu'on
 * ait à se souvenir de l'ordre des imports.
 *
 * Absente ou vide, elle n'autorise RIEN — même règle que le webhook, où un
 * secret absent ferme la route plutôt que de l'ouvrir à tous.
 *
 * Elle vit ici, et non dans `UsersService`, parce que deux endroits la
 * consultent pour des raisons différentes : la saisie du pseudo, qui refuse
 * une revendication, et la synchronisation, qui refuse de continuer à publier
 * pour un pseudo que la liste ne couvre plus. Une seule définition, sinon
 * retirer un pseudo de la liste ne retirerait qu'à moitié.
 */
export function pseudosAutorises(): string[] {
  return (process.env.INCONGRUES_ALLOWED_USERNAMES ?? '')
    .split(',')
    .map((pseudo) => pseudo.trim().toLowerCase())
    .filter(Boolean);
}

/** La liste ignore la casse : le forum écrit « Nota », l'utilisateur saisit
 *  « nota », et les deux désignent le même compte. */
export function pseudoAutorise(pseudo: string): boolean {
  return pseudosAutorises().includes(pseudo.trim().toLowerCase());
}
