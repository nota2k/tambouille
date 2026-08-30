# Liaison ouverte à tous les membres, avec preuve de possession — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** N'importe quel membre de Tambouille peut lier son compte Musiques Incongrues, après avoir prouvé qu'il en est bien le titulaire.

**Architecture:** Le membre saisit son pseudo forum ; Tambouille enregistre un lien non vérifié et affiche un jeton. Le membre publie ce jeton n'importe où sur le forum, puis demande la vérification : Tambouille lit ses messages récents par l'API publique et valide. Seuls les liens vérifiés sont synchronisés. La liste d'autorisation `INCONGRUES_ALLOWED_USERNAMES` disparaît.

**Tech Stack:** NestJS 11, Prisma, Jest, Vue 3, `safeFetch`.

**Contexte :** ce plan corrige une erreur d'intention de `docs/superpowers/specs/2026-08-29-musiques-incongrues-design.md`, qui rangeait « les autres membres du forum » dans ce qu'il ne traitait pas. L'intention réelle est l'inverse : tout membre doit pouvoir le faire.

## Global Constraints

- **Tout appel sortant passe par `safeFetch`** (`src/common/safe-fetch.ts`).
- **Aucun test ne touche le réseau ni la base.**
- **Commentaires et messages d'erreur en français**, expliquant POURQUOI.
- **Pas de `ConfigService`** — `process.env` en direct.
- **Pas de `prisma migrate dev`** : migration écrite à la main dans un dossier horodaté `AAAAMMJJHHMMSS`, calquée sur les voisines, puis `npx prisma generate`. Appliquer une migration est un geste manuel de ce projet (voir `backend/README.md`, § « Ce qui reste manuel »).
- **Le jeton est une valeur secrète de faible enjeu** : il prouve la possession d'un compte forum, rien d'autre. Il peut apparaître à l'écran et dans un message public — c'est même son usage.
- **Les tests des specs existants ne doivent pas être réécrits pour accommoder un changement.** S'ils cassent, c'est que le comportement a changé : le dire.

## File Structure

**Créés**

| Fichier | Responsabilité |
|---|---|
| `backend/src/incongrues/incongrues.verification.service.ts` | Génère le jeton, le vérifie contre les messages du forum. |
| `backend/prisma/migrations/<horodatage>_incongrues_verification/migration.sql` | Deux colonnes. |

**Modifiés**

| Fichier | Changement |
|---|---|
| `backend/prisma/schema.prisma` | `incongruesToken`, `incongruesVerifiedAt` |
| `backend/src/imports/flarum.client.ts` | `listPostsByAuthor`, `listRecentDiscussions` |
| `backend/src/incongrues/incongrues.sync.service.ts` | Filtre sur `incongruesVerifiedAt`, sonnerie ciblée |
| `backend/src/users/users.service.ts` | La garde de liste disparaît ; le lien repart non vérifié |
| `backend/src/users/users.controller.ts` | Deux routes : demander un jeton, vérifier |
| `backend/src/auth/auth.service.ts` | `toPublicUser` porte l'état du lien |
| `backend/src/incongrues/allowed-usernames.ts` | **Supprimé** |
| `backend/.env.example`, `backend/README.md` | `INCONGRUES_ALLOWED_USERNAMES` retirée, mécanisme documenté |
| `frontend/src/views/SettingsView.vue`, `frontend/src/types/index.ts` | Les trois états du lien |

---

### Task 1 : Les colonnes et le service de vérification

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<horodatage>_incongrues_verification/migration.sql`
- Modify: `backend/src/imports/flarum.client.ts` (+ son spec)
- Create: `backend/src/incongrues/incongrues.verification.service.ts` (+ son spec)

**Interfaces:**
- Produces:
  ```ts
  // FlarumClient
  listPostsByAuthor(username: string, limit?: number): Promise<{ id: string; contentHtml: string; createdAt: string }[]>
  // IncongruesVerificationService
  demanderJeton(userId: string, incongruesUsername: string): Promise<{ token: string }>
  verifier(userId: string): Promise<{ verifie: boolean; raison?: string }>
  export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
  ```

- [ ] **Step 1 : Les colonnes**

Dans `schema.prisma`, modèle `User`, à côté d'`incongruesUsername` :

```prisma
  /// Le jeton que le membre doit publier sur le forum pour prouver qu'il tient
  /// ce compte. Null une fois la preuve faite — il n'a plus rien à prouver, et
  /// le garder ferait croire à une vérification en attente.
  incongruesToken     String?
  /// Quand la preuve a été faite. Null tant qu'elle ne l'est pas : c'est CETTE
  /// colonne, et non `incongruesUsername`, qui autorise la synchronisation.
  /// Un pseudo saisi ne prouve rien ; seul un jeton retrouvé sur le forum prouve.
  incongruesVerifiedAt DateTime?
