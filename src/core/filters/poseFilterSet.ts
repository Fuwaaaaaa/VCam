import { OneEuroFilter } from './OneEuroFilter';

/**
 * 全身ボーン用の 3 軸フィルタ束:
 * - 回転: hips + spine + (腕 × 3) × 2 + (脚 × 3) × 2 = 14 ボーン × 3 軸 = 42 フィルタ
 * - Hips 位置: X, Y の 2 フィルタ (Z は webcam 深度不安定のため未使用)
 *
 * 顔よりノイズが大きく、脚はさらに大きいので脚用は minCutoff 高め (応答鈍く安定重視)。
 */
export type PoseFilterSet = {
  // hips 回転
  hipsX: OneEuroFilter; hipsY: OneEuroFilter; hipsZ: OneEuroFilter;
  // hips 位置
  hipsPosX: OneEuroFilter; hipsPosY: OneEuroFilter;
  // spine
  spineX: OneEuroFilter; spineY: OneEuroFilter; spineZ: OneEuroFilter;
  // left arm
  lUpArmX: OneEuroFilter; lUpArmY: OneEuroFilter; lUpArmZ: OneEuroFilter;
  lLoArmX: OneEuroFilter; lLoArmY: OneEuroFilter; lLoArmZ: OneEuroFilter;
  lHandX:  OneEuroFilter; lHandY:  OneEuroFilter; lHandZ:  OneEuroFilter;
  // right arm
  rUpArmX: OneEuroFilter; rUpArmY: OneEuroFilter; rUpArmZ: OneEuroFilter;
  rLoArmX: OneEuroFilter; rLoArmY: OneEuroFilter; rLoArmZ: OneEuroFilter;
  rHandX:  OneEuroFilter; rHandY:  OneEuroFilter; rHandZ:  OneEuroFilter;
  // left leg (minCutoff 低め・beta 低めで安定重視)
  lUpLegX: OneEuroFilter; lUpLegY: OneEuroFilter; lUpLegZ: OneEuroFilter;
  lLoLegX: OneEuroFilter; lLoLegY: OneEuroFilter; lLoLegZ: OneEuroFilter;
  // right leg
  rUpLegX: OneEuroFilter; rUpLegY: OneEuroFilter; rUpLegZ: OneEuroFilter;
  rLoLegX: OneEuroFilter; rLoLegY: OneEuroFilter; rLoLegZ: OneEuroFilter;
  // Kalidokit.Pose は Foot 回転を返さないため含めない (足は lowerLeg から FK で伸びる)
};

const makeBody = () => new OneEuroFilter(0.8, 0.015);
const makeLeg  = () => new OneEuroFilter(0.5, 0.01);   // 脚は鈍く安定重視
const makePos  = () => new OneEuroFilter(0.4, 0.01);   // 位置ブレは特に抑制

export function createPoseFilterSet(): PoseFilterSet {
  return {
    hipsX: makeBody(), hipsY: makeBody(), hipsZ: makeBody(),
    hipsPosX: makePos(), hipsPosY: makePos(),
    spineX: makeBody(), spineY: makeBody(), spineZ: makeBody(),
    lUpArmX: makeBody(), lUpArmY: makeBody(), lUpArmZ: makeBody(),
    lLoArmX: makeBody(), lLoArmY: makeBody(), lLoArmZ: makeBody(),
    lHandX:  makeBody(), lHandY:  makeBody(), lHandZ:  makeBody(),
    rUpArmX: makeBody(), rUpArmY: makeBody(), rUpArmZ: makeBody(),
    rLoArmX: makeBody(), rLoArmY: makeBody(), rLoArmZ: makeBody(),
    rHandX:  makeBody(), rHandY:  makeBody(), rHandZ:  makeBody(),
    lUpLegX: makeLeg(), lUpLegY: makeLeg(), lUpLegZ: makeLeg(),
    lLoLegX: makeLeg(), lLoLegY: makeLeg(), lLoLegZ: makeLeg(),
    rUpLegX: makeLeg(), rUpLegY: makeLeg(), rUpLegZ: makeLeg(),
    rLoLegX: makeLeg(), rLoLegY: makeLeg(), rLoLegZ: makeLeg(),
  };
}

export function resetPoseFilterSet(f: PoseFilterSet): void {
  (Object.values(f) as OneEuroFilter[]).forEach((flt) => flt.reset());
}
