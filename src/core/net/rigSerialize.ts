import type { FaceRig, PoseRig, PeerMessageV1 } from '../../types';

/**
 * rig をネットワーク送信向けに圧縮する純関数群。
 * - 数値は float 丸め (4 桁) で JSON サイズを削減
 * - null/undefined フィールドは省略
 */
const r = (n: number): number => Math.round(n * 10000) / 10000;

function compactFace(face: FaceRig | null): FaceRig | null {
  if (!face) return null;
  return {
    head: { x: r(face.head.x), y: r(face.head.y), z: r(face.head.z) },
    eye: { l: r(face.eye.l), r: r(face.eye.r) },
    mouth: {
      shape: {
        A: r(face.mouth.shape.A), I: r(face.mouth.shape.I),
        U: r(face.mouth.shape.U), E: r(face.mouth.shape.E),
        O: r(face.mouth.shape.O),
      },
    },
    pupil: face.pupil ? { x: r(face.pupil.x), y: r(face.pupil.y) } : undefined,
    brow: face.brow !== undefined ? r(face.brow) : undefined,
  };
}

function compactVec(v: { x: number; y: number; z: number } | undefined)
    : { x: number; y: number; z: number } | undefined {
  if (!v) return undefined;
  return { x: r(v.x), y: r(v.y), z: r(v.z) };
}

function compactPose(pose: PoseRig | null): PoseRig | null {
  if (!pose) return null;
  const out: PoseRig = {};
  if (pose.Hips?.rotation) out.Hips = { rotation: compactVec(pose.Hips.rotation) };
  if (pose.Hips?.position) {
    out.Hips = { ...(out.Hips ?? {}), position: compactVec(pose.Hips.position) };
  }
  const keys: (keyof PoseRig)[] = [
    'Spine',
    'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
    'RightUpperArm', 'RightLowerArm', 'RightHand',
    'LeftUpperLeg', 'LeftLowerLeg',
    'RightUpperLeg', 'RightLowerLeg',
  ];
  for (const k of keys) {
    const v = pose[k] as { x: number; y: number; z: number } | undefined;
    if (v) (out as Record<string, unknown>)[k] = compactVec(v);
  }
  return out;
}

export function encodeMessage(msg: {
  face: FaceRig | null;
  pose: PoseRig | null;
  hipPos: { x: number; y: number } | null;
  micLevel: number;
}): PeerMessageV1 {
  return {
    v: 1,
    t: Date.now(),
    face: compactFace(msg.face),
    pose: compactPose(msg.pose),
    hipPos: msg.hipPos ? { x: r(msg.hipPos.x), y: r(msg.hipPos.y) } : null,
    micLevel: r(msg.micLevel),
  };
}

/** 受信メッセージの最低限のバリデーション */
export function isPeerMessageV1(x: unknown): x is PeerMessageV1 {
  if (!x || typeof x !== 'object') return false;
  const m = x as Partial<PeerMessageV1>;
  return m.v === 1 && typeof m.t === 'number';
}
