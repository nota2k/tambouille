/**
 * `IncongruesWebhookController` importe `IncongruesSyncService`, qui importe
 * `MixesService` pour son seul typage — mais ce module construit son client
 * R2 au chargement et exige les variables R2_* : sans ce mock, ce test
 * échouerait pour une raison qui ne le concerne pas.
 */
jest.mock('../common/upload.utils', () => ({
  deleteFromR2: jest.fn().mockResolvedValue(undefined),
}));

import { NotFoundException } from '@nestjs/common';
import { IncongruesWebhookController } from './incongrues.webhook.controller';

function harnais(secret?: string) {
  const sync = { syncDepuisSonnerie: jest.fn().mockResolvedValue(2) };
  const precedent = process.env.INCONGRUES_WEBHOOK_SECRET;
  if (secret === undefined) delete process.env.INCONGRUES_WEBHOOK_SECRET;
  else process.env.INCONGRUES_WEBHOOK_SECRET = secret;

  return {
    controleur: new IncongruesWebhookController(sync as never),
    sync,
    restaurer: () => {
      if (precedent === undefined) delete process.env.INCONGRUES_WEBHOOK_SECRET;
      else process.env.INCONGRUES_WEBHOOK_SECRET = precedent;
    },
  };
}

describe('IncongruesWebhookController', () => {
  it('accepte le bon secret et sonne une fois', async () => {
    const { controleur, sync, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('s3cr3t')).resolves.toEqual({ crees: 2 });
      expect(sync.syncDepuisSonnerie).toHaveBeenCalledTimes(1);
    } finally {
      restaurer();
    }
  });

  // 404 et non 401 : un 401 confirmerait que la route existe.
  it('répond 404 sur un mauvais secret, sans rien déclencher', async () => {
    const { controleur, sync, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('faux')).rejects.toThrow(
        NotFoundException,
      );
      expect(sync.syncDepuisSonnerie).not.toHaveBeenCalled();
    } finally {
      restaurer();
    }
  });

  it('répond 404 quand aucun secret n’est configuré', async () => {
    const { controleur, sync, restaurer } = harnais(undefined);
    try {
      await expect(controleur.sonner('')).rejects.toThrow(NotFoundException);
      await expect(controleur.sonner('nimporte')).rejects.toThrow(
        NotFoundException,
      );
      expect(sync.syncDepuisSonnerie).not.toHaveBeenCalled();
    } finally {
      restaurer();
    }
  });

  // C'est la propriété qui rend le format Discord de FoF Webhooks sans
  // importance : la route ne lit jamais sa charge utile.
  it('réussit quelle que soit la charge utile', async () => {
    const { controleur, restaurer } = harnais('s3cr3t');
    try {
      await expect(controleur.sonner('s3cr3t')).resolves.toEqual({ crees: 2 });
    } finally {
      restaurer();
    }
  });
});
