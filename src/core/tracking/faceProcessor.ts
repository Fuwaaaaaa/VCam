import type { FaceMesh as FaceMeshType, Results as FaceResults } from '@mediapipe/face_mesh';
import * as Kalidokit from 'kalidokit';
import type { FaceRig } from '../../types';

declare global {
  interface Window {
    FaceMesh: new (config: { locateFile: (f: string) => string }) => FaceMeshType;
  }
}

const FACE_MESH_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';

export type FaceErrorPhase = 'setup' | 'send' | 'solve';
export type FaceCallbacks = {
  onRig: (rig: FaceRig) => void;
  onError?: (err: unknown, phase: FaceErrorPhase) => void;
};

export type FaceProcessor = {
  /** Camera から受け取った 1 フレームを FaceMesh に送る */
  send: (video: HTMLVideoElement) => Promise<void>;
  close: () => void;
  /** onResults が一度でも呼ばれたか (= tflite/wasm が解決し推論が動き始めたか) */
  isActive: () => boolean;
  /** isActive が true になるまで polling で待つ。timeout でも false を返す */
  waitForActive: (timeoutMs: number) => Promise<boolean>;
};

/**
 * FaceMesh + Kalidokit.Face.solve を組み立てた単一フレーム処理器。
 * Camera は所有せず、外部から send(video) で呼ばれる設計。
 *
 *  [video frame] ─▶ [FaceMesh] ─▶ results
 *                                    ▼
 *                     [Kalidokit.Face.solve] ─▶ onRig
 */
export function createFaceProcessor(callbacks: FaceCallbacks): FaceProcessor {
  if (typeof window.FaceMesh !== 'function') {
    const err = new Error('window.FaceMesh が未定義 (CDN スクリプト未読込)');
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

  let latestVideo: HTMLVideoElement | null = null;
  // tflite/wasm の遅延ロード失敗を「顔が映ってない」と区別するためのフラグ。
  // landmarks が空でも onResults 自体は呼ばれるので、ここで true を立てる。
  let rawCallbackFired = false;
  faceMesh.onResults((results: FaceResults) => {
    rawCallbackFired = true;
    const lm = results.multiFaceLandmarks?.[0];
    if (!lm) return;
    try {
      const rig = Kalidokit.Face.solve(lm, { runtime: 'mediapipe', video: latestVideo ?? undefined }) as FaceRig | undefined;
      if (rig) callbacks.onRig(rig);
    } catch (e) {
      callbacks.onError?.(e, 'solve');
    }
  });

  return {
    send: async (video) => {
      latestVideo = video;
      try { await faceMesh.send({ image: video }); }
      catch (e) { callbacks.onError?.(e, 'send'); }
    },
    close: () => { faceMesh.close?.(); },
    isActive: () => rawCallbackFired,
    waitForActive: async (timeoutMs) => {
      const start = performance.now();
      while (!rawCallbackFired) {
        if (performance.now() - start > timeoutMs) return false;
        await new Promise((r) => setTimeout(r, 100));
      }
      return true;
    },
  };
}
