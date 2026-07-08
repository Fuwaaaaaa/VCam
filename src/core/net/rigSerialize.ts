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

// ==================== 受信バリデーション ====================
// 悪意あるピアは任意の JSON を送れる。数値フィールドに NaN/Infinity/文字列を
// 混ぜられると three.js の行列が壊れて描画が停止したり、型混同で
// applyRig 内が throw してアニメーションループごと死ぬ (受信側 DoS)。
// そのため present なフィールドは形状と有限性を厳格に検査し、1 つでも壊れて
// いればメッセージ全体を破棄する。未知キーは receive/apply 側が読まないため無視。

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

const asObj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null;

function isVec3(v: unknown): v is { x: number; y: number; z: number } {
  const o = asObj(v);
  return !!o && isNum(o.x) && isNum(o.y) && isNum(o.z);
}

function isVec2(v: unknown): v is { x: number; y: number } {
  const o = asObj(v);
  return !!o && isNum(o.x) && isNum(o.y);
}

function isFaceRig(v: unknown): v is FaceRig {
  const f = asObj(v);
  if (!f) return false;
  if (!isVec3(f.head)) return false;
  const eye = asObj(f.eye);
  if (!eye || !isNum(eye.l) || !isNum(eye.r)) return false;
  const mouth = asObj(f.mouth);
  const shape = mouth ? asObj(mouth.shape) : null;
  if (!shape || !isNum(shape.A) || !isNum(shape.I) || !isNum(shape.U) ||
      !isNum(shape.E) || !isNum(shape.O)) return false;
  if (f.pupil !== undefined && !isVec2(f.pupil)) return false;
  if (f.brow !== undefined && !isNum(f.brow)) return false;
  return true;
}

const POSE_VEC_KEYS = [
  'Spine',
  'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
  'RightUpperArm', 'RightLowerArm', 'RightHand',
  'LeftUpperLeg', 'LeftLowerLeg',
  'RightUpperLeg', 'RightLowerLeg',
] as const;

function isPoseRig(v: unknown): v is PoseRig {
  const p = asObj(v);
  if (!p) return false;
  if (p.Hips !== undefined) {
    const h = asObj(p.Hips);
    if (!h) return false;
    if (h.position !== undefined && !isVec3(h.position)) return false;
    if (h.rotation !== undefined && !isVec3(h.rotation)) return false;
  }
  for (const k of POSE_VEC_KEYS) {
    if (p[k] !== undefined && !isVec3(p[k])) return false;
  }
  return true;
}

/** 受信メッセージのバリデーション。present な全フィールドの形状と数値有限性を検査する。 */
export function isPeerMessageV1(x: unknown): x is PeerMessageV1 {
  const m = asObj(x);
  if (!m) return false;
  if (m.v !== 1 || !isNum(m.t)) return false;
  if (m.face !== undefined && m.face !== null && !isFaceRig(m.face)) return false;
  if (m.pose !== undefined && m.pose !== null && !isPoseRig(m.pose)) return false;
  if (m.hipPos !== undefined && m.hipPos !== null && !isVec2(m.hipPos)) return false;
  if (m.micLevel !== undefined && !isNum(m.micLevel)) return false;
  return true;
}
