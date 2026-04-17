import type { FaceRig } from '../../types';
import type { RigFilterSet } from '../filters/rigFilterSet';

export type HeadRotation = { x: number; y: number; z: number };

/**
 * 頭の回転 (radian) を計算する pure 関数。
 * webcam が scaleX(-1) で鏡像表示される前提で y/z を反転。
 *
 * smooth=true のとき One Euro Filter を適用。フィルタは破壊的に更新される。
 */
export function computeHeadRotation(
  rig: FaceRig | null,
  smooth: boolean,
  filters: RigFilterSet | null,
  now: number,
): HeadRotation {
  if (!rig) return { x: 0, y: 0, z: 0 };
  let hx = rig.head.x;
  let hy = -rig.head.y;
  let hz = -rig.head.z;
  if (smooth && filters) {
    hx = filters.headX.filter(hx, now);
    hy = filters.headY.filter(hy, now);
    hz = filters.headZ.filter(hz, now);
  }
  return { x: hx, y: hy, z: hz };
}

/** 首ボーンへの分配比率 */
export const NECK_WEIGHT = 0.3;

export function scaleHeadForNeck(h: HeadRotation, weight = NECK_WEIGHT): HeadRotation {
  return { x: h.x * weight, y: h.y * weight, z: h.z * weight };
}
