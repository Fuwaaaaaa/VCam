import { describe, it, expect } from 'vitest';
import { wirePeerPanel } from '../../src/ui/peerPanel';

function makeEls() {
  const mk = <T extends HTMLElement>(t: string) => document.createElement(t) as T;
  return {
    panel:       mk('div'),
    ownIdInput:  mk<HTMLInputElement>('input'),
    copyBtn:     mk<HTMLButtonElement>('button'),
    peerIdInput: mk<HTMLInputElement>('input'),
    connectBtn:  mk<HTMLButtonElement>('button'),
    peersList:   mk('div'),
  };
}

const noop = { onConnect: () => {}, onDisconnect: () => {} };

describe('wirePeerPanel の XSS 対策', () => {
  it('悪意あるピア ID を HTML でなくテキストとして描画する', () => {
    const els = makeEls();
    const ui = wirePeerPanel(els, noop);
    const evil = '"><img src=x onerror=alert(1)>';
    ui.addPeer(evil);

    // ペイロードが要素として解釈されていないこと
    expect(els.peersList.querySelector('img')).toBeNull();
    const span = els.peersList.querySelector('span');
    // 完全な ID は title 属性にテキストとして保持され、本文は先頭 8 文字 + 省略記号
    expect(span?.getAttribute('title')).toBe(evil);
    expect(span?.textContent).toBe(evil.slice(0, 8) + '…');
  });

  it('addPeer / removePeer で行が増減する', () => {
    const els = makeEls();
    const ui = wirePeerPanel(els, noop);
    ui.addPeer('abcdefgh12345');
    expect(els.peersList.querySelector('.peer-row')).not.toBeNull();
    ui.removePeer('abcdefgh12345');
    expect(els.peersList.querySelector('.peer-row')).toBeNull();
    // 空表示に戻る
    expect(els.peersList.textContent).toContain('接続中のピアなし');
  });
});
