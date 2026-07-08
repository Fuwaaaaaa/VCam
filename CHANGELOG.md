# Changelog

All notable changes to VCam will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **VCam VRM Converter (Unity エディタ拡張)**: VRChat の改変済みアバターを
  VCam で読み込める VRM 0.x に変換する無料ツールを `unity/jp.vcam.vrm-converter/`
  に追加。有料の VRM Converter for VRChat (500 円) が不要に。
  - ウィザード UI (アバター選択 → ライセンス確認 → 検証 → 設定 → エクスポート)。
    元アバターには触れず複製に対して変換する非破壊設計
  - viseme 15 種 → VRM 5 母音、まばたき (Blink_L/R は名前ヒューリスティック)、
    視線、ViewPosition → FirstPerson の自動マッピング
  - lilToon → MToon のマテリアル近似変換 (影/アウトライン/エミッション/透過)、
    Poiyomi 最小変換 (ロック検出)、汎用フォールバック
  - VRCPhysBone → VRMSpringBone 近似変換 (係数調整 UI 付き、カプセルコライダは
    球近似)。EditMode ユニットテスト同梱
  - 配布は UPM git URL (`?path=unity/jp.vcam.vrm-converter`)。要 UniVRM v0.128.0+
- `docs/qa/VRM_CONVERTER_QA.md` — 変換ツールの手動 QA チェックリスト
- **録画 + スクショ機能 (T-008)**: `#controls` に 📸 スクショ / ⏺ 録画開始 ボタン
  を追加。スクショは `canvas.toBlob` で PNG、録画は `canvas.captureStream()` +
  `MediaRecorder` で webm (vp9 優先、vp8 / webm フォールバック)。ファイル名は
  `vcam-YYYYMMDD-HHMMSS.{png,webm}`。録画中はボタンが `#E8482C` warn 色で
  ブリージング点滅 (DESIGN.md 準拠)。MediaRecorder 非対応環境では録画ボタン
  が disable される。
- `src/core/capture/screenshot.ts` — `captureCanvasPNG(canvas)` + `downloadBlob`
  + `defaultFilename`。
- `src/core/capture/recorder.ts` — `createRecorder(canvas, fps=30)` / `isRecordingSupported()`。
- **デバイス選択 UI (T-007)**: 複数カメラ / 複数マイクを画面左「⚙ 設定」パネル
  の `<select>` から切替可能に。選択値は localStorage (`vcam:settings:v1` の
  `cameraDeviceId` / `micDeviceId`) に永続化。`navigator.mediaDevices.devicechange`
  を監視して、USB カメラの抜き差しにも追従。
- `src/core/devices/enumerate.ts` — `listDevices()` が cameras/mics を分離して返す。
  permission 取得前で label が空の場合は「カメラ 1」「マイク 1」のフォールバック。
- `Tracker.switchCamera(deviceId)` — 実行中のストリームを張り直して別カメラへ切替。

### Security

- **リモートピア入力検証と XSS 修正**: `isPeerMessageV1` が受信メッセージ全
  フィールドの形状・数値有限性 (NaN/Infinity 拒否) を検証し、細工メッセージによる
  描画崩壊やアニメーションループ停止 (受信側 DoS) を防止。多層防御として `animate()`
  をフレーム単位 try/catch でガード。ピア ID (`src/ui/peerPanel.ts`) と不正ファイル名
  (dropZone 経路) の innerHTML 未エスケープ経路を修正 (`escapeHtml` / DOM API 化)。

### Fixed

- リモートアバターの VRM ロード中切断・同一ピア二重接続で発生していたゴースト /
  孤児アバターの残留 (シーンに残り dispose 不能、メモリ / GPU リーク) を修正。
  `RemoteAvatarScene.addPeer` に in-flight ロード追跡と await 後の生存再確認を追加。

### Changed

- `docs/VRCHAT_TO_VRM.md` / `README.md` — VRChat アバターの変換手順を有料ツール
  前提から VCam VRM Converter 前提に全面改訂