```

Migration à la main, horodatage postérieur à `20260830100000_incongrues_username`, calquée sur elle. Deux `ALTER TABLE ... ADD COLUMN`, nullable, sans défaut. Pas d'index : rien ne cherche par jeton, on lit toujours la ligne du compte. Puis `npx prisma generate`.

- [ ] **Step 2 : Le test de `listPostsByAuthor`**

Dans `flarum.client.spec.ts`, en réutilisant le harnais existant :

```ts
describe('FlarumClient.listPostsByAuthor', () => {
  it('demande les messages les plus RÉCENTS de cet auteur', async () => {
    repondAvec({ data: [] });
    await new FlarumClient().listPostsByAuthor('nota');

    const [url] = mockSafeFetch.mock.calls[0];
    expect(url).toContain('filter%5Bauthor%5D=nota');
    // Le tri par défaut de Flarum est chronologique CROISSANT : sans ce
    // paramètre, on lirait les messages de 2012 et jamais celui qui vient
    // d'être publié.
    expect(url).toContain('sort=-createdAt');
  });

  it('rend le contenu de chaque message', async () => {
    repondAvec({
      data: [
        { type: 'posts', id: '1', attributes: { contentHtml: '<p>tambouille-7f3a9c</p>', createdAt: '2026-08-30T10:00:00+00:00' } },
      ],
    });
    const messages = await new FlarumClient().listPostsByAuthor('nota');

    expect(messages).toEqual([
      { id: '1', contentHtml: '<p>tambouille-7f3a9c</p>', createdAt: '2026-08-30T10:00:00+00:00' },
    ]);
  });

  it('rend une liste vide quand l’auteur n’a aucun message', async () => {
    repondAvec({ data: [] });
    await expect(new FlarumClient().listPostsByAuthor('inconnu')).resolves.toEqual([]);
  });
});
```

Ajoute le `repondAvec(objet)` s'il n'existe pas : une fabrique qui sérialise un objet en `body`. Ne réécris pas les helpers existants.

- [ ] **Step 3 : Implémenter `listPostsByAuthor`**

Même forme que `listByAuthor` : `safeFetch`, `accept: 'application/json'`, paramètres encodés par la fonction d'encodage déjà présente dans le fichier. `limit` par défaut **20** — assez pour que le membre ne soit pas obligé de vérifier dans la seconde, assez peu pour rester une requête légère.

- [ ] **Step 4 : Le test du service de vérification**

`backend/src/incongrues/incongrues.verification.service.spec.ts` :

```ts
describe('IncongruesVerificationService.demanderJeton', () => {
  it('enregistre le pseudo NON vérifié et rend un jeton', async () => {
    const { sujet, prisma } = harnais();
    const { token } = await sujet.demanderJeton('u1', '  Nota  ');

    expect(token).toMatch(/^tambouille-[0-9a-f]{6}$/);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incongruesUsername: 'Nota',
          incongruesToken: token,
          // La preuve précédente ne vaut plus pour un nouveau pseudo.
          incongruesVerifiedAt: null,
        }),
      }),
    );
  });

  it('rend un jeton différent à chaque demande', async () => {
    const { sujet } = harnais();
    const a = await sujet.demanderJeton('u1', 'nota');
    const b = await sujet.demanderJeton('u1', 'nota');
    expect(a.token).not.toBe(b.token);
  });

  it('refuse un pseudo déjà vérifié par un autre compte', async () => {
    const { sujet, prisma } = harnais();
    prisma.user.update.mockRejectedValue({ code: 'P2002' });
    await expect(sujet.demanderJeton('u1', 'nota')).rejects.toThrow(ConflictException);
  });
});

