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
import { listDevices } from './core/devices/enumerate';
import { createStatus } from './ui/status';
import { wireDropZone } from './ui/dropZone';
import { wireControls } from './ui/controls';
import { wireSettingsPanel } from './ui/settingsPanel';
import { wirePeerPanel } from './ui/peerPanel';
import { loadSettings, saveSettings, clearSettings, DEFAULT_SETTINGS } from './core/storage/settings';
import { createPeerSession } from './core/net/peerSession';
import { encodeMessage } from './core/net/rigSerialize';
import { RemoteAvatarScene } from './core/avatar/remoteAvatar';
import { PostFX } from './core/render/postEffects';

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

// Phase F: post-processing (Bloom)
const postFx = new PostFX(renderer, scene, camera);
postFx.enabled = settings.bloom ?? false;
postFx.setStrength(settings.bloomStrength ?? 0.8);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  postFx.resize(window.innerWidth, window.innerHeight);
});

// ==================== state ====================
let currentVRM: VRM | null = null;
let latestFaceRig: FaceRig | null = null;
let latestPoseRig: PoseRig | null = null;
let latestHipPos: { x: number; y: number } | null = null;

const faceFilters = createRigFilterSet();
const poseFilters = createPoseFilterSet();
const mic = new MicTracker();

const MIRROR_WEBCAM = true;

// ==================== Phase E: Multiverse ====================
// currentVrmUrl が無いときは public/samples のプレースホルダを使う。
// まだロード前のピアが来た場合は現在の自分の VRM を複製して表示。
const remoteScene = new RemoteAvatarScene(scene, '/samples/sample.vrm');

const peerUI = wirePeerPanel(
  {
    panel:        $<HTMLElement>('multiverse'),
    ownIdInput:   $<HTMLInputElement>('own-peer-id'),
    copyBtn:      $<HTMLButtonElement>('copy-peer-id'),
    peerIdInput:  $<HTMLInputElement>('peer-id'),
    connectBtn:   $<HTMLButtonElement>('connect-peer'),
    peersList:    $<HTMLElement>('peers-list'),
  },
  {
    onConnect:    (id) => peer.connectTo(id),
    onDisconnect: (id) => peer.disconnectFrom(id),
  },
);

const peer = createPeerSession({
  onOwnId: (id) => {
    peerUI.setOwnId(id);
    console.log('[peer] own id:', id);
  },
  onPeerConnect: async (id) => {
    await remoteScene.addPeer(id);
    peerUI.addPeer(id);
    status.set(`ピアが接続: <code>${id.slice(0, 8)}…</code>`);
  },
  onPeerDisconnect: (id) => {
    remoteScene.removePeer(id);
    peerUI.removePeer(id);
  },
  onPeerMessage: (id, msg) => {
    remoteScene.receive(id, msg);
    if (msg.hipPos !== undefined) { /* 追加: タイムスタンプ記録など将来 */ }
  },
  onError: (err) => console.warn('[peer] error:', err),
});

// 送信は 20 Hz (50ms) に絞る (WebRTC data channel 負荷軽減)
const SEND_INTERVAL_MS = 50;
let lastSendAt = 0;

// ==================== VRM loading ====================
async function loadVRM(url: string, label?: string): Promise<void> {
  status.set(`VRM 読込中: ${label ?? url}`);
  try {
    const { vrm, displayName, versionLabel } = await loadVRMFromUrl(url);
    if (currentVRM) disposeVRM(scene, currentVRM);
    scene.add(vrm.scene);
    currentVRM = vrm;
    remoteScene.setVrmUrl(url);
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
        try { await mic.enable({ deviceId: settings.micDeviceId }); settings.toggles.mic = true; save(); return true; }
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
    bloomInput:          $<HTMLInputElement>('bloom'),
    bloomStrengthInput:  $<HTMLInputElement>('bloomStrength'),
    bloomStrengthValue:  $<HTMLElement>('bloomStrength-val'),
    resetBtn:            $<HTMLButtonElement>('reset-settings'),
  },
  settings,
  {
    onLegStrength:    (v) => { settings.legStrength    = v; save(); },
    onHipPosStrength: (v) => { settings.hipPosStrength = v; save(); },
    onMicSensitivity: (v) => { settings.micSensitivity = v; save(); },
    onTransparentBg:  (v) => { settings.transparentBg  = v; save(); applyBackgroundMode(); },
    onBloom:          (v) => { settings.bloom = v; save(); postFx.enabled = v; },
    onBloomStrength:  (v) => { settings.bloomStrength = v; save(); postFx.setStrength(v); },
    onReset: () => {
      Object.assign(settings, DEFAULT_SETTINGS, { toggles: { ...DEFAULT_SETTINGS.toggles } });
      clearSettings();
      settingsPanel.refresh(settings);
      applyBackgroundMode();
      postFx.enabled = settings.bloom ?? false;
      postFx.setStrength(settings.bloomStrength ?? 0.8);
      status.set('設定を既定値にリセットしました');
    },
  },
);

