import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// loadVRM を差し替えてロード完了タイミングを制御し、addPeer/removePeer の交錯を再現する。
vi.mock('../../src/core/avatar/loadVRM', () => ({
  loadVRMFromUrl: vi.fn(),
  disposeVRM: vi.fn(),
}));

import { RemoteAvatarScene } from '../../src/core/avatar/remoteAvatar';
import { loadVRMFromUrl, disposeVRM } from '../../src/core/avatar/loadVRM';

const mockedLoad = vi.mocked(loadVRMFromUrl);
const mockedDispose = vi.mocked(disposeVRM);

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// addPeer が使うのは vrm.scene のみ (group.add 用)。ダミーの Group で足りる。
const loadResult = () => ({ vrm: { scene: new THREE.Group() } as never, displayName: 'x', versionLabel: '0' });

// シーン直下に追加された Group 数 = 生存アバター数
const groupCount = (scene: THREE.Scene) => scene.children.filter((o) => o instanceof THREE.Group).length;

beforeEach(() => { vi.clearAllMocks(); });

describe('RemoteAvatarScene ライフサイクルのレース', () => {
  it('H2: ロード中に切断されるとゴーストアバターを残さず破棄する', async () => {
    const scene = new THREE.Scene();
    const rs = new RemoteAvatarScene(scene, '/x.vrm');
    const d = deferred<ReturnType<typeof loadResult>>();
    mockedLoad.mockReturnValueOnce(d.promise);

    const p = rs.addPeer('A');   // ロード開始
    rs.removePeer('A');          // 完了前に切断
    d.resolve(loadResult());     // 遅れてロード完了
    await p;

    expect(rs.peers()).toEqual([]);          // map に登録されない
    expect(groupCount(scene)).toBe(0);       // シーンにゴーストが残らない
    expect(mockedDispose).toHaveBeenCalledTimes(1); // ロード済み VRM は破棄される
  });

  it('H3: 同一ピアの二重接続でも二重ロードせずアバターは 1 体のみ', async () => {
    const scene = new THREE.Scene();
    const rs = new RemoteAvatarScene(scene, '/x.vrm');
    const d = deferred<ReturnType<typeof loadResult>>();
    mockedLoad.mockReturnValueOnce(d.promise);

    const p1 = rs.addPeer('A');
    const p2 = rs.addPeer('A');  // ロード中ガードで即 return
    d.resolve(loadResult());
    await Promise.all([p1, p2]);

    expect(rs.peers()).toEqual(['A']);
    expect(groupCount(scene)).toBe(1);
    expect(mockedLoad).toHaveBeenCalledTimes(1); // 2 回目はロードしていない
  });

  it('通常の追加→削除でシーンと map が綺麗に片付く', async () => {
    const scene = new THREE.Scene();
    const rs = new RemoteAvatarScene(scene, '/x.vrm');
    mockedLoad.mockResolvedValueOnce(loadResult());

    await rs.addPeer('A');
    expect(rs.peers()).toEqual(['A']);
    expect(groupCount(scene)).toBe(1);

    rs.removePeer('A');
    expect(rs.peers()).toEqual([]);
    expect(groupCount(scene)).toBe(0);
    expect(mockedDispose).toHaveBeenCalledTimes(1);
  });

  it('ロード失敗しても loading フラグが残らず再接続できる', async () => {
    const scene = new THREE.Scene();
    const rs = new RemoteAvatarScene(scene, '/x.vrm');
    mockedLoad.mockRejectedValueOnce(new Error('boom'));

    await rs.addPeer('A');
    expect(rs.peers()).toEqual([]);

    mockedLoad.mockResolvedValueOnce(loadResult()); // リトライは成功
    await rs.addPeer('A');
    expect(rs.peers()).toEqual(['A']);
  });
});
