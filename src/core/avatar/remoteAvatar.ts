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
  rootGroup: THREE.Group;  // 位置オフセット用
};

/**
 * リモートアバター群を管理するシーン。
 * 各ピアを自分のアバター左右に並べて表示 (X 軸に 1.5m ずつオフセット)。
 */
export class RemoteAvatarScene {
  private avatars = new Map<string, RemoteAvatar>();
  private vrmUrl: string;

  constructor(private scene: THREE.Scene, vrmUrl: string) {
    this.vrmUrl = vrmUrl;
  }

  setVrmUrl(url: string): void { this.vrmUrl = url; }

  async addPeer(peerId: string): Promise<void> {
    if (this.avatars.has(peerId)) return;
    try {
      const { vrm } = await loadVRMFromUrl(this.vrmUrl);
      const group = new THREE.Group();
      group.add(vrm.scene);
      // 新規ピアを既存数 +1 の位置にオフセット配置 (L/R 交互)
      const idx = this.avatars.size + 1;
      const side = idx % 2 === 1 ? 1 : -1;
      const x = side * Math.ceil(idx / 2) * 1.5;
      group.position.set(x, 0, 0);
      this.scene.add(group);
      this.avatars.set(peerId, {
        peerId, vrm,
        lastFace: null, lastPose: null, lastHipPos: null, lastMicLevel: 0,
        faceFilters: createRigFilterSet(),
        poseFilters: createPoseFilterSet(),
        rootGroup: group,
      });
    } catch (e) {
      console.error(`[remoteAvatar] load failed for ${peerId}:`, e);
    }
  }

  removePeer(peerId: string): void {
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
