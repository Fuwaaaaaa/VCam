import { createFaceProcessor, type FaceProcessor } from './faceProcessor';
import { createPoseProcessor, type PoseProcessor } from './poseProcessor';
import type { FaceRig, PoseRig } from '../../types';

export type TrackerPhase = 'setup' | 'face' | 'pose' | 'camera';
export type TrackerCallbacks = {
  onFaceRig: (rig: FaceRig) => void;
  onPoseRig: (rig: PoseRig) => void;
  onError?: (err: unknown, phase: TrackerPhase) => void;
};

export type TrackerOptions = {
  width?: number;
  height?: number;
  /** 指定すれば getUserMedia の exact 制約で該当カメラを掴む。null/undefined は OS 既定 */
  deviceId?: string | null;
};

export type Tracker = {
  start: () => Promise<void>;
  stop: () => void;
  enablePose: (on: boolean) => void;
  /** FaceMesh の onResults が一度でも呼ばれるまで待つ (tflite/wasm 解決確認) */
  waitForFaceActive: (timeoutMs: number) => Promise<boolean>;
  /** Pose の onResults が一度でも呼ばれるまで待つ */
  waitForPoseActive: (timeoutMs: number) => Promise<boolean>;
  /** 実行中に deviceId を切替 (ストリーム張り直し)。start() 前でも後でも呼べる */
  switchCamera: (deviceId: string | null) => Promise<void>;
};

/**
 * Face + Pose のトラッキングを共有 frame driver で駆動する。
 *
 *  ┌──────────┐
 *  │ webcam   │← getUserMedia({video:{deviceId}})
 *  └────┬─────┘
 *       │ rAF loop
 *       ├──▶ [FaceProcessor] ─▶ onFaceRig
 *       └──▶ [PoseProcessor] ─▶ onPoseRig   (enabled=true のときのみ)
 *
 * T-007 で @mediapipe/camera_utils を剥がし、deviceId 指定可能な独自 driver に置換。
 */
export async function createTracker(
  video: HTMLVideoElement,
  callbacks: TrackerCallbacks,
  opts: TrackerOptions = {},
): Promise<Tracker> {
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

  const width = opts.width ?? 640;
  const height = opts.height ?? 480;
  let currentDeviceId: string | null = opts.deviceId ?? null;
  let stream: MediaStream | null = null;
  let rafId = 0;
  let running = false;
  let inFlight = false;

  const acquireStream = async (deviceId: string | null): Promise<MediaStream> => {
    const constraints: MediaTrackConstraints = { width, height };
    if (deviceId) constraints.deviceId = { exact: deviceId };
    return navigator.mediaDevices.getUserMedia({ video: constraints });
  };

  const stopStream = (): void => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  };

  const frame = (): void => {
    if (!running) return;
    // send() 中に次フレームを重ねない (backpressure)。MediaPipe の内部 queue 膨張を避ける。
    if (!inFlight && video.readyState >= 2) {
      inFlight = true;
      (async () => {
        try {
          await face.send(video);
          if (poseEnabled) await pose.send(video);
        } finally {
          inFlight = false;
        }
      })();
    }
    rafId = requestAnimationFrame(frame);
  };

  const startLoop = async (): Promise<void> => {
    try {
      stopStream();
      stream = await acquireStream(currentDeviceId);
    } catch (e) {
      callbacks.onError?.(e, 'camera');
      throw e;
    }
    video.srcObject = stream;
    try { await video.play(); } catch { /* autoplay policies — play が拒否されても読み続けるブラウザあり */ }
    running = true;
    rafId = requestAnimationFrame(frame);
  };

  return {
    start: () => startLoop(),
    stop: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      stopStream();
      video.srcObject = null;
      face.close();
      pose.close();
    },
    enablePose: (on) => { poseEnabled = on; },
    waitForFaceActive: (ms) => face.waitForActive(ms),
    waitForPoseActive: (ms) => pose.waitForActive(ms),
    switchCamera: async (deviceId) => {
      currentDeviceId = deviceId;
      if (!running) return;
      stopStream();
      stream = await acquireStream(currentDeviceId);
      video.srcObject = stream;
      try { await video.play(); } catch { /* ignore */ }
    },
  };
}
