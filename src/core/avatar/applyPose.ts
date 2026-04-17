import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { PoseRig, Vector3 } from '../../types';
import type { PoseFilterSet } from '../filters/poseFilterSet';
import type { OneEuroFilter } from '../filters/OneEuroFilter';
import { lerp, clamp } from '../math/clamp';

/** 全身ボーン名と対応する Kalidokit PoseRig のフィールド名 */
type BoneSpec = {
  boneName: VRMHumanBoneName;
  rigKey: keyof PoseRig;
  fX: keyof PoseFilterSet;
  fY: keyof PoseFilterSet;
  fZ: keyof PoseFilterSet;
  /** 脚は visibility が低いことが多いので、強度係数を別管理 (options.legStrength が乗算される) */
  isLeg?: boolean;
};

const BODY_BONES: BoneSpec[] = [
  // 上半身
  { boneName: 'leftUpperArm'  as VRMHumanBoneName, rigKey: 'LeftUpperArm',  fX: 'lUpArmX', fY: 'lUpArmY', fZ: 'lUpArmZ' },
  { boneName: 'leftLowerArm'  as VRMHumanBoneName, rigKey: 'LeftLowerArm',  fX: 'lLoArmX', fY: 'lLoArmY', fZ: 'lLoArmZ' },
  { boneName: 'leftHand'      as VRMHumanBoneName, rigKey: 'LeftHand',      fX: 'lHandX',  fY: 'lHandY',  fZ: 'lHandZ'  },
  { boneName: 'rightUpperArm' as VRMHumanBoneName, rigKey: 'RightUpperArm', fX: 'rUpArmX', fY: 'rUpArmY', fZ: 'rUpArmZ' },
  { boneName: 'rightLowerArm' as VRMHumanBoneName, rigKey: 'RightLowerArm', fX: 'rLoArmX', fY: 'rLoArmY', fZ: 'rLoArmZ' },
  { boneName: 'rightHand'     as VRMHumanBoneName, rigKey: 'RightHand',     fX: 'rHandX',  fY: 'rHandY',  fZ: 'rHandZ'  },
  // 下半身 (Phase 3-b)
  { boneName: 'leftUpperLeg'  as VRMHumanBoneName, rigKey: 'LeftUpperLeg',  fX: 'lUpLegX', fY: 'lUpLegY', fZ: 'lUpLegZ', isLeg: true },
  { boneName: 'leftLowerLeg'  as VRMHumanBoneName, rigKey: 'LeftLowerLeg',  fX: 'lLoLegX', fY: 'lLoLegY', fZ: 'lLoLegZ', isLeg: true },
  { boneName: 'rightUpperLeg' as VRMHumanBoneName, rigKey: 'RightUpperLeg', fX: 'rUpLegX', fY: 'rUpLegY', fZ: 'rUpLegZ', isLeg: true },
  { boneName: 'rightLowerLeg' as VRMHumanBoneName, rigKey: 'RightLowerLeg', fX: 'rLoLegX', fY: 'rLoLegY', fZ: 'rLoLegZ', isLeg: true },
];

export type BoneRotationMap = Partial<Record<VRMHumanBoneName, Vector3>>;

export type ComputePoseOptions = {
  smooth: boolean;
  mirror: boolean;
  /**
   * 脚の追従強度 (0..1)。webcam が膝より下を映さない場合は低めに。
   * 既定 1.0。legStrength=0 で脚は常にニュートラル。
   */
  legStrength?: number;
  /**
   * ヒップ位置オフセットの適用強度 (0..1)。X/Y のみ適用、Z は使わない。
   * 既定 0.3 (控えめ)。1.0 で生値のまま。
   */
  hipPosStrength?: number;
};

/**
 * PoseRig から各ボーンの回転ベクトルを計算する pure 関数。
 * smooth=true のときフィルタを破壊的に更新する。
 */
