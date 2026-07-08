# Changelog — VCam VRM Converter

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-06-12

### Added

- 初回リリース。VRChat アバター → VRM 0.x 変換ウィザード
  (メニュー `VCam/VRChat → VRM 変換ウィザード...`)
- 基本変換: Humanoid 検証、viseme → A/I/U/E/O、まばたき (Blink_L/R は名前
  ヒューリスティック)、視線、ViewPosition → FirstPerson
- マテリアル変換: lilToon → MToon (影色/アウトライン/エミッション/リム/
  MatCap 加算/透過/カットアウト)、Poiyomi 最小変換 (ロック検出付き)、
  汎用フォールバック
- PhysBone → SpringBone 近似変換 (pull/spring/gravity/immobile/limit、
  カプセルコライダの球近似、係数の詳細設定 UI)
- ライセンス確認ゲート、変換前検証レポート、VRM メタ既定「再配布禁止」
- EditMode ユニットテスト (変換式・マッピング表・名前推定)

### Notes

- 検証済み環境: Unity 2022.3 LTS / UniVRM v0.128.0 / VRChat SDK3 Avatars
- CI には組み込まない (リポジトリ CI は Vite/TS のみ)。手動 QA は
  `docs/qa/VRM_CONVERTER_QA.md`
