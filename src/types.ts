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
