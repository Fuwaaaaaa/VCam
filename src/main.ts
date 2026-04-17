import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VRM } from '@pixiv/three-vrm';

import type { FaceRig, PoseRig, AppOptions } from './types';
import { loadVRMFromUrl, disposeVRM } from './core/avatar/loadVRM';
import { applyRig } from './core/avatar/applyRig';
import { computePoseBoneRotations, applyBoneRotations, computeHipPosition, applyHipPosition } from './core/avatar/applyPose';
import { createRigFilterSet, resetRigFilterSet } from './core/filters/rigFilterSet';
import { createPoseFilterSet, resetPoseFilterSet } from './core/filters/poseFilterSet';
import { MicTracker } from './core/audio/micLevel';
import { createTracker } from './core/tracking/tracker';
import { createStatus } from './ui/status';
import { wireDropZone } from './ui/dropZone';
import { wireControls } from './ui/controls';

// ==================== DOM ====================
const statusEl   = document.getElementById('status')     as HTMLElement;
const videoEl    = document.getElementById('webcam')     as HTMLVideoElement;
const dropEl     = document.getElementById('drop-zone')  as HTMLElement;
const inputEl    = document.getElementById('vrm-input')  as HTMLInputElement;
const micBtn     = document.getElementById('mic-btn')    as HTMLButtonElement;
const micMeterEl = document.getElementById('mic-meter')  as HTMLElement;
const gazeBtn    = document.getElementById('gaze-btn')   as HTMLButtonElement;
const smoothBtn  = document.getElementById('smooth-btn') as HTMLButtonElement;
const poseBtn    = document.getElementById('pose-btn')   as HTMLButtonElement;

const status = createStatus(statusEl);
status.set('初期化中…');

// ==================== three.js ====================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1a1a1a);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 30);
camera.position.set(0, 1.4, 1.8);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(1, 2, 1.5);
scene.add(dirLight);
scene.add(new THREE.GridHelper(4, 10, 0x444444, 0x333333));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.3, 0);
controls.update();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ==================== state ====================
let currentVRM: VRM | null = null;
let latestFaceRig: FaceRig | null = null;
let latestPoseRig: PoseRig | null = null;

const opts: AppOptions = { mic: false, gaze: true, smooth: true, pose: true };
const faceFilters = createRigFilterSet();
const poseFilters = createPoseFilterSet();
const mic = new MicTracker();

// Webcam は CSS で scaleX(-1) しているため mirror=true
const MIRROR_WEBCAM = true;

// Phase 3-b: 脚とヒップ位置の追従強度。
//  - legStrength: webcam が膝以下を映さないセットアップなら低めに (0.2 程度)
//  - hipPosStrength: Kalidokit の hip 位置は大きく振れやすいので 0.3 程度
const LEG_STRENGTH = 1.0;
const HIP_POS_STRENGTH = 0.3;

// ==================== VRM loading ====================
async function loadVRM(url: string, label?: string): Promise<void> {
  status.set(`VRM 読込中: ${label ?? url}`);
  try {
    const { vrm, displayName, versionLabel } = await loadVRMFromUrl(url);
    if (currentVRM) disposeVRM(scene, currentVRM);
    scene.add(vrm.scene);
    currentVRM = vrm;
    status.set(`VRM 読込完了: <b>${displayName}</b> (VRM ${versionLabel})`);
  } catch (e) {
    status.set(`VRM 読込失敗: ${(e as Error).message}`);
  }
}

wireDropZone({
  dropEl,
  inputEl,
  onFile: (file) => loadVRM(URL.createObjectURL(file), file.name),
  onInvalid: (reason) => status.set(reason),
});

// ==================== Controls ====================
let trackerRef: Awaited<ReturnType<typeof createTracker>> | null = null;
const ctrl = wireControls(
  { micBtn, micMeter: micMeterEl, gazeBtn, smoothBtn, poseBtn },
  opts,
  {
    onMicToggle: async (next) => {
      if (next) {
        try { await mic.enable(); return true; }
        catch (e) { status.set(`マイク起動失敗: ${(e as Error).message}`); return false; }
      }
      mic.disable();
      return true;
    },
    onGazeToggle: () => { /* applyRig reads opts.gaze live */ },
    onSmoothToggle: () => {
      resetRigFilterSet(faceFilters);
      resetPoseFilterSet(poseFilters);
    },
    onPoseToggle: (next) => {
      trackerRef?.enablePose(next);
      if (!next) latestPoseRig = null;
      resetPoseFilterSet(poseFilters);
    },
  },
);

// ==================== Animation loop ====================
const clock = new THREE.Clock();
function animate(): void {
  const dt = clock.getDelta();
  if (opts.mic) {
    const lv = mic.update();
    ctrl.setMicLevel(lv);
  }
  if (currentVRM) {
    const now = performance.now() / 1000;
    applyRig(currentVRM, latestFaceRig, { ...opts, micLevel: mic.level }, faceFilters, now);
    if (opts.pose && latestPoseRig) {
      const rotations = computePoseBoneRotations(
        latestPoseRig,
        { smooth: opts.smooth, mirror: MIRROR_WEBCAM, legStrength: LEG_STRENGTH },
        poseFilters,
        now,
      );
      applyBoneRotations(currentVRM, rotations, opts.smooth);

      const hipPos = computeHipPosition(
        latestPoseRig,
        { smooth: opts.smooth, mirror: MIRROR_WEBCAM, hipPosStrength: HIP_POS_STRENGTH },
        poseFilters,
        now,
      );
      applyHipPosition(currentVRM, hipPos, opts.smooth);
    } else if (currentVRM) {
      // pose OFF の時は hip 位置を 0 にゆっくり戻す
      applyHipPosition(currentVRM, null, opts.smooth);
    }
    currentVRM.update(dt);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ==================== Boot ====================
async function boot(): Promise<void> {
  // 1. 既定 VRM (samples/sample.vrm) があれば自動読込
  try {
    const resp = await fetch('/samples/sample.vrm', { method: 'HEAD' });
    if (resp.ok) await loadVRM('/samples/sample.vrm', 'samples/sample.vrm');
    else status.set('VRM ファイルを画面左下にドラッグ&ドロップしてください。');
  } catch {
    status.set('VRM ファイルを画面左下にドラッグ&ドロップしてください。');
  }

  // 2. Face + Pose tracker 起動
  try {
    trackerRef = await createTracker(videoEl, {
      onFaceRig: (rig) => { latestFaceRig = rig; },
      onPoseRig: (rig) => { latestPoseRig = rig; },
      onError: (err, phase) => {
        console.error(`[tracker:${phase}]`, err);
        status.set(`トラッキングエラー (${phase}): ${(err as Error).message ?? err}`);
      },
    });
    trackerRef.enablePose(opts.pose);
    await trackerRef.start();
  } catch (e) {
    status.set(`カメラ起動失敗: ${(e as Error).message}<br />ブラウザのカメラ許可を確認してください。`);
    return;
  }

  animate();
}

boot();
