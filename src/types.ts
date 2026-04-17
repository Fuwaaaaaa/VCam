/**
 * Kalidokit.Face.solve の返り値のサブセット (必要部分のみ)。
 * 公式の型定義が緩いので、このモジュールで実用的な形を定義する。
 */
export type FaceRig = {
  head: { x: number; y: number; z: number };
  eye: { l: number; r: number };
  mouth: { shape: { A: number; I: number; U: number; E: number; O: number } };
  pupil?: { x: number; y: number };
  brow?: number;
};

/** UI トグル状態 */
export type AppOptions = {
  mic: boolean;
  gaze: boolean;
  smooth: boolean;
  pose: boolean;
};

/** Kalidokit.Pose.solve の返り値のサブセット (上半身のみ使用) */
export type Vector3 = { x: number; y: number; z: number };

export type PoseRig = {
  Hips?: { position?: Vector3; rotation?: Vector3 };
  Spine?: Vector3;
  LeftUpperArm?: Vector3;
  LeftLowerArm?: Vector3;
  LeftHand?: Vector3;
  RightUpperArm?: Vector3;
  RightLowerArm?: Vector3;
  RightHand?: Vector3;
  // 下半身 (Phase 3-b 以降)
  LeftUpperLeg?: Vector3;
  LeftLowerLeg?: Vector3;
  RightUpperLeg?: Vector3;
  RightLowerLeg?: Vector3;
};

/** blend shape 値マップ (ExpressionManager に送る前の中間表現) */
export type ExpressionValues = {
  blinkLeft: number;
  blinkRight: number;
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
  surprised: number;
  sad: number;
  lookLeft: number;
  lookRight: number;
  lookUp: number;
  lookDown: number;
};
