import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { assertMixcloudCoverUrl, fetchMixcloudCover } from './cover-source';
import { COVER_MAX_BYTES } from '../common/mime.constants';

/**
 * `fetch` is mocked throughout, and given a *valid* image response by default:
 * a URL the guard should have rejected must fail the "rejects" assertion
 * because the guard is gone, not because an unmocked call threw.
 */

const originalFetch = global.fetch;

const VALID_COVER_URL = 'https://thumbnailer.mixcloud.com/unsafe/1024x1024/extaudio/7/5/6/a/f344-f64f';

function imageResponse(body: Buffer, contentType = 'image/jpeg', extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': contentType, ...extraHeaders },
  });
}

describe('the Mixcloud cover guard', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(imageResponse(Buffer.from('jpegbytes')));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('rejected URLs', () => {
    it.each([
      ['a string that is not a URL', 'thumbnailer.mixcloud.com/x'],
      ['an empty string', ''],
      ['plain http', 'http://thumbnailer.mixcloud.com/x'],
      ['a file URL', 'file:///etc/passwd'],
      ['a data URL', 'data:image/png;base64,iVBORw0KGgo='],
      // The trap: a substring test on the whole URL would let each of these
      // through, because ".mixcloud.com" appears somewhere in the text.
      ['the host suffix hidden in a query string', 'https://evil.com/?x=.mixcloud.com'],
      ['the host suffix hidden in a fragment', 'https://evil.com/#.mixcloud.com'],
      ['the host suffix hidden in the path', 'https://evil.com/.mixcloud.com/cover.jpg'],
      ['the host suffix hidden in userinfo', 'https://.mixcloud.com@evil.com/cover.jpg'],
      // A suffix test without the leading dot would let this through.
      ['a lookalike registered domain', 'https://evilmixcloud.com/cover.jpg'],
      ['the real host used as a prefix', 'https://thumbnailer.mixcloud.com.evil.com/cover.jpg'],
      ['a subdomain of an attacker domain', 'https://mixcloud.com.evil.com/cover.jpg'],
      // The reason the guard exists at all.
      ['the cloud metadata endpoint', 'https://169.254.169.254/latest/meta-data/'],
      ['a local database port', 'https://localhost:5432/'],
      ['a private address', 'https://10.0.0.1/'],
    ])('rejects %s without making a request', async (_label, url) => {
      await expect(fetchMixcloudCover(url)).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects the bare apex domain, which is not a CDN host', () => {
      expect(() => assertMixcloudCoverUrl('https://mixcloud.com/cover.jpg')).toThrow(BadRequestException);
    });
  });

  describe('accepted URLs', () => {
    it('accepts a thumbnailer URL and returns the bytes', async () => {
      await expect(fetchMixcloudCover(VALID_COVER_URL)).resolves.toEqual({
        buffer: Buffer.from('jpegbytes'),
        contentType: 'image/jpeg',
        extension: '.jpg',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('accepts a host whose case differs', () => {
      expect(assertMixcloudCoverUrl('https://THUMBNAILER.MIXCLOUD.COM/x').hostname).toBe('thumbnailer.mixcloud.com');
    });

    it('refuses to follow redirects and sends an abort signal', async () => {
      await fetchMixcloudCover(VALID_COVER_URL);
      const options = fetchMock.mock.calls[0][1];
      expect(options.redirect).toBe('error');
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('the content type check', () => {
    it.each([
      ['image/jpeg', '.jpg'],
      ['image/png', '.png'],
      ['image/webp', '.webp'],
      ['image/jpeg; charset=binary', '.jpg'],
    ])('accepts %s', async (contentType, extension) => {
      fetchMock.mockResolvedValue(imageResponse(Buffer.from('bytes'), contentType));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).resolves.toMatchObject({ extension });
    });

    it.each([['text/html'], ['application/json'], ['image/svg+xml'], ['application/octet-stream'], ['']])(
      'rejects %s',
      async (contentType) => {
        fetchMock.mockResolvedValue(imageResponse(Buffer.from('bytes'), contentType));
        await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadRequestException);
      },
    );
  });

  describe('the size cap', () => {
    it('rejects a body declared larger than the cover limit', async () => {
      fetchMock.mockResolvedValue(
        imageResponse(Buffer.from('small'), 'image/jpeg', { 'content-length': String(COVER_MAX_BYTES + 1) }),
      );
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a body that exceeds the cover limit while streaming, with no length declared', async () => {
      fetchMock.mockResolvedValue(imageResponse(Buffer.alloc(COVER_MAX_BYTES + 1024, 0x41)));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a body at the limit', async () => {
      fetchMock.mockResolvedValue(imageResponse(Buffer.alloc(COVER_MAX_BYTES, 0x41)));
      const cover = await fetchMixcloudCover(VALID_COVER_URL);
      expect(cover.buffer.byteLength).toBe(COVER_MAX_BYTES);
    });
  });

  describe('upstream failures', () => {
    it('turns a non-ok status into a 502', async () => {
      fetchMock.mockResolvedValue(new Response('', { status: 500 }));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('turns a transport failure into a 502', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNRESET'));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('turns a timeout into a 502', async () => {
      fetchMock.mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('turns a refused redirect into a 502', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed: unexpected redirect'));
      await expect(fetchMixcloudCover(VALID_COVER_URL)).rejects.toBeInstanceOf(BadGatewayException);
    });
  });
});
