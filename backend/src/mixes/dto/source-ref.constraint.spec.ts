import { SourceRefConstraint } from './source-ref.constraint';

const check = (sourceType: string | undefined, sourceRef: string) =>
  new SourceRefConstraint().validate(sourceRef, {
    object: { sourceType },
  } as never);

describe('SourceRefConstraint', () => {
  it('accepts a valid cloudcast key when the type is mixcloud', () => {
    expect(check('mixcloud', '/Notamusic/antimythes/')).toBe(true);
  });
  it('refuses a URL when the type is mixcloud', () => {
    expect(check('mixcloud', 'https://example.org/a.mp3')).toBe(false);
  });
  it('accepts an https URL when the type is remote', () => {
    expect(check('remote', 'https://archive.org/download/x/y.mp3')).toBe(true);
  });
  it.each([
    'http://archive.org/download/x/y.mp3',
    'https://192.168.1.1/y.mp3',
    'https://[::1]/y.mp3',
    'not a url',
  ])('refuses %s when the type is remote', (value) => {
    expect(check('remote', value)).toBe(false);
  });
  it('refuses anything when the type is missing', () => {
    expect(check(undefined, 'https://archive.org/download/x/y.mp3')).toBe(
      false,
    );
  });
  it('accepts an https SoundCloud URL when the type is soundcloud', () => {
    expect(check('soundcloud', 'https://soundcloud.com/forss/flickermood')).toBe(
      true,
    );
  });
  it('refuses a javascript: URL when the type is soundcloud', () => {
    expect(check('soundcloud', 'javascript:alert(1)')).toBe(false);
  });
  it('refuses a plain http URL when the type is soundcloud', () => {
    expect(check('soundcloud', 'http://soundcloud.com/forss/flickermood')).toBe(
      false,
    );
  });
  it('refuses a lookalike domain when the type is soundcloud', () => {
    expect(check('soundcloud', 'https://evilsoundcloud.com/forss/x')).toBe(
      false,
    );
  });
});
