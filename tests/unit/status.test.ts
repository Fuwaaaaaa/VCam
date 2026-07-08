import { describe, it, expect } from 'vitest';
import { createStatus, escapeHtml } from '../../src/ui/status';

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<b a="x" b='y'>&</b>`)).toBe(
      '&lt;b a=&quot;x&quot; b=&#39;y&#39;&gt;&amp;&lt;/b&gt;',
    );
  });

  it('escapes & first so entities are not double-decoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('passes through plain text (JP included) unchanged', () => {
    expect(escapeHtml('VRM 読込完了: アリシア')).toBe('VRM 読込完了: アリシア');
    expect(escapeHtml('')).toBe('');
  });

  it('neutralizes a script payload in a VRM meta title / file name', () => {
    const payload = '<img src=x onerror=alert(1)>.vrm';
    expect(escapeHtml(payload)).not.toContain('<img');
    expect(escapeHtml(payload)).toBe('&lt;img src=x onerror=alert(1)&gt;.vrm');
  });
});

describe('createStatus', () => {
  it('set() replaces content, append() adds after it', () => {
    const el = document.createElement('div');
    const status = createStatus(el);
    status.set('a');
    status.append('<br />b');
    // DOM は void 要素を正規化するため <br /> は <br> として読み戻される
    expect(el.innerHTML).toBe('a<br>b');
    status.set('c');
    expect(el.innerHTML).toBe('c');
  });

  it('escaped external input renders as text, not as elements', () => {
    const el = document.createElement('div');
    const status = createStatus(el);
    status.set(`VRM 読込完了: <b>${escapeHtml('<script>bad()</script>')}</b>`);
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('b')?.textContent).toBe('<script>bad()</script>');
  });
});
