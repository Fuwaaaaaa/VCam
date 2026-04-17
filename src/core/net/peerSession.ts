import Peer, { type DataConnection } from 'peerjs';
import type { PeerMessageV1 } from '../../types';
import { isPeerMessageV1 } from './rigSerialize';

export type PeerSessionCallbacks = {
  onOwnId: (id: string) => void;
  onPeerConnect: (peerId: string) => void;
  onPeerDisconnect: (peerId: string) => void;
  onPeerMessage: (peerId: string, msg: PeerMessageV1) => void;
  onError: (err: unknown) => void;
};

export type PeerSession = {
  ownId: () => string | null;
  connectTo: (peerId: string) => void;
  disconnectFrom: (peerId: string) => void;
  send: (msg: PeerMessageV1) => void;
  close: () => void;
  connectedPeers: () => string[];
};

/**
 * PeerJS ベースのごく簡易なマルチバース実装。
 *
 * - PeerServer は PeerJS クラウド (0.peerjs.com) を使用 (署名不要、レート制限あり)
 * - 自分の ID を共有 → 相手が connectTo で接続 → 双方向データチャネル
 * - 送信は 1 本のメッセージを全接続にブロードキャスト
 *
 * 制約:
 *  - NAT 越えは STUN (PeerJS が内部で Google STUN 使用)
 *  - 企業 NW は TURN が無いと繋がらない可能性
 *  - 大規模 (5+ peers) は送信が N^2 で重くなる
 */
export function createPeerSession(callbacks: PeerSessionCallbacks): PeerSession {
  const peer = new Peer(); // ランダムID
  const connections = new Map<string, DataConnection>();

  peer.on('open', (id) => callbacks.onOwnId(id));
  peer.on('error', (err) => callbacks.onError(err));

  const wireConn = (conn: DataConnection) => {
    connections.set(conn.peer, conn);
    conn.on('open', () => callbacks.onPeerConnect(conn.peer));
    conn.on('data', (data) => {
      if (isPeerMessageV1(data)) callbacks.onPeerMessage(conn.peer, data);
    });
    conn.on('close', () => {
      connections.delete(conn.peer);
      callbacks.onPeerDisconnect(conn.peer);
    });
    conn.on('error', (err) => callbacks.onError(err));
  };

  // 着信
  peer.on('connection', (conn) => wireConn(conn));

  return {
    ownId: () => peer.id ?? null,
    connectTo: (peerId) => {
      if (!peerId || peerId === peer.id || connections.has(peerId)) return;
      const conn = peer.connect(peerId, { reliable: false });
      if (conn) wireConn(conn);
    },
    disconnectFrom: (peerId) => {
      const c = connections.get(peerId);
      if (c) c.close();
    },
    send: (msg) => {
      for (const c of connections.values()) {
        if (c.open) {
          try { c.send(msg); } catch (e) { callbacks.onError(e); }
        }
      }
    },
    close: () => {
      for (const c of connections.values()) { try { c.close(); } catch { /* ignore */ } }
      connections.clear();
      peer.destroy();
    },
    connectedPeers: () => [...connections.keys()],
  };
}
