import { VeilleController } from './veille.controller';

describe('VeilleController', () => {
  const service = {
    getFeed: jest.fn(),
    addSource: jest.fn(),
    updateSource: jest.fn(),
    removeSource: jest.fn(),
  };
  const controller = new VeilleController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('passe l’identité du visiteur au service, pour qu’il décide de lastError', async () => {
    await controller.getFeed('nota', 'u-1');
    expect(service.getFeed).toHaveBeenCalledWith('nota', 'u-1');
  });

  it('accepte un visiteur anonyme', async () => {
    await controller.getFeed('nota', undefined);
    expect(service.getFeed).toHaveBeenCalledWith('nota', undefined);
  });

  it('ajoute toujours pour le compte connecté, jamais pour un autre', async () => {
    await controller.addSource('u-1', { url: 'https://a.test/' });
    expect(service.addSource).toHaveBeenCalledWith('u-1', 'https://a.test/');
  });

  it('retire toujours pour le compte connecté', async () => {
    await controller.removeSource('u-1', 'src-1');
    expect(service.removeSource).toHaveBeenCalledWith('u-1', 'src-1');
  });
});