- Tracker の frame driver を `@mediapipe/camera_utils` (`window.Camera`) から
  独自の `getUserMedia` + rAF ループに置換。deviceId 指定を可能にするため。
  外部 CDN 依存が 1 本減少 (`camera_utils.js` / `__cameraUtilsCdnFailed` フック
  を削除)。`MicTracker.enable()` に `{ deviceId }` オプションを追加。

### Pending

- **T-001 part 2/2** (実 VRM ファイル同梱): `public/samples/sample.vrm`
  に CC0 の VRoid Studio サンプル (例: AvatarSample_F) を配置し、
  `docs/SAMPLE_VRM_ATTRIBUTION.md` の sample.vrm 行を埋め、
  `tests/e2e/sample-vrm.spec.ts` の `test.skip` を `test` に戻す。
  人手 (ライセンス確認 + ファイル取得) を要するため次回リリースに繰越。

---

## [0.1.0-beta.2] — 2026-04-20

トラッキング起動失敗の可視化 (T-003) を中心とした patch リリース。
ライセンスファイルとサンプル VRM 同梱の足回りも整備。

### Added

- **サンプル VRM 同梱の足回り (T-001 scaffold)**: `public/samples/` ディレクトリ
  と Tauri `bundle.resources` 設定を準備。`docs/SAMPLE_VRM_ATTRIBUTION.md` テンプ
  レを追加し、再配布可能な VRM が後続 PR で配置された時点で自動 load される。
  E2E テスト `tests/e2e/sample-vrm.spec.ts` は `test.skip` で scaffold 済。
- **CDN/モデル読み込み失敗の通知 (T-003)**: MediaPipe (`face_mesh.js` / `pose.js`
  / `camera_utils.js`) の CDN script 本体が 404 やネットワーク失敗で読み込めな
  かった場合、起動時に status パネルに「顔認識ライブラリのダウンロードに失敗
  しました」と表示する (従来はサイレント失敗)。
- tflite/wasm の遅延ロード失敗を 8 秒タイムアウトで検知し、「顔認識モデルの読
  み込みに失敗しました」を status へ通知。`onResults` の発火有無で「ライブラリ
  未ロード」と「カメラに顔が映っていない」を区別。
- `FaceProcessor` / `PoseProcessor` / `Tracker` に `isActive()` /
  `waitForActive(timeoutMs)` API を追加。
- E2E テスト `tests/e2e/cdn-failure.spec.ts` で CDN abort 時の status 文言を検証。

### Investigated and dropped

- **T-004** (applyRig / remoteAvatar の新フレーム seq ガード): 事前検証で仮説
  が falsified。`OneEuroFilter` は同値連続呼出で derivative が退化せず、追従
  劣化は発生しないため不要と判定。`tests/unit/OneEuroFilter.test.ts` に
  regression test を追加。

### Project meta

- `LICENSE` (MIT) を repo root に追加 (`package.json` / `Cargo.toml` /
  `tauri.conf.json` の license フィールドも同期)。
- `CLAUDE.md` (AI agent 指示) と `DESIGN.md` (デザインシステム) を追加。
- `docs/SAMPLE_VRM_ATTRIBUTION.md` 候補節を 3 オプションの調査結果に置換
  (CC0 サンプル / AliciaSolid / VRoid Hub case-by-case)。

### Build & test

- 79 unit tests / 7 E2E tests (2 skipped pending T-001 part 2/2)
- TypeScript strict mode で型チェック全通

---

## [0.1.0-beta.1] — 2026-04-17

**初の beta リリース**。Web カメラで顔・体の動きを VRM アバターに反映させる
デスクトップアプリ。Windows / macOS / Linux 向け。

### Added

#### 顔・表情トラッキング (Phase 2-A / 2-B)
- MediaPipe Face Mesh + Kalidokit で頭・首の回転を取得
- 左右独立のまばたき (eye.l / eye.r → blinkLeft / blinkRight)
- AIUEO 5 母音の口形 BlendShape 反映
- 目線追従 (lookLeft / Right / Up / Down)
- 眉 (brow) → surprised / sad 表情への振り分け
- Web Audio API ベースのマイク音量リップシンク (顔の口形と max ブレンド)
- One Euro Filter による全軸スムージング (ジッタ除去)

