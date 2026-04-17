import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VRM } from '@pixiv/three-vrm';

import type { FaceRig, PoseRig, Settings } from './types';
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
import { wireSettingsPanel } from './ui/settingsPanel';
import { loadSettings, saveSettings, clearSettings, DEFAULT_SETTINGS } from './core/storage/settings';

// ==================== Settings (Phase 4) ====================
const settings: Settings = loadSettings();
const save = () => saveSettings(settings);

// ==================== DOM ====================
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const statusEl   = $<HTMLElement>('status');
const videoEl    = $<HTMLVideoElement>('webcam');
const dropEl     = $<HTMLElement>('drop-zone');
const inputEl    = $<HTMLInputElement>('vrm-input');
const micBtn     = $<HTMLButtonElement>('mic-btn');
const micMeterEl = $<HTMLElement>('mic-meter');
const gazeBtn    = $<HTMLButtonElement>('gaze-btn');
const smoothBtn  = $<HTMLButtonElement>('smooth-btn');
const poseBtn    = $<HTMLButtonElement>('pose-btn');

const status = createStatus(statusEl);
status.set('初期化中…');

// ==================== three.js ====================
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 30);
camera.position.set(0, 1.4, 1.8);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(1, 2, 1.5);
scene.add(dirLight);
const grid = new THREE.GridHelper(4, 10, 0x444444, 0x333333);
scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.3, 0);
controls.update();

function applyBackgroundMode(): void {
  if (settings.transparentBg) {
    renderer.setClearColor(0x000000, 0);
    grid.visible = false;
  } else {
    renderer.setClearColor(0x1a1a1a, 1);
    grid.visible = true;
  }
}
applyBackgroundMode();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ==================== state ====================
let currentVRM: VRM | null = null;
let latestFaceRig: FaceRig | null = null;
let latestPoseRig: PoseRig | null = null;

const faceFilters = createRigFilterSet();
const poseFilters = createPoseFilterSet();
const mic = new MicTracker();

const MIRROR_WEBCAM = true;

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

// ==================== Controls (toggles) ====================
let trackerRef: Awaited<ReturnType<typeof createTracker>> | null = null;

// 初期トグル状態は settings から復元
const toggles = { ...settings.toggles };

const ctrl = wireControls(
  { micBtn, micMeter: micMeterEl, gazeBtn, smoothBtn, poseBtn },
  toggles,
  {
    onMicToggle: async (next) => {
      if (next) {
        try { await mic.enable(); settings.toggles.mic = true; save(); return true; }
        catch (e) { status.set(`マイク起動失敗: ${(e as Error).message}`); return false; }
      }
      mic.disable();
      settings.toggles.mic = false; save();
      return true;
    },
    onGazeToggle: (v) => { settings.toggles.gaze = v; save(); },
    onSmoothToggle: (v) => {
      settings.toggles.smooth = v; save();
      resetRigFilterSet(faceFilters);
      resetPoseFilterSet(poseFilters);
    },
    onPoseToggle: (v) => {
      settings.toggles.pose = v; save();
      trackerRef?.enablePose(v);
      if (!v) latestPoseRig = null;
      resetPoseFilterSet(poseFilters);
    },
  },
);

// ==================== Settings panel (Phase 4) ====================
const settingsPanel = wireSettingsPanel(
  {
    root: $<HTMLElement>('settings'),
    legStrengthInput:    $<HTMLInputElement>('legStrength'),
    legStrengthValue:    $<HTMLElement>('legStrength-val'),
    hipPosStrengthInput: $<HTMLInputElement>('hipPosStrength'),
    hipPosStrengthValue: $<HTMLElement>('hipPosStrength-val'),
    micSensitivityInput: $<HTMLInputElement>('micSensitivity'),
    micSensitivityValue: $<HTMLElement>('micSensitivity-val'),
    transparentBgInput:  $<HTMLInputElement>('transparentBg'),
    resetBtn:            $<HTMLButtonElement>('reset-settings'),
  },
  settings,
  {
    onLegStrength:    (v) => { settings.legStrength    = v; save(); },
    onHipPosStrength: (v) => { settings.hipPosStrength = v; save(); },
    onMicSensitivity: (v) => { settings.micSensitivity = v; save(); },
    onTransparentBg:  (v) => { settings.transparentBg  = v; save(); applyBackgroundMode(); },
    onReset: () => {
      Object.assign(settings, DEFAULT_SETTINGS, { toggles: { ...DEFAULT_SETTINGS.toggles } });
      clearSettings();
      settingsPanel.refresh(settings);
      applyBackgroundMode();
      status.set('設定を既定値にリセットしました');
    },
  },
);

// ==================== Animation loop ====================
const clock = new THREE.Clock();
function animate(): void {
  const dt = clock.getDelta();
  if (toggles.mic) {
    const lv = mic.update(settings.micSensitivity);
    ctrl.setMicLevel(lv);
  }
  if (currentVRM) {
    const now = performance.now() / 1000;
    applyRig(currentVRM, latestFaceRig, { ...toggles, micLevel: mic.level }, faceFilters, now);
    if (toggles.pose && latestPoseRig) {
      const rotations = computePoseBoneRotations(
        latestPoseRig,
        { smooth: toggles.smooth, mirror: MIRROR_WEBCAM, legStrength: settings.legStrength },
        poseFilters,
        now,
      );
      applyBoneRotations(currentVRM, rotations, toggles.smooth);

      const hipPos = computeHipPosition(
        latestPoseRig,
        { smooth: toggles.smooth, mirror: MIRROR_WEBCAM, hipPosStrength: settings.hipPosStrength },
        poseFilters,
        now,
      );
      applyHipPosition(currentVRM, hipPos, toggles.smooth);
    } else {
      applyHipPosition(currentVRM, null, toggles.smooth);
    }
    currentVRM.update(dt);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ==================== Boot ====================
async function boot(): Promise<void> {
  try {
    const resp = await fetch('/samples/sample.vrm', { method: 'HEAD' });
    if (resp.ok) await loadVRM('/samples/sample.vrm', 'samples/sample.vrm');
    else status.set('VRM ファイルを画面左下にドラッグ&ドロップしてください。');
  } catch {
    status.set('VRM ファイルを画面左下にドラッグ&ドロップしてください。');
  }

  try {
    trackerRef = await createTracker(videoEl, {
      onFaceRig: (rig) => { latestFaceRig = rig; },
      onPoseRig: (rig) => { latestPoseRig = rig; },
      onError: (err, phase) => {
        console.error(`[tracker:${phase}]`, err);
        status.set(`トラッキングエラー (${phase}): ${(err as Error).message ?? err}`);
      },
    });
    trackerRef.enablePose(toggles.pose);
    await trackerRef.start();
  } catch (e) {
    status.set(`カメラ起動失敗: ${(e as Error).message}<br />ブラウザのカメラ許可を確認してください。`);
    return;
  }

  animate();
}

boot();
