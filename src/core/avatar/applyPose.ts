import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { PoseRig, Vector3 } from '../../types';
import type { PoseFilterSet } from '../filters/poseFilterSet';
import type { OneEuroFilter } from '../filters/OneEuroFilter';
import { lerp } from '../math/clamp';

/** 上半身ボーン名と対応する Kalidokit PoseRig のフィールド名 */
type BoneSpec = {
  boneName: VRMHumanBoneName;
  rigKey: keyof PoseRig;
  fX: keyof PoseFilterSet;
  fY: keyof PoseFilterSet;
  fZ: keyof PoseFilterSet;
};

const UPPER_BODY_BONES: BoneSpec[] = [
  { boneName: 'leftUpperArm' as VRMHumanBoneName,  rigKey: 'LeftUpperArm',  fX: 'lUpArmX', fY: 'lUpArmY', fZ: 'lUpArmZ' },
  { boneName: 'leftLowerArm' as VRMHumanBoneName,  rigKey: 'LeftLowerArm',  fX: 'lLoArmX', fY: 'lLoArmY', fZ: 'lLoArmZ' },
  { boneName: 'leftHand'     as VRMHumanBoneName,  rigKey: 'LeftHand',      fX: 'lHandX',  fY: 'lHandY',  fZ: 'lHandZ'  },
  { boneName: 'rightUpperArm' as VRMHumanBoneName, rigKey: 'RightUpperArm', fX: 'rUpArmX', fY: 'rUpArmY', fZ: 'rUpArmZ' },
  { boneName: 'rightLowerArm' as VRMHumanBoneName, rigKey: 'RightLowerArm', fX: 'rLoArmX', fY: 'rLoArmY', fZ: 'rLoArmZ' },
  { boneName: 'rightHand'     as VRMHumanBoneName, rigKey: 'RightHand',     fX: 'rHandX',  fY: 'rHandY',  fZ: 'rHandZ'  },
];

export type BoneRotationMap = Partial<Record<VRMHumanBoneName, Vector3>>;

/**
 * PoseRig から各ボーンの回転ベクトルを計算する pure 関数。
 * smooth=true のときフィルタを破壊的に更新する。
 *
 * mirror: webcam 鏡像モードで表示している場合 true (y, z を反転)。
 */
export function computePoseBoneRotations(
  rig: PoseRig | null,
  opts: { smooth: boolean; mirror: boolean },
  filters: PoseFilterSet | null,
  now: number,
): BoneRotationMap {
  if (!rig) return {};
  const out: BoneRotationMap = {};

  const apply = (v: Vector3 | undefined, fX?: OneEuroFilter, fY?: OneEuroFilter, fZ?: OneEuroFilter): Vector3 | undefined => {
    if (!v) return undefined;
    let x = v.x;
    let y = opts.mirror ? -v.y : v.y;
    let z = opts.mirror ? -v.z : v.z;
    if (opts.smooth && fX && fY && fZ) {
      x = fX.filter(x, now);
      y = fY.filter(y, now);
      z = fZ.filter(z, now);
    }
    return { x, y, z };
  };

  // Hips (rotation only — position は IK で別途)
  const hipsRot = rig.Hips?.rotation;
  const hips = apply(
    hipsRot,
    filters?.hipsX, filters?.hipsY, filters?.hipsZ,
  );
  if (hips) out['hips' as VRMHumanBoneName] = hips;

  // Spine
  const spine = apply(
    rig.Spine,
    filters?.spineX, filters?.spineY, filters?.spineZ,
  );
  if (spine) out['spine' as VRMHumanBoneName] = spine;

  // 上半身の腕・手
  for (const spec of UPPER_BODY_BONES) {
    const v = rig[spec.rigKey] as Vector3 | undefined;
    const r = apply(
      v,
      filters?.[spec.fX],
      filters?.[spec.fY],
      filters?.[spec.fZ],
    );
    if (r) out[spec.boneName] = r;
  }

  return out;
}

/** BoneRotationMap を VRM に適用する imperative な関数 */
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