export function computePoseBoneRotations(
  rig: PoseRig | null,
  opts: ComputePoseOptions,
  filters: PoseFilterSet | null,
  now: number,
): BoneRotationMap {
  if (!rig) return {};
  const legStrength = opts.legStrength ?? 1.0;
  const out: BoneRotationMap = {};

  const apply = (
    v: Vector3 | undefined,
    fX?: OneEuroFilter,
    fY?: OneEuroFilter,
    fZ?: OneEuroFilter,
    strength = 1.0,
  ): Vector3 | undefined => {
    if (!v) return undefined;
    let x = v.x * strength;
    let y = (opts.mirror ? -v.y : v.y) * strength;
    let z = (opts.mirror ? -v.z : v.z) * strength;
    if (opts.smooth && fX && fY && fZ) {
      x = fX.filter(x, now);
      y = fY.filter(y, now);
      z = fZ.filter(z, now);
    }
    return { x, y, z };
  };

  // Hips (rotation only)
  const hips = apply(
    rig.Hips?.rotation,
    filters?.hipsX, filters?.hipsY, filters?.hipsZ,
  );
  if (hips) out['hips' as VRMHumanBoneName] = hips;

  // Spine
  const spine = apply(
    rig.Spine,
    filters?.spineX, filters?.spineY, filters?.spineZ,
  );
  if (spine) out['spine' as VRMHumanBoneName] = spine;

  // 四肢
  for (const spec of BODY_BONES) {
    const v = rig[spec.rigKey] as Vector3 | undefined;
    const strength = spec.isLeg ? legStrength : 1.0;
    if (spec.isLeg && legStrength <= 0) continue;
    const r = apply(
      v,
      filters?.[spec.fX] as OneEuroFilter | undefined,
      filters?.[spec.fY] as OneEuroFilter | undefined,
      filters?.[spec.fZ] as OneEuroFilter | undefined,
      strength,
    );
    if (r) out[spec.boneName] = r;
  }

  return out;
}

/** Hips 位置オフセット (2D, X と Y のみ)。Z は webcam 深度が不安定なため除外 */
export type HipPosition = { x: number; y: number };

/**
 * Hips.position のオフセットを計算する pure 関数。
 * - X 軸: 左右移動 (mirror 反転対応)
 * - Y 軸: 上下移動 (床突き抜け防止で下方向に clamp)
 * - hipPosStrength で全体をスケール (既定 0.3)
 * - Y は [yMin, yMax] で clamp (床=0 基準で下限は -0.2 m まで)
 */
const Y_MIN = -0.2;   // 床より 20cm 下までは沈み込み許容
const Y_MAX = 0.5;    // 上方向は 50cm まで (ジャンプ表現用)

export function computeHipPosition(
  rig: PoseRig | null,
  opts: { smooth: boolean; mirror: boolean; hipPosStrength?: number },
  filters: PoseFilterSet | null,
  now: number,
): HipPosition | null {
  const pos = rig?.Hips?.position;
  if (!pos) return null;
  const strength = opts.hipPosStrength ?? 0.3;
  let x = (opts.mirror ? -pos.x : pos.x) * strength;
  let y = pos.y * strength;
  if (opts.smooth && filters) {
    x = filters.hipsPosX.filter(x, now);
    y = filters.hipsPosY.filter(y, now);
  }
  y = clamp(y, Y_MIN, Y_MAX);
  return { x, y };
}

/** BoneRotationMap と Hip 位置を VRM に適用する imperative な関数 */
const FALLBACK_EASE = 0.4;

export function applyBoneRotations(
  vrm: VRM,
  rotations: BoneRotationMap,
  smooth: boolean,
): void {
  const hum = vrm.humanoid;
  if (!hum) return;
  for (const [name, rot] of Object.entries(rotations) as [VRMHumanBoneName, Vector3][]) {
    const bone = hum.getNormalizedBoneNode(name);
    if (!bone) continue;
    if (smooth) {
      bone.rotation.set(rot.x, rot.y, rot.z);
    } else {
      bone.rotation.x = lerp(bone.rotation.x, rot.x, FALLBACK_EASE);
      bone.rotation.y = lerp(bone.rotation.y, rot.y, FALLBACK_EASE);
      bone.rotation.z = lerp(bone.rotation.z, rot.z, FALLBACK_EASE);
    }
  }
}

export function applyHipPosition(vrm: VRM, hp: HipPosition | null, smooth: boolean): void {
  const hum = vrm.humanoid;
  if (!hum) return;
  const hips = hum.getNormalizedBoneNode('hips' as VRMHumanBoneName);
  if (!hips) return;
  if (!hp) {
    // ヒップ位置オフセットが取れない場合は 0 に戻す (smooth 時は lerp で緩やかに)
    if (smooth) hips.position.set(0, hips.position.y * 0.9, 0);
    else {
      hips.position.x = lerp(hips.position.x, 0, FALLBACK_EASE);
      hips.position.y = lerp(hips.position.y, 0, FALLBACK_EASE);
    }
    return;
  }
  if (smooth) {
    hips.position.x = hp.x;
    hips.position.y = hp.y;
    // Z は触らない (0 のまま)
  } else {
    hips.position.x = lerp(hips.position.x, hp.x, FALLBACK_EASE);
    hips.position.y = lerp(hips.position.y, hp.y, FALLBACK_EASE);
  }
}