// ==================== Device selection (T-007) ====================
const cameraSelect = $<HTMLSelectElement>('cameraSelect');
const micSelect    = $<HTMLSelectElement>('micSelect');

async function refreshDeviceSelects(): Promise<void> {
  const { cameras, mics } = await listDevices();
  const fill = (sel: HTMLSelectElement, entries: { deviceId: string; label: string }[], selected: string | null): void => {
    sel.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = '（既定）';
    sel.appendChild(def);
    for (const e of entries) {
      const opt = document.createElement('option');
      opt.value = e.deviceId;
      opt.textContent = e.label;
      sel.appendChild(opt);
    }
    sel.value = selected && entries.some((e) => e.deviceId === selected) ? selected : '';
  };
  fill(cameraSelect, cameras, settings.cameraDeviceId ?? null);
  fill(micSelect,    mics,    settings.micDeviceId ?? null);
}

cameraSelect.addEventListener('change', async () => {
  const id = cameraSelect.value || null;
  settings.cameraDeviceId = id;
  save();
  if (trackerRef) {
    try { await trackerRef.switchCamera(id); }
    catch (e) { status.set(`カメラ切替失敗: ${(e as Error).message}`); }
  }
});

micSelect.addEventListener('change', async () => {
  const id = micSelect.value || null;
  settings.micDeviceId = id;
  save();
  if (mic.enabled) {
    mic.disable();
    try { await mic.enable({ deviceId: id }); }
    catch (e) { status.set(`マイク切替失敗: ${(e as Error).message}`); }
  }
});

if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', () => {
    refreshDeviceSelects().catch(() => {});
  });
}

// permission 取得前でも deviceId だけは列挙される (label は空)。初期化時に一度呼ぶ。
refreshDeviceSelects().catch(() => {});

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
      latestHipPos = hipPos;
      applyHipPosition(currentVRM, hipPos, toggles.smooth);
    } else {
      latestHipPos = null;
      applyHipPosition(currentVRM, null, toggles.smooth);
    }
    currentVRM.update(dt);
  }

  // リモートアバター更新
  remoteScene.tick(performance.now() / 1000, dt);

  // ピアへのブロードキャスト (20 Hz)
  const nowMs = performance.now();
  if (peer.connectedPeers().length > 0 && nowMs - lastSendAt >= SEND_INTERVAL_MS) {
    lastSendAt = nowMs;
    peer.send(encodeMessage({
      face: latestFaceRig,
      pose: toggles.pose ? latestPoseRig : null,
      hipPos: latestHipPos,
      micLevel: mic.level,
    }));
  }

  postFx.render(scene, camera);
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

  // CDN script 本体の 404/ネットワーク失敗を即時判定 (index.html の onerror フック)
  if (window.__faceMeshCdnFailed || window.__poseCdnFailed) {
    status.set('顔認識ライブラリのダウンロードに失敗しました。ネットワークを確認のうえページを再読込してください。');
    return;
  }

  try {
    trackerRef = await createTracker(videoEl, {
      onFaceRig: (rig) => { latestFaceRig = rig; },
      onPoseRig: (rig) => { latestPoseRig = rig; },
      onError: (err, phase) => {
        console.error(`[tracker:${phase}]`, err);
        status.set(`トラッキングエラー (${phase}): ${(err as Error).message ?? err}`);
      },
    }, { deviceId: settings.cameraDeviceId });
    trackerRef.enablePose(toggles.pose);
    await trackerRef.start();
    // permission 取得後は label が埋まるのでデバイスリストを再同期
    refreshDeviceSelects().catch(() => {});
  } catch (e) {
    status.set(`カメラ起動失敗: ${(e as Error).message}<br />ブラウザのカメラ許可を確認してください。`);
    return;
  }

  // tflite/wasm の遅延ロード失敗を 8 秒で検知 (animate 開始を遅延させないよう non-blocking)
  trackerRef.waitForFaceActive(8000).then((ok) => {
    if (!ok) status.set('顔認識モデルの読み込みに失敗しました。ネットワークを確認のうえページを再読込してください。');
  });
  if (toggles.pose) {
    trackerRef.waitForPoseActive(8000).then((ok) => {
      if (!ok) status.append('<br />ポーズ認識モデルの読み込みに失敗しました（顔のみで継続します）。');
    });
  }

  animate();
}

boot();
