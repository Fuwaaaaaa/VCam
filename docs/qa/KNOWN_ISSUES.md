# 既知の未解決問題 (KNOWN ISSUES)

2026-07-07 のコードレビューで検出。**Web/TS 側の重大・XSS・レースは修正済み**
(CHANGELOG の Security / Fixed 参照)。本ファイルは、修正にこのリポジトリ外の
環境 (Unity + VRChat SDK + UniVRM) や Tauri 実ビルド検証を要するため今回のパッチで
着手しなかった項目を記録する。着手時は必ず該当環境で実ビルド/実行して検証すること。

---

## 🔴 CRITICAL — Unity パッケージが対象環境でコンパイルできない

**C1.** `unity/jp.vcam.vrm-converter/Editor/VCam.VrmConverter.Editor.asmdef`
`references` が `["VRM","VRM.Editor","UniGLTF"]` のみで **VRChat SDK のアセンブリ
(`VRCSDKBase` / `VRC.SDK3A` / `VRC.Dynamics` 等) を参照していない**。
`DescriptorExtractor.cs` 等は `#if VCAM_HAS_VRCSDK` 下で `using VRC.*` を使うが、
`versionDefines` は `#define` を足すだけで**アセンブリ参照は追加しない**。

- 症状: README 通り VRChat SDK3 Avatars を入れると `VCAM_HAS_VRCSDK` が定義され、
  Editor アセンブリ全体が `CS0246` でコンパイル失敗 → `VCam` メニューすら出ない。
  逆に SDK 未導入の素の環境では (VRC コードが `#if` で無効化され) 通ってしまうため、
  **対象構成で一度もビルドされていない**ことがほぼ確実。
- 対応: asmdef の `references` に VRChat SDK / UniVRM 各アセンブリ名を追加し、
  SDK 有無どちらでもコンパイルが通るよう versionDefines と整合させる。
  → **要 Unity 2022.3 + VRChat SDK3 Avatars + UniVRM 0.128.0+ での実ビルド検証。**
- 現状の含意: **v0.1.0 の変換ツールは実環境で動作未検証**。配布前に C1 の解消と
  `docs/qa/VRM_CONVERTER_QA.md` の手動 QA 完走が必須。

---

## 🟠 Unity 変換ロジックの不具合・近似 (要実アバター QA)

| ID | 箇所 | 内容 |
|----|------|------|
| M3 | `Editor/Dynamics/PhysBoneToSpringBoneConverter.cs:134-150` `PickChainRoots` | `rootTransform` が Humanoid ボーン (Hips/Spine 等) だと再帰が Humanoid 子孫を降りて非 Humanoid の子を軒並み spring root 化 → 手持ち小物や髪飾りなど無関係オブジェクトが変換後に揺れる |
| M4 | `Editor/Expressions/ExpressionMapper.cs:217-221` | `leftEye!=null || rightEye!=null` で入るブロック内で `OffsetOnTransform.Create()` を無条件呼び出し → 片目のみのアバターで null 参照し変換中断 |
| M5 | `unity/build-unitypackage.ps1:78-80` | `Set-Content -Encoding ascii` が `guid\r\n` を出力し、bsdtar `-T` が末尾 `\r` をファイル名扱い → クリーン環境で `.unitypackage` ビルド失敗の恐れ。`-NoNewline` + LF 明示か tar への `--files-from` 渡し方を見直す |
| M7 | `Editor/Materials/MToonMaterialFactory.cs:21-30` + `MaterialConverterRegistry.cs` | `ShaderAvailable` があるのに未使用で、`CreateBase` は `VRM/MToon` 不在時に throw → 一部 `.mat` を書いた後に pipeline 中断し孤児アセット化。事前に `ShaderAvailable` を確認して早期エラー化すべき |
| M8 | `Editor/ConverterWindow.cs:187` | 事前検証と同じ `ValidationReport` を変換にも渡し追記 → パネル汚染・重複・post-hoc error で変換ボタン無効化。変換用は別インスタンスにする |
| M9 | `Editor/Extraction/DescriptorExtractor.cs:68-76` `AngleOf` | `Quaternion.Angle(identity, (0,0,0,0))` が 180° を返し閾値超で「実測角」採用 → eye look 未設定 (0 クォータニオン) のアバターで目が過回転。ゼロクォータニオンを identity 扱いにする |

## 🟡 Unity 物理近似 (テストで意図確認済み・既定値が要調整)

- **L9** `Editor/Dynamics/SpringBoneParameterMap.cs`: `drag = spring` (springy ほど減衰大の逆方向)、
  `limitCoef` が stiffness/drag 両方を下げる、負 gravity を 0 クランプ。いずれも
  `SpringBoneParameterMapTests` で固定されているが既定値が直感に反する (髪が過減衰)。
  実アバター QA での係数チューニング前提。
- **L10** 小物: `VrmExportRunner.cs:30-43` の `VRMMetaObject` が保存も破棄もされずリーク /
  シーンに残す複製が PoseFreeze されず export `.vrm` と見た目不一致 /
  `.unitypackage` に `Tests/` 同梱 / `BlinkShapeNameMatcher` の半角カナ左右非対称。

---

## 🟡 Web/デスクトップ — 別途検証を要する項目

- **L1 (Tauri CSP)** `src-tauri/tauri.conf.json` の `app.security.csp` が `null`。
  実 XSS 経路 (M1/M2) は修正済みのため多層防御に格下げされたが、本番配布前に CSP 設定を推奨。
  ただし本アプリは以下を使うため、**素朴な strict CSP は顔トラッキング/マルチバースを
  無言で壊す**。設定には index.html のリファクタと Tauri 実ビルド検証が必要:
  - `index.html:133-135` の CDN script (`https://cdn.jsdelivr.net` の MediaPipe 3 本)
  - 同 script の**インライン `onerror=` ハンドラ** (strict CSP でブロックされる)
  - `<head>` のインライン `<style>` / three.js が要素に付与するインラインスタイル
  - MediaPipe の wasm 実行 (`'wasm-unsafe-eval'`) と Web Worker (`worker-src blob:`)
  - VRM の `blob:` URL 読み込み、PeerJS シグナリングの WebSocket (`connect-src wss:`)

  推奨手順: ① `onerror=` を外部 module 側の `addEventListener('error', …)` に移す →
  ② インライン `<style>` を CSS ファイル化 → ③ 下記 CSP を設定して Tauri 実ビルドで
  顔トラ・録画・ピア接続が動くことを確認:

  ```
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  connect-src 'self' blob: https://cdn.jsdelivr.net wss://0.peerjs.com https://0.peerjs.com;
  worker-src blob:;
  ```
  (PeerServer を自前化する場合は `connect-src` を差し替え。STUN は RTCPeerConnection 経由で
  CSP 非対象。)

- **peerSession.close の無条件 delete** `src/core/net/peerSession.ts:47`
  古い接続の遅延 `close` が同一ピアの再接続 connection を map から消し、`send()` から
  静かに落とす可能性 (低頻度)。接続 identity 一致を確認してから delete する修正が要 E2E 検証。

- **multiverse connect の E2E 欠落** `tests/e2e/` にピア接続フローのテストが無い
  (CLAUDE.md 要件)。PeerJS クラウド依存のため CI で安定実行するにはモック/ローカル
  PeerServer が要る。別タスク化。

- **`ComputePoseOptions.hipPosStrength`** `src/core/avatar/applyPose.ts:47`
  `computePoseBoneRotations` は読まない冗長フィールド (`computeHipPosition` は独自 opts)。
  型変更の影響確認後に削除可。無害なため今回は保留。