#### 全身トラッキング (Phase 3-a / 3-b)
- MediaPipe Pose + Kalidokit Pose で上半身のボーン回転
- 背骨 (Spine) + ヒップ (Hips) + 左右の上腕 / 前腕 / 手首
- 下半身対応: 太もも / 膝 (4 ボーン)
- Hips 位置オフセット (X/Y のみ、Z は webcam 深度不安定のため除外)
- 床突き抜け防止 clamp (Y: -0.2m 〜 +0.5m)
- 脚用に独立したフィルタ (安定重視の低 cutoff 設定)
- `legStrength` / `hipPosStrength` 調整スライダ

#### 設定 UI (Phase 4)
- localStorage 永続化 (`vcam:settings:v1` キー)
- 4 つの ON/OFF トグルパネル (マイク / 目線 / スムージング / ポーズ)
- 設定スライダパネル (脚強度・Hip 強度・マイク感度・Bloom 強度)
- 透過背景トグル (OBS クロマキー不要で合成)
- 既定値リセットボタン

#### デスクトップ化 (Phase 5)
- Tauri 2 ベースの単一 exe / dmg / AppImage 配布
- crate 名: `vcam` / identifier: `dev.vcam.app`
- GitHub Actions 自動リリースワークフロー (Win / macOS x64 / macOS ARM / Linux)

#### マルチバース (Phase E)
- WebRTC / PeerJS による P2P 通信
- 自分の Peer ID 表示 + コピーボタン
- 相手の Peer ID 入力で接続
- 接続中ピア一覧と切断ボタン
- rig 送信は 20 Hz、数値は 4 桁丸めで帯域節約
- 各ピアのアバターを X 軸 1.5m 間隔で自動配置

#### AR 演出 (Phase F)
- UnrealBloomPass によるグロー効果
- 透過背景 (renderer.alpha + clearcolor=0)
- Bloom 強度スライダ (0〜3)
- `@mediapipe/selfie_segmentation` の CDN 読込 (本格統合は今後)

#### ドキュメント
- `README.md` — ユーザ向けクイックスタート + 開発者向け折りたたみ
- `docs/VRCHAT_TO_VRM.md` — VRChat アバターを VRM に変換する手順ガイド
- `TODOS.md` — 以前のエンジニアリングレビューで特定された未実装項目

### Build & test

- TypeScript strict mode で型チェック全通
- 74 の単体テスト (Vitest + happy-dom)
  - OneEuroFilter, clamp, applyExpressions, applyHead, applyPose,
    micLevel, rigSerialize, settings
- 5 の E2E テスト (Playwright + Chromium)
- Vite 5 プロダクションビルド

### Known issues / limitations

- **VRM モデルは同梱されていません**。[VRoid Hub](https://hub.vroid.com/) 等
  から入手して読み込んでください
- Selfie Segmentation は CDN 読み込み済みだが runtime 未結線
  (背景の人物切り抜きは今後のリリース)
- Tauri ビルドは未署名 (Windows SmartScreen の警告、macOS 公証なし)
- PeerJS は公式クラウドシグナリング依存 (商用利用時は自前シグナリング推奨)
- ラージ PeerJS 接続 (5+ peers) で送信コストが N^2 に
- 多くの VRChat 向けアバターの規約は VRM 変換を禁止しています。変換の際は
  必ずライセンスをご確認ください
- 下半身が web カメラに映らないセットアップでは「脚の強度」を 0.2〜0.3 に
  下げるのを推奨

### Hardware requirements

- Web カメラ (720p 以上推奨)
- マイク (オプション)
- GPU は統合グラフィックスでも動作 (ただし MediaPipe GPU アクセラレーション
  対応 GPU 推奨)
- 本ビルドはコード署名なしのため、Windows SmartScreen / macOS Gatekeeper で
  警告が出ます (右クリック「開く」で回避)

---

[Unreleased]: https://github.com/Fuwaaaaaa/VCam/compare/v0.1.0-beta.2...HEAD
[0.1.0-beta.2]: https://github.com/Fuwaaaaaa/VCam/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/Fuwaaaaaa/VCam/releases/tag/v0.1.0-beta.1
