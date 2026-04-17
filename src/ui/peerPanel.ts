export type PeerPanelElements = {
  panel: HTMLElement;
  ownIdInput: HTMLInputElement;
  copyBtn: HTMLButtonElement;
  peerIdInput: HTMLInputElement;
  connectBtn: HTMLButtonElement;
  peersList: HTMLElement;
};

export type PeerPanelHandlers = {
  onConnect: (peerId: string) => void;
  onDisconnect: (peerId: string) => void;
};

export function wirePeerPanel(els: PeerPanelElements, handlers: PeerPanelHandlers) {
  const peers = new Set<string>();

  const renderPeers = () => {
    els.peersList.innerHTML = '';
    if (peers.size === 0) {
      els.peersList.innerHTML = '<em style="opacity:0.6;font-size:11px">接続中のピアなし</em>';
      return;
    }
    for (const id of peers) {
      const row = document.createElement('div');
      row.className = 'peer-row';
      const short = id.slice(0, 8) + '…';
      row.innerHTML = `<span title="${id}">${short}</span>`;
      const btn = document.createElement('button');
      btn.textContent = '×';
      btn.title = '切断';
      btn.addEventListener('click', () => handlers.onDisconnect(id));
      row.appendChild(btn);
      els.peersList.appendChild(row);
    }
  };
  renderPeers();

  els.copyBtn.addEventListener('click', async () => {
    const text = els.ownIdInput.value;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); els.copyBtn.textContent = '✅'; }
    catch { els.copyBtn.textContent = '失敗'; }
    setTimeout(() => { els.copyBtn.textContent = '📋'; }, 1200);
  });

  els.connectBtn.addEventListener('click', () => {
    const id = els.peerIdInput.value.trim();
    if (!id) return;
    handlers.onConnect(id);
    els.peerIdInput.value = '';
  });
  els.peerIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.connectBtn.click();
  });

  return {
    setOwnId: (id: string) => { els.ownIdInput.value = id; },
    addPeer: (id: string) => { peers.add(id); renderPeers(); },
    removePeer: (id: string) => { peers.delete(id); renderPeers(); },
  };
}
