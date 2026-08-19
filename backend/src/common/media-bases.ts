import { InternalServerErrorException } from '@nestjs/common';
import type { Request } from 'express';
import type { MediaBases } from './audio-source';

/**
 * Les bases d'URL absolues dont un flux a besoin.
 *
 * L'origine de l'API est lue sur la requête plutôt que dans une variable :
 * elle y est déjà, et `app.set('trust proxy', 1)` dans `main.ts` fait que
 * l'hôte vu est celui qu'Apache a transmis, pas celui du socket Passenger. Une
 * variable de plus serait une valeur à tenir juste sur trois environnements
 * pour rien.
 *
 * `R2_PUBLIC_URL`, elle, n'est déductible de rien : le backend ne stocke que
 * des clés d'objet, et seul le frontend connaissait jusqu'ici l'URL publique du
 * bucket (`VITE_R2_PUBLIC_URL`). Elle est lue au premier usage et non au
 * démarrage, pour qu'une variable absente n'empêche pas l'API de démarrer — un
 * flux en panne vaut mieux qu'un site éteint.
 */
export function mediaBasesFor(request: Request): MediaBases {
  const r2 = process.env.R2_PUBLIC_URL;
  if (!r2) {
    // Un défaut de configuration, pas une ressource absente : le message nomme
    // la variable plutôt que de laisser un 404 faire croire à un mix disparu.
    throw new InternalServerErrorException(
      'R2_PUBLIC_URL is not set — audio URLs cannot be resolved',
    );
  }

  return {
    r2: r2.replace(/\/$/, ''),
    api: `${request.protocol}://${request.get('host') ?? ''}`,
  };
}
