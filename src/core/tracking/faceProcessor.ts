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
  faceMesh.onResults((results: FaceResults) => {
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
  };
}
