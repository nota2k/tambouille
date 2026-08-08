import { r2KeysOnly } from './r2-keys';

describe('r2KeysOnly', () => {
  it('keeps ordinary object keys', () => {
    expect(r2KeysOnly(['covers/a.jpg', 'audio/b.mp3'])).toEqual([
      'covers/a.jpg',
      'audio/b.mp3',
    ]);
  });

  it('drops null and undefined, which is how an absent cover arrives', () => {
    expect(r2KeysOnly(['covers/a.jpg', null, undefined])).toEqual(['covers/a.jpg']);
  });

  it('drops empty and whitespace-only entries', () => {
    expect(r2KeysOnly(['', '   ', 'covers/a.jpg'])).toEqual(['covers/a.jpg']);
  });

  it('drops pre-migration disk paths', () => {
    // R2 reports a key it never held as deleted, with no error, so a disk path
    // handed to it would be confirmed as removed forever. The only defence is
    // not asking.
    expect(r2KeysOnly(['/uploads/covers/a.jpg', 'covers/b.jpg'])).toEqual([
      'covers/b.jpg',
    ]);
  });

  it('drops any absolute path, not just the /uploads/ prefix', () => {
    expect(r2KeysOnly(['/covers/a.jpg'])).toEqual([]);
  });

  it('drops a full URL, which is a remote source and not ours to delete', () => {
    expect(
      r2KeysOnly(['https://archive.org/download/x/y.mp3', 'covers/a.jpg']),
    ).toEqual(['covers/a.jpg']);
  });

  it('removes duplicates so one object is not named twice in a batch', () => {
    expect(r2KeysOnly(['covers/a.jpg', 'covers/a.jpg'])).toEqual(['covers/a.jpg']);
  });

  it('returns an empty array for an empty input', () => {
    expect(r2KeysOnly([])).toEqual([]);
  });

  it('returns an empty array when every entry is filtered out', () => {
    expect(r2KeysOnly([null, '/uploads/x.jpg', ''])).toEqual([]);
  });
});
