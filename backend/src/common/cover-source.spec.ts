import { BadRequestException, HttpException } from '@nestjs/common';
import { MockAgent } from 'undici';
import { fetchCover } from './cover-source';
import { COVER_MAX_BYTES } from './mime.constants';
import { BLOCKED_ADDRESS_MESSAGE, useDispatcherForTests } from './safe-fetch';

/**
 * The `.mixcloud.com` allow-list this file used to enforce is gone by design:
 * a cover can now come from any feed. Every test asserting that host rule went
 * with it. What is left is the part still owned here — the MIME allow-list —
 * plus proof that the network guards `safeFetch` brought in exchange are
 * actually reached through this entry point.
 *
 * `MockAgent` stands in for a server: nothing here opens a socket or resolves
 * a name.
 */

const ORIGIN = 'https://covers.test';
const COVER_URL = `${ORIGIN}/cover.jpg`;

describe('fetchCover', () => {
  let mockAgent: MockAgent;
  let restore: () => void;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    restore = useDispatcherForTests(mockAgent);
  });

  afterEach(async () => {
    restore();
    await mockAgent.close();
  });

  function replyWith(
    body: Buffer | string,
    headers: Record<string, string> = { 'content-type': 'image/jpeg' },
    status = 200,
  ) {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/cover.jpg', method: 'GET' })
      .reply(status, body, { headers });
  }

  describe('the host allow-list is gone', () => {
    it('accepts a cover on a host that has nothing to do with Mixcloud', async () => {
      replyWith(Buffer.from('jpegbytes'));

      const cover = await fetchCover(COVER_URL);

      expect(cover.buffer.toString()).toBe('jpegbytes');
      expect(cover.contentType).toBe('image/jpeg');
      expect(cover.extension).toBe('.jpg');
    });

    it('still accepts a Mixcloud cover, which is what the old rule protected', async () => {
      const mixcloudOrigin = 'https://thumbnailer.mixcloud.com';
      mockAgent
        .get(mixcloudOrigin)
        .intercept({ path: '/unsafe/1024x1024/extaudio/7/5/6/a', method: 'GET' })
        .reply(200, Buffer.from('jpegbytes'), {
          headers: { 'content-type': 'image/jpeg' },
        });

      await expect(
        fetchCover(`${mixcloudOrigin}/unsafe/1024x1024/extaudio/7/5/6/a`),
      ).resolves.toMatchObject({ contentType: 'image/jpeg' });
    });
  });

  describe('the network guards are reached through this entry point', () => {
    it('refuses an image on a private address', async () => {
      await expect(fetchCover('https://192.168.1.1/cover.jpg')).rejects.toThrow(
        BLOCKED_ADDRESS_MESSAGE,
      );
    });

    it('refuses an image on the cloud metadata address', async () => {
      await expect(
        fetchCover('https://169.254.169.254/cover.jpg'),
      ).rejects.toThrow(BLOCKED_ADDRESS_MESSAGE);
    });

    it('refuses an http cover', async () => {
      await expect(fetchCover('http://covers.test/cover.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses a string that is not a URL', async () => {
      await expect(fetchCover('covers.test/cover.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('the content type check, which stays local', () => {
    it.each([
      ['text/html', 'a page instead of an image'],
      ['image/gif', 'an image type not on the allow-list'],
      ['application/octet-stream', 'an untyped blob'],
      ['', 'no content type at all'],
    ])('rejects %s (%s)', async (contentType) => {
      replyWith(
        Buffer.from('whatever'),
        contentType ? { 'content-type': contentType } : {},
      );

      await expect(fetchCover(COVER_URL)).rejects.toThrow(BadRequestException);
    });

    it.each([
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
    ])('accepts %s and maps it to %s', async (contentType, extension) => {
      replyWith(Buffer.from('bytes'), { 'content-type': contentType });

      await expect(fetchCover(COVER_URL)).resolves.toMatchObject({
        contentType,
        extension,
      });
    });

    it('ignores the parameters a server appends to the type', async () => {
      replyWith(Buffer.from('bytes'), { 'content-type': 'image/JPEG; charset=binary' });

      await expect(fetchCover(COVER_URL)).resolves.toMatchObject({
        contentType: 'image/jpeg',
      });
    });
  });

  describe('the size cap', () => {
    it('rejects a body declared larger than the cover limit', async () => {
      replyWith(Buffer.from('small'), {
        'content-type': 'image/jpeg',
        'content-length': String(COVER_MAX_BYTES + 1),
      });

      await expect(fetchCover(COVER_URL)).rejects.toThrow(HttpException);
    });

    it('rejects a body that exceeds the limit while streaming, with no length declared', async () => {
      replyWith(Buffer.alloc(COVER_MAX_BYTES + 1, 0x61), {
        'content-type': 'image/jpeg',
      });

      await expect(fetchCover(COVER_URL)).rejects.toThrow(HttpException);
    });

    it('accepts a body at the limit', async () => {
      replyWith(Buffer.alloc(COVER_MAX_BYTES, 0x61), {
        'content-type': 'image/jpeg',
      });

      await expect(fetchCover(COVER_URL)).resolves.toMatchObject({
        contentType: 'image/jpeg',
      });
    });
  });

  describe('upstream failures', () => {
    it('turns a non-ok status into an HttpException, not a raw error', async () => {
      replyWith('nope', { 'content-type': 'text/plain' }, 500);

      await expect(fetchCover(COVER_URL)).rejects.toThrow(HttpException);
    });

    it('follows a redirect, which the old Mixcloud fetch refused outright', async () => {
      // Podcast and archive hosts redirect constantly; `redirect: 'error'` was
      // right for one CDN and would break every other source.
      mockAgent
        .get(ORIGIN)
        .intercept({ path: '/cover.jpg', method: 'GET' })
        .reply(302, '', { headers: { location: `${ORIGIN}/real.jpg` } });
      mockAgent
        .get(ORIGIN)
        .intercept({ path: '/real.jpg', method: 'GET' })
        .reply(200, Buffer.from('jpegbytes'), {
          headers: { 'content-type': 'image/jpeg' },
        });

      await expect(fetchCover(COVER_URL)).resolves.toMatchObject({
        contentType: 'image/jpeg',
      });
    });

    it('refuses a redirect that lands on a private address', async () => {
      mockAgent
        .get(ORIGIN)
        .intercept({ path: '/cover.jpg', method: 'GET' })
        .reply(302, '', { headers: { location: 'https://10.0.0.1/cover.jpg' } });

      await expect(fetchCover(COVER_URL)).rejects.toThrow(BLOCKED_ADDRESS_MESSAGE);
    });
  });
});
