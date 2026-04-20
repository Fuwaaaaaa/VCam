import type { Camera as CameraType } from '@mediapipe/camera_utils';
import { createFaceProcessor, type FaceProcessor } from './faceProcessor';
import { createPoseProcessor, type PoseProcessor } from './poseProcessor';
import type { FaceRig, PoseRig } from '../../types';

declare global {
  interface Window {
    Camera: new (
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width?: number; height?: number },
    ) => CameraType;
  }
}

export type TrackerPhase = 'setup' | 'face' | 'pose';
export type TrackerCallbacks = {
  onFaceRig: (rig: FaceRig) => void;
  onPoseRig: (rig: PoseRig) => void;
  onError?: (err: unknown, phase: TrackerPhase) => void;
};

export type Tracker = {
  start: () => Promise<void>;
  stop: () => void;
  enablePose: (on: boolean) => void;
  /** FaceMesh の onResults が一度でも呼ばれるまで待つ (tflite/wasm 解決確認) */
  waitForFaceActive: (timeoutMs: number) => Promise<boolean>;
  /** Pose の onResults が一度でも呼ばれるまで待つ */
  waitForPoseActive: (timeoutMs: number) => Promise<boolean>;
};

/**
 * Face + Pose のトラッキングを共有の MediaPipe Camera で駆動する。
 *
 *  ┌──────────┐
 *  │ webcam   │
 *  └────┬─────┘
 *       │ onFrame(video) (シーケンシャル)
 *       ├──▶ [FaceProcessor] ─▶ onFaceRig
 *       └──▶ [PoseProcessor] ─▶ onPoseRig   (enabled=true のときのみ)
 *
 * pose は UI でオフにできるよう enablePose() で切替。
 */
export async function createTracker(
  video: HTMLVideoElement,
  callbacks: TrackerCallbacks,
  opts: { width?: number; height?: number } = {},
): Promise<Tracker> {
  if (typeof window.Camera !== 'function') {
    const err = new Error('window.Camera が未定義 (@mediapipe/camera_utils CDN 未読込)');
    callbacks.onError?.(err, 'setup');
    throw err;
  }

  let face: FaceProcessor;
  let pose: PoseProcessor;
  let poseEnabled = true;

  try {
    face = createFaceProcessor({
      onRig: callbacks.onFaceRig,
      onError: (e) => callbacks.onError?.(e, 'face'),
    });
    pose = createPoseProcessor({
      onRig: callbacks.onPoseRig,
      onError: (e) => callbacks.onError?.(e, 'pose'),
    });
  } catch (e) {
    throw e;
  }

  const cam = new window.Camera(video, {
    onFrame: async () => {
      await face.send(video);
      if (poseEnabled) await pose.send(video);
    },
    width: opts.width ?? 640,
    height: opts.height ?? 480,
  });

  return {
    start: () => cam.start(),
    stop: () => { cam.stop(); face.close(); pose.close(); },
    enablePose: (on) => { poseEnabled = on; },
    waitForFaceActive: (ms) => face.waitForActive(ms),
    waitForPoseActive: (ms) => pose.waitForActive(ms),
  };
}
