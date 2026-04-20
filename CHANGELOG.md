# Changelog

All notable changes to VCam will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/Fuwaaaaaa/VCam/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/Fuwaaaaaa/VCam/releases/tag/v0.1.0-beta.1
