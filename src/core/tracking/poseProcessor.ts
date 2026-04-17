import * as Kalidokit from 'kalidokit';
import type { PoseRig } from '../../types';

// @mediapipe/pose は npm パッケージに型がないので必要最小限の宣言を行う
type Landmark = { x: number; y: number; z: number; visibility?: number };
type PoseResults = {
  poseLandmarks?: Landmark[];
  poseWorldLandmarks?: Landmark[];
};
type PoseInstance = {
  setOptions: (opts: Record<string, unknown>) => void;
  onResults: (cb: (r: PoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }) => Promise<void>;
  close?: () => void;
};

declare global {
  interface Window {
    Pose: new (config: { locateFile: (f: string) => string }) => PoseInstance;
  }
}

const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404';

export type PoseErrorPhase = 'setup' | 'send' | 'solve';
export type PoseCallbacks = {
  onRig: (rig: PoseRig) => void;
  onError?: (err: unknown, phase: PoseErrorPhase) => void;
};

export type PoseProcessorOptions = {
  /** Kalidokit に脚も解かせるか。Phase 3-b 以降は true 既定 */
  enableLegs?: boolean;
  /** MediaPipe Pose モデル複雑度: 0=Lite (速/粗), 1=Full (標準), 2=Heavy (遅/精) */
  modelComplexity?: 0 | 1 | 2;
};

export type PoseProcessor = {
  send: (video: HTMLVideoElement) => Promise<void>;
  close: () => void;
};

/**
 * MediaPipe Pose + Kalidokit.Pose.solve を組み立てた単一フレーム処理器。
 * Phase 3-b 時点で enableLegs=true が既定 (下半身含む全身トラッキング)。
 */
export function createPoseProcessor(
  callbacks: PoseCallbacks,
  options: PoseProcessorOptions = {},
): PoseProcessor {
  const enableLegs = options.enableLegs ?? true;
  const modelComplexity = options.modelComplexity ?? 1;
  if (typeof window.Pose !== 'function') {
    const err = new Error('window.Pose が未定義 (@mediapipe/pose CDN 未読込)');
    callbacks.onError?.(err, 'setup');
    throw err;
  }

  let pose: PoseInstance;
  try {
    pose = new window.Pose({ locateFile: (f: string) => `${POSE_CDN}/${f}` });
    pose.setOptions({
      modelComplexity,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (e) {
    callbacks.onError?.(e, 'setup');
    throw e;
  }

  let latestVideo: HTMLVideoElement | null = null;
  pose.onResults((results: PoseResults) => {
    const lm2d = results.poseLandmarks;
    const lm3d = results.poseWorldLandmarks;
    if (!lm2d || !lm3d) return;
    try {
      const rig = Kalidokit.Pose.solve(lm3d, lm2d, {
        runtime: 'mediapipe',
        video: latestVideo ?? undefined,
        enableLegs,
      }) as PoseRig | undefined;
      if (rig) callbacks.onRig(rig);
    } catch (e) {
      callbacks.onError?.(e, 'solve');
    }
  });

  return {
    send: async (video) => {
      latestVideo = video;
      try { await pose.send({ image: video }); }
      catch (e) { callbacks.onError?.(e, 'send'); }
    },
    close: () => { pose.close?.(); },
  };
}
