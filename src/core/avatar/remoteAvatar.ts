import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { FaceRig, PoseRig, PeerMessageV1 } from '../../types';
import { loadVRMFromUrl, disposeVRM } from './loadVRM';
import { applyRig } from './applyRig';
import { computePoseBoneRotations, applyBoneRotations, applyHipPosition } from './applyPose';
import { createRigFilterSet, type RigFilterSet } from '../filters/rigFilterSet';
import { createPoseFilterSet, type PoseFilterSet } from '../filters/poseFilterSet';

/** 1 ピアぶんのリモートアバター状態 */
export type RemoteAvatar = {
  peerId: string;
  vrm: VRM;
  lastFace: FaceRig | null;
  lastPose: PoseRig | null;
  lastHipPos: { x: number; y: number } | null;
  lastMicLevel: number;
  faceFilters: RigFilterSet;
  poseFilters: PoseFilterSet;
  slot: number;            // 配置スロット (1 始まり)。切断で空いた番号は再利用する
  rootGroup: THREE.Group;  // 位置オフセット用
};

/**
 * 使用中スロットを避けて最小の空きスロット (1 始まり) を返す。
 * ピア数ベースの採番だと切断→新規接続で既存ピアと同座標に重なるため、スロットで管理する。
 */
export function nextFreeSlot(used: Iterable<number>): number {
  const set = new Set(used);
  let slot = 1;
  while (set.has(slot)) slot++;
  return slot;
}

/** スロット番号 → X 座標。自分 (x=0) の左右に 1.5m ずつ交互に並べる (1→+1.5, 2→-1.5, 3→+3.0, …)。 */
export function slotToX(slot: number): number {
  const side = slot % 2 === 1 ? 1 : -1;
  return side * Math.ceil(slot / 2) * 1.5;
}

/**
 * リモートアバター群を管理するシーン。
 * 各ピアを自分のアバター左右に並べて表示 (X 軸に 1.5m ずつオフセット)。
 */
export class RemoteAvatarScene {
  private avatars = new Map<string, RemoteAvatar>();
  /** VRM ロード中のピア。await をまたぐ二重ロード防止と切断キャンセル判定に使う。 */
  private loading = new Set<string>();
  private vrmUrl: string;

  constructor(private scene: THREE.Scene, vrmUrl: string) {
    this.vrmUrl = vrmUrl;
  }

  setVrmUrl(url: string): void { this.vrmUrl = url; }

  async addPeer(peerId: string): Promise<void> {
    // 登録済み or ロード中なら二重ロードしない (同一ピアの二重接続でも孤児 group を作らない)。
    if (this.avatars.has(peerId) || this.loading.has(peerId)) return;
    this.loading.add(peerId);
    try {
      const { vrm } = await loadVRMFromUrl(this.vrmUrl);
      const group = new THREE.Group();
      group.add(vrm.scene);
      // await 中に removePeer された、または競合ロードが先に登録済みなら破棄する。
      // これを怠ると切断済みピアのゴーストアバターがシーンに残り続け dispose 不能になる。
      if (!this.loading.has(peerId) || this.avatars.has(peerId)) {
        disposeVRM(group, vrm);
        return;
      }
      const slot = nextFreeSlot([...this.avatars.values()].map((a) => a.slot));
      group.position.set(slotToX(slot), 0, 0);
      this.scene.add(group);
      this.avatars.set(peerId, {
        peerId, vrm,
        lastFace: null, lastPose: null, lastHipPos: null, lastMicLevel: 0,
        faceFilters: createRigFilterSet(),
        poseFilters: createPoseFilterSet(),
        slot,
        rootGroup: group,
      });
    } catch (e) {
      console.error(`[remoteAvatar] load failed for ${peerId}:`, e);
    } finally {
      this.loading.delete(peerId);
    }
  }

  removePeer(peerId: string): void {
    // ロード中の場合はここでキャンセルを通知 (addPeer の await 後チェックが破棄する)。
    this.loading.delete(peerId);
    const a = this.avatars.get(peerId);
    if (!a) return;
    this.scene.remove(a.rootGroup);
    disposeVRM(a.rootGroup, a.vrm);
    this.avatars.delete(peerId);
  }

  receive(peerId: string, msg: PeerMessageV1): void {
    const a = this.avatars.get(peerId);
    if (!a) return;
    if (msg.face !== undefined) a.lastFace = msg.face;
    if (msg.pose !== undefined) a.lastPose = msg.pose;
    if (msg.hipPos !== undefined) a.lastHipPos = msg.hipPos;
    if (msg.micLevel !== undefined) a.lastMicLevel = msg.micLevel;
  }

  /**
   * 各リモートアバターに最新の rig を反映する。毎フレーム呼ぶ。
   * リモートはカメラ反対側を向いているわけではないので mirror=false 扱い。
   */
  tick(now: number, dt: number): void {
    for (const a of this.avatars.values()) {
      applyRig(
        a.vrm,
        a.lastFace,
        { mic: true, gaze: true, smooth: true, pose: true, micLevel: a.lastMicLevel },
        a.faceFilters,
        now,
      );
      if (a.lastPose) {
        const rotations = computePoseBoneRotations(
          a.lastPose,
          { smooth: true, mirror: false, legStrength: 1.0 },
          a.poseFilters,
          now,
        );
        applyBoneRotations(a.vrm, rotations, true);
      }
      applyHipPosition(a.vrm, a.lastHipPos, true);
      a.vrm.update(dt);
    }
  }

  peers(): string[] { return [...this.avatars.keys()]; }
}
