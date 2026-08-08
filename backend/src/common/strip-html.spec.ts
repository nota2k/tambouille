import { stripHtml } from './strip-html';

describe('stripHtml', () => {
  it('turns a description written in HTML into plain text', () => {
    expect(stripHtml('<p class="justify">Bonjour <b>toi</b></p>')).toBe(
      'Bonjour toi',
    );
  });

  it('decodes the entities a feed escapes', () => {
    expect(stripHtml('Rock &amp; roll &lt;3 &quot;live&quot; &#39;96')).toBe(
      `Rock & roll <3 "live" '96`,
    );
  });

  it('decodes hexadecimal character references', () => {
    expect(stripHtml('caf&#xE9;')).toBe('café');
  });

  it('leaves an unknown entity alone rather than mangling it', () => {
    expect(stripHtml('a &unknownthing; b')).toBe('a &unknownthing; b');
  });

  it('keeps the line breaks that block tags stood for', () => {
    // Archive.org writes its description as a run of <div> lines; dropping the
    // tags without replacing them would run every line into one paragraph.
    expect(stripHtml('<div>Shakedown Street</div><div>Esters At Oneida</div>')).toBe(
      'Shakedown Street\nEsters At Oneida',
    );
  });

  it('turns <br> into a line break', () => {
    expect(stripHtml('un<br/>deux<br>trois')).toBe('un\ndeux\ntrois');
  });

  it('collapses the whitespace left behind by block tags', () => {
    expect(stripHtml('<p>un</p>\n\n\n<p>deux</p>')).toBe('un\n\ndeux');
  });

  it('drops script and style content entirely', () => {
    expect(stripHtml('a<script>alert(1)</script>b')).toBe('ab');
    expect(stripHtml('a<style>p{color:red}</style>b')).toBe('ab');
  });

  it('passes plain text through untouched', () => {
    expect(stripHtml('déjà entendu')).toBe('déjà entendu');
  });

  it('returns an empty string for markup with no text', () => {
    expect(stripHtml('<p>\n<!-- rien -->\n</p>')).toBe('');
  });
});
