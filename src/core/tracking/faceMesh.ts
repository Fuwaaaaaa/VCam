import type { FaceMesh as FaceMeshType, Results } from '@mediapipe/face_mesh';
import type { Camera as CameraType } from '@mediapipe/camera_utils';
import * as Kalidokit from 'kalidokit';
import type { FaceRig } from '../../types';

declare global {
  interface Window {
    FaceMesh: new (config: { locateFile: (f: string) => string }) => FaceMeshType;
    Camera: new (
      video: HTMLVideoElement,
      config: { onFrame: () => Promise<void>; width?: number; height?: number },
    ) => CameraType;
  }
}

const FACE_MESH_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';

export type FaceTrackerCallbacks = {
  onRig: (rig: FaceRig) => void;
  onError?: (err: unknown, phase: 'setup' | 'frame' | 'solve') => void;
};

/**
 * FaceMesh + Kalidokit の wiring。
 *
 *  [webcam video] ─▶ [FaceMesh (CDN wasm/tflite)] ─▶ results
 *                                                    │
 *                                                    ▼
 *                                        [Kalidokit.Face.solve] ─▶ FaceRig ─▶ onRig
 *
 * T-003 critical gap: FaceMesh setup / Kalidokit.solve の両方で throw する可能性があるので
 * callbacks.onError で通知する。window.FaceMesh / window.Camera が未ロード (CDN 失敗) の
 * 場合も setup フェーズでエラー化する。
 */
export async function createFaceTracker(
  video: HTMLVideoElement,
  callbacks: FaceTrackerCallbacks,
  opts: { width?: number; height?: number } = {},
): Promise<{ start: () => Promise<void>; stop: () => void }> {
  if (typeof window.FaceMesh !== 'function' || typeof window.Camera !== 'function') {
    const err = new Error('MediaPipe CDN が読み込まれていません (window.FaceMesh / Camera 未定義)');
    callbacks.onError?.(err, 'setup');
    throw err;
  }

  let faceMesh: FaceMeshType;
  try {
    faceMesh = new window.FaceMesh({
      locateFile: (f: string) => `${FACE_MESH_CDN}/${f}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch (e) {
    callbacks.onError?.(e, 'setup');
    throw e;
  }

  faceMesh.onResults((results: Results) => {
    const lm = results.multiFaceLandmarks?.[0];
    if (!lm) return;
    try {
      const rig = Kalidokit.Face.solve(lm, { runtime: 'mediapipe', video }) as FaceRig;
      if (rig) callbacks.onRig(rig);
    } catch (e) {
      callbacks.onError?.(e, 'solve');
    }
  });

  const cam = new window.Camera(video, {
    onFrame: async () => {
      try {
        await faceMesh.send({ image: video });
      } catch (e) {
        callbacks.onError?.(e, 'frame');
      }
    },
    width: opts.width ?? 640,
    height: opts.height ?? 480,
  });

  return {
    start: () => cam.start(),
    stop: () => cam.stop(),
  };
}
