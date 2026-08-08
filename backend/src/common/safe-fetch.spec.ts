import { isBlockedAddress } from './safe-fetch';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '127.9.9.9', '10.0.0.1', '10.255.255.254',
    '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.255.255',
    '193.51.196.1', '2001:4860:4860::8888', '::ffff:8.8.8.8',
  ])('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

import { safeFetch, BLOCKED_ADDRESS_MESSAGE } from './safe-fetch';
import { BadRequestException } from '@nestjs/common';

describe('safeFetch', () => {
  it('refuses http', async () => {
    await expect(safeFetch('http://example.org/feed.xml', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BadRequestException);
  });

  it('refuses a literal private address', async () => {
    await expect(safeFetch('https://169.254.169.254/latest/meta-data/', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BLOCKED_ADDRESS_MESSAGE);
  });

  it('refuses a malformed URL', async () => {
    await expect(safeFetch('not a url', { maxBytes: 1000, timeoutMs: 100 }))
      .rejects.toThrow(BadRequestException);
  });
});
