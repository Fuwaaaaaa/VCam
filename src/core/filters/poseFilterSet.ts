import { OneEuroFilter } from './OneEuroFilter';

/**
 * 上半身ボーン用の 3 軸 × 6 ボーン (+ 背骨 + ヒップ) = 24 フィルタ。
 * 顔よりノイズが大きいので minCutoff を低め、beta はやや高めに設定。
 */
export type PoseFilterSet = {
  // hips
  hipsX: OneEuroFilter; hipsY: OneEuroFilter; hipsZ: OneEuroFilter;
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
};

const make = () => new OneEuroFilter(0.8, 0.015);

export function createPoseFilterSet(): PoseFilterSet {
  return {
    hipsX: make(), hipsY: make(), hipsZ: make(),
    spineX: make(), spineY: make(), spineZ: make(),
    lUpArmX: make(), lUpArmY: make(), lUpArmZ: make(),
    lLoArmX: make(), lLoArmY: make(), lLoArmZ: make(),
    lHandX:  make(), lHandY:  make(), lHandZ:  make(),
    rUpArmX: make(), rUpArmY: make(), rUpArmZ: make(),
    rLoArmX: make(), rLoArmY: make(), rLoArmZ: make(),
    rHandX:  make(), rHandY:  make(), rHandZ:  make(),
  };
}

export function resetPoseFilterSet(f: PoseFilterSet): void {
  (Object.values(f) as OneEuroFilter[]).forEach((flt) => flt.reset());
}
