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

/**
 * 永続化される設定値。localStorage に JSON で保存。
 * トグル (mic/gaze/smooth/pose) は起動状態を復元、強度/感度は UI スライダから変更。
 */
export type Settings = {
  toggles: AppOptions;
  legStrength: number;      // 0..1
  hipPosStrength: number;   // 0..1
  micSensitivity: number;   // 1..15
  /** 透過背景 (Phase F) */
  transparentBg?: boolean;
  /** ポストエフェクト Bloom (Phase F) */
  bloom?: boolean;
  bloomStrength?: number;   // 0..3
  /** T-007: 選択されたカメラ/マイクの deviceId。null = OS 既定 */
  cameraDeviceId?: string | null;
  micDeviceId?: string | null;
};

/** Kalidokit.Pose.solve の返り値のサブセット (上半身のみ使用) */
export type Vector3 = { x: number; y: number; z: number };

/** Phase E: ピア間で送受信する最小メッセージ形式 */
export type PeerMessageV1 = {
  v: 1;
  t: number;              // タイムスタンプ (ms)
  face?: FaceRig | null;
  pose?: PoseRig | null;
  hipPos?: { x: number; y: number } | null;
  micLevel?: number;
};

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

/**
 * index.html の MediaPipe CDN script タグに付けた onerror フックがセットするフラグ。
 * boot() で起動時に検査し、ロード失敗時はトラッカー初期化前にユーザーへ通知する。
 */
declare global {
  interface Window {
    __faceMeshCdnFailed?: boolean;
    __poseCdnFailed?: boolean;
  }
}

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