describe('IncongruesVerificationService.verifier', () => {
  it('valide quand le jeton est dans un message récent', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: { incongruesUsername: 'nota', incongruesToken: 'tambouille-7f3a9c', incongruesTokenAt: new Date() },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      { id: '1', contentHtml: '<p>coucou tambouille-7f3a9c</p>', createdAt: '' },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incongruesVerifiedAt: expect.any(Date),
          // Consommé : le garder ferait croire à une vérification en attente.
          incongruesToken: null,
        }),
      }),
    );
  });

  it('refuse quand le jeton n’est nulle part', async () => {
    const { sujet, flarum, prisma } = harnais({
      user: { incongruesUsername: 'nota', incongruesToken: 'tambouille-7f3a9c', incongruesTokenAt: new Date() },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      { id: '1', contentHtml: '<p>rien ici</p>', createdAt: '' },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('pas trouvé'),
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuse un jeton expiré', async () => {
    const { sujet, flarum } = harnais({
      user: {
        incongruesUsername: 'nota',
        incongruesToken: 'tambouille-7f3a9c',
        incongruesTokenAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    });

    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.stringContaining('expiré'),
    });
    // Rien ne part sur le réseau pour un jeton dont on sait déjà qu'il est mort.
    expect(flarum.listPostsByAuthor).not.toHaveBeenCalled();
  });

  it('refuse quand aucun jeton n’a été demandé', async () => {
    const { sujet } = harnais({ user: { incongruesUsername: null, incongruesToken: null } });
    await expect(sujet.verifier('u1')).resolves.toEqual({
      verifie: false,
      raison: expect.any(String),
    });
  });

  // La comparaison porte sur le TEXTE rendu : le forum peut envelopper le
  // jeton dans des balises, le couper par un retour à la ligne, ou l'entourer
  // d'espaces insécables.
  it('trouve le jeton même enveloppé de balises', async () => {
    const { sujet, flarum } = harnais({
      user: { incongruesUsername: 'nota', incongruesToken: 'tambouille-7f3a9c', incongruesTokenAt: new Date() },
    });
    flarum.listPostsByAuthor.mockResolvedValue([
      { id: '1', contentHtml: '<p><strong>tambouille-7f3a9c</strong></p>', createdAt: '' },
    ]);

    await expect(sujet.verifier('u1')).resolves.toEqual({ verifie: true });
  });
});
```

**Note :** ces tests emploient une colonne `incongruesTokenAt`. Ajoute-la au Step 1 (`DateTime?`) — sans elle, l'expiration du jeton ne peut pas être calculée. Trois colonnes, donc, pas deux : jeton, date d'émission du jeton, date de vérification.

- [ ] **Step 5 : Implémenter le service**

Le jeton : `tambouille-` suivi de six caractères hexadécimaux tirés de `crypto.randomBytes(3)`. Court pour rester recopiable à la main, et il n'a pas à résister à une attaque : le retrouver ne sert qu'à prouver qu'on peut publier sous ce pseudo.

La recherche compare sur le texte du message, balises retirées, en ignorant la casse — le membre peut recopier le jeton en majuscules.

- [ ] **Step 6 : Vérifier**

Run: `cd backend && npx jest src/incongrues src/imports/flarum.client.spec.ts`
Expected: PASS

- [ ] **Step 7 : Commit**

```bash
git add backend/prisma backend/src/imports backend/src/incongrues
git commit -m "feat(incongrues): preuve de possession du compte forum par jeton publié"
```

---

### Task 2 : La synchronisation suit la vérification, la liste disparaît

**Files:**
- Modify: `backend/src/incongrues/incongrues.sync.service.ts` (+ spec)
- Modify: `backend/src/users/users.service.ts` (+ spec)
- Modify: `backend/src/users/users.controller.ts` (+ spec)
- Modify: `backend/src/auth/auth.service.ts` (+ spec)
- Delete: `backend/src/incongrues/allowed-usernames.ts`

**Interfaces:**
- Consumes: `IncongruesVerificationService` (Task 1), `incongruesVerifiedAt`.
- Produces: `POST /users/me/incongrues/token`, `POST /users/me/incongrues/verify`.

- [ ] **Step 1 : Le test de `syncAll`**

Remplace, dans `incongrues.sync.service.spec.ts`, les tests qui portent sur la liste d'autorisation — **ils décrivent un comportement qu'on retire, ils n'ont plus de sens.** À la place :

```ts
it('ne synchronise que les comptes vérifiés', async () => {
  const { sujet, flarum, prisma } = harnais();
  await sujet.syncAll();

  expect(prisma.user.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ incongruesVerifiedAt: { not: null } }),
    }),
  );
  void flarum;
});
```

Retire aussi le `beforeEach`/`afterEach` qui posait `INCONGRUES_ALLOWED_USERNAMES` : la variable n'existe plus.

- [ ] **Step 2 : Le filtre**

Dans `syncAll`, le `where` passe de `{ incongruesUsername: { not: null } }` à `{ incongruesVerifiedAt: { not: null } }`, et le bloc `pseudoAutorise` disparaît avec son `continue`. Supprime `allowed-usernames.ts` et ses imports dans `users.service.ts`.

- [ ] **Step 3 : Les routes**

Dans `users.controller.ts`, deux routes sous `JwtAuthGuard`, qui délèguent au service de vérification :

```ts
  @Post('me/incongrues/token')
  demanderJeton(@CurrentUserId() userId: string, @Body() dto: DemandeJetonDto) {
    return this.verification.demanderJeton(userId, dto.incongruesUsername);
  }

  @Post('me/incongrues/verify')
  verifier(@CurrentUserId() userId: string) {
    return this.verification.verifier(userId);
  }
