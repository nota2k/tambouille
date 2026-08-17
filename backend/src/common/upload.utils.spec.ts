/**
 * `upload.utils` reads four R2_* variables and builds an S3 client the moment
 * it is imported. Both are neutralised here: the variables are set to
 * throwaway values, and the SDK is mocked, so nothing reaches the network and
 * no credentials are needed.
 */
process.env.R2_ACCOUNT_ID = 'test-account';
process.env.R2_ACCESS_KEY_ID = 'test-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';

const send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  DeleteObjectsCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

// `require`, not `import`: jest hoists `import` above the assignments above,
// and `upload.utils` reads those variables in its module body. The project is
// on typescript-eslint v8, where the rule is `no-require-imports`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteFromR2 } =
  require('./upload.utils') as typeof import('./upload.utils');

describe('deleteFromR2', () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ Deleted: [], Errors: [] });
  });

  it('sends both keys in a single batched request', async () => {
    await deleteFromR2(['audio/a.mp3', 'covers/b.jpg']);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-bucket',
      Delete: { Objects: [{ Key: 'audio/a.mp3' }, { Key: 'covers/b.jpg' }] },
    });
  });

  it('sends nothing at all when no key survives filtering', async () => {
    await deleteFromR2([null, undefined, '/uploads/covers/old.jpg']);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing for a mix whose audio lives at its source', async () => {
    await deleteFromR2([null, null]);
    expect(send).not.toHaveBeenCalled();
  });

  it('resolves when R2 rejects the request', async () => {
    send.mockRejectedValue(new Error('network down'));
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });

  it('resolves when R2 reports per-key errors', async () => {
    send.mockResolvedValue({
      Deleted: [],
      Errors: [{ Key: 'covers/b.jpg', Code: 'AccessDenied' }],
    });
    await expect(deleteFromR2(['covers/b.jpg'])).resolves.toBeUndefined();
  });
});
