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

export type PoseProcessor = {
  send: (video: HTMLVideoElement) => Promise<void>;
  close: () => void;
};

/**
 * MediaPipe Pose + Kalidokit.Pose.solve を組み立てた単一フレーム処理器。
 * 上半身のみ追従 (enableLegs: false) — Phase 3-b で下半身+IK を追加する。
 */
export function createPoseProcessor(callbacks: PoseCallbacks): PoseProcessor {
  if (typeof window.Pose !== 'function') {
    const err = new Error('window.Pose が未定義 (@mediapipe/pose CDN 未読込)');
    callbacks.onError?.(err, 'setup');
    throw err;
  }

  let pose: PoseInstance;
  try {
    pose = new window.Pose({ locateFile: (f: string) => `${POSE_CDN}/${f}` });
    pose.setOptions({
      modelComplexity: 1,          // 0=Lite, 1=Full, 2=Heavy
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
        enableLegs: false,
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