```

Suis la forme des routes voisines pour le décorateur d'identité et le DTO. **`updateProfile` cesse d'accepter `incongruesUsername`** : la saisie passe désormais par la demande de jeton. Retire le champ du DTO de profil et la garde qui l'accompagnait, et adapte les tests de `users.service.spec.ts` qui la couvraient — en disant lesquels et pourquoi.

Vider le lien doit rester possible : garde un chemin qui remet les quatre colonnes à `null`.

- [ ] **Step 4 : L'état du lien dans `toPublicUser`**

`auth.service.ts` : à côté d'`incongruesUsername`, exposer `incongruesVerified: user.incongruesVerifiedAt !== null` et `incongruesToken`. Le jeton n'est servi qu'au titulaire — `toPublicUser` est déjà son paquet privé, vérifié lors du travail précédent. Ajouter les champs au type en ligne du paramètre, et vérifier **un par un** que tous les appelants les fournissent.

- [ ] **Step 5 : Vérifier**

Run: `cd backend && npx jest && npm run build`
Expected: PASS

- [ ] **Step 6 : Commit**

```bash
git add backend/src
git commit -m "feat(incongrues): seuls les liens vérifiés sont synchronisés"
```

---

### Task 3 : La sonnerie ciblée

**Files:**
- Modify: `backend/src/imports/flarum.client.ts` (+ spec)
- Modify: `backend/src/incongrues/incongrues.sync.service.ts` (+ spec)

**Interfaces:**
- Produces: `FlarumClient.listRecentDiscussions(limit?: number): Promise<FlarumDiscussion[]>`, `IncongruesSyncService.syncDepuisSonnerie(): Promise<number>`

**Pourquoi.** Aujourd'hui chaque sonnerie parcourt tous les comptes vérifiés, à raison d'une requête chacun. Avec trente membres liés, c'est trente requêtes par minute vers le forum — plus de 40 000 par jour. La correction précédente ne tenait que parce qu'il n'y avait qu'un compte.

- [ ] **Step 1 : Le test**

```ts
describe('IncongruesSyncService.syncDepuisSonnerie', () => {
  it('ne lit QU’UNE fois le forum, quel que soit le nombre de comptes liés', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
      { id: 'u2', incongruesUsername: 'gakona' },
      { id: 'u3', incongruesUsername: 'autre' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([]);

    await sujet.syncDepuisSonnerie();

    expect(flarum.listRecentDiscussions).toHaveBeenCalledTimes(1);
    expect(flarum.listByAuthor).not.toHaveBeenCalled();
  });

  it('ne synchronise que les auteurs vérifiés parmi les discussions récentes', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', incongruesUsername: 'nota' },
      { id: 'u2', incongruesUsername: 'gakona' },
    ]);
    flarum.listRecentDiscussions.mockResolvedValue([
      { ...discussion('1'), authorUsername: 'gakona' },
      { ...discussion('2'), authorUsername: 'inconnu' },
    ]);

    await sujet.syncDepuisSonnerie();

    expect(flarum.listByAuthor).toHaveBeenCalledTimes(1);
    expect(flarum.listByAuthor).toHaveBeenCalledWith('gakona');
  });

  it('ignore la casse du pseudo entre le forum et la base', async () => {
    const { sujet, flarum, prisma } = harnais();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', incongruesUsername: 'Nota' }]);
    flarum.listRecentDiscussions.mockResolvedValue([
      { ...discussion('1'), authorUsername: 'nota' },
    ]);

    await sujet.syncDepuisSonnerie();
    expect(flarum.listByAuthor).toHaveBeenCalledWith('Nota');
  });
});
```

- [ ] **Step 2 : `listRecentDiscussions`**

`GET /api/discussions?sort=-createdAt&page[limit]=<limit>&include=firstPost,user`, limite par défaut **10**. Il faut le nom d'auteur : ajoute `authorUsername?: string` à `FlarumDiscussion`, rempli depuis la relation `user` incluse. Les autres chemins qui construisent un `FlarumDiscussion` le laissent absent — vérifie que rien ne casse.

- [ ] **Step 3 : `syncDepuisSonnerie`**

Lit les discussions récentes, croise leurs auteurs avec les comptes vérifiés (comparaison insensible à la casse), et appelle `syncUser` pour chacun des comptes concernés seulement. Garde l'anti-rebond d'une minute. Le webhook appelle cette méthode ; le filet de rattrapage horaire garde `syncAll`, qui reste le parcours complet et rattrape ce que la sonnerie a manqué.

- [ ] **Step 4 : Vérifier**

Run: `cd backend && npx jest && npm run build`

- [ ] **Step 5 : Commit**

```bash
git commit -am "perf(incongrues): la sonnerie ne lit le forum qu'une fois"
```

---

### Task 4 : Les trois états dans les réglages, et la documentation

**Files:**
- Modify: `frontend/src/views/SettingsView.vue`, `frontend/src/types/index.ts`
- Modify: `backend/.env.example`, `backend/README.md`

- [ ] **Step 1 : Le type**

`UserProfile` gagne `incongruesVerified?: boolean` et `incongruesToken?: string | null`.

- [ ] **Step 2 : Les trois états**

Dans `SettingsView.vue`, à la place du champ simple :

- **Non lié** — un champ « Pseudo Musiques Incongrues » et un bouton « Lier mon compte », qui appelle `POST /users/me/incongrues/token`.
- **En attente** — le jeton en évidence, et la marche à suivre en une phrase : publier ce jeton dans un message sur le forum, puis revenir cliquer sur « J'ai publié le jeton », qui appelle `POST /users/me/incongrues/verify`. Afficher la raison quand la vérification échoue. Dire que le message peut être supprimé ensuite.
- **Vérifié** — le pseudo lié, et un bouton pour délier.

Suis les conventions visuelles des blocs déjà présents dans le fichier. Le texte est en français, adressé à quelqu'un qui n'est pas développeur : « jeton » plutôt que « token », et une phrase qui dit à quoi ça sert plutôt qu'une consigne sèche.

- [ ] **Step 3 : La documentation**

Retire `INCONGRUES_ALLOWED_USERNAMES` de `.env.example` et de `backend/README.md`, et remplace son paragraphe par la description du mécanisme de preuve. `INCONGRUES_WEBHOOK_SECRET` reste.

- [ ] **Step 4 : Vérifier**

Run: `cd backend && npx jest` puis `cd frontend && npm test && npx vue-tsc --build`

- [ ] **Step 5 : Commit**

```bash
git commit -am "feat(profil): lier son compte forum en trois états"
```
