# VCam — VRM Face Tracking Desktop App

Web カメラで顔を認識し、VRM アバターに顔の向き・表情・瞬きを反映するアプリ。
Unity を使わず、最終的には Tauri で単一 exe として配布予定。

## スタック

| 役割 | ライブラリ |
|---|---|
| ビルド / 開発 | Vite 5 + TypeScript 5 |
| 3D レンダリング | [three.js](https://threejs.org/) 0.160 |
| VRM 読込・制御 | [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) 3.1 (VRM 1.0 / 0.x 両対応) |
| 顔ランドマーク検出 | [@mediapipe/face_mesh](https://developers.google.com/mediapipe) (CDN 経由の UMD) |
| ランドマーク→ボーン角度 | [kalidokit](https://github.com/yeemachine/kalidokit) 1.1 |
| スムージング | 自作 One Euro Filter |
| 単体テスト | Vitest 2 + happy-dom |
| E2E | Playwright 1 + Chromium |

## セットアップ

```bash
cd C:\project\test\a\VCam
npm install
npx playwright install chromium   # 初回のみ (E2E 用、~180MB)
```

## 開発

```bash
npm run dev            # Vite dev server (http://127.0.0.1:5173)
npm run typecheck      # TypeScript 型チェック
npm run test           # 単体テスト (1 回実行)
npm run test:watch     # 単体テスト watch モード
npm run test:ui        # Vitest UI
npm run test:e2e       # E2E (Playwright)
npm run build          # プロダクションビルド (dist/)
npm run preview        # プロダクションビルドをローカルでプレビュー
```

## VRM モデルを用意

- **(a) 自動読込**: `public/samples/sample.vrm` に配置 → ページ読み込み時に自動表示
- **(b) ドラッグ&ドロップ**: ページを開いてから、左下のドロップ領域に `.vrm` をドロップ
- **(c) ファイル選択**: 左下のドロップ領域をクリック → ファイルダイアログから選択

### 無料・再配布可能な VRM の入手先
- **VRoid Hub** — https://hub.vroid.com/ (ライセンスフィルタで「再配布OK」を絞込)
- **ニコニ立体** — https://3d.nicovideo.jp/works.html?type_filters=VrmFile
- **VRoid Studio** (自作) — https://vroid.com/studio

## ディレクトリ構造

```
VCam/
├── index.html                  # Vite entry (MediaPipe UMD の <script> 含む)
├── src/
│   ├── main.ts                 # エントリ: scene / boot / event wiring
│   ├── types.ts                # FaceRig, AppOptions, ExpressionValues
│   ├── core/
│   │   ├── math/clamp.ts       # clamp01, lerp, clamp
│   │   ├── filters/
│   │   │   ├── OneEuroFilter.ts      # 単軸 OneEuro フィルタ
│   │   │   └── rigFilterSet.ts       # Rig 各軸用のフィルタ束
│   │   ├── avatar/
│   │   │   ├── loadVRM.ts            # VRM 読込 + disposeVRM
│   │   │   ├── applyRig.ts           # 毎フレームの VRM 反映 (統合)
│   │   │   ├── applyHead.ts          # 頭+首の回転計算 (pure)
│   │   │   └── applyExpressions.ts   # 表情計算 (pure)
│   │   ├── audio/micLevel.ts   # computeMicLevel (pure) + MicTracker (stateful)
│   │   └── tracking/faceMesh.ts      # MediaPipe + Kalidokit wiring
│   └── ui/
│       ├── status.ts           # ステータスパネル
│       ├── dropZone.ts         # VRM ドラッグ&ドロップ
│       └── controls.ts         # マイク/目線/スムージング トグルボタン
├── tests/
│   ├── unit/                   # Vitest (happy-dom)  — 42 tests
│   └── e2e/                    # Playwright (Chromium) — 4 tests
├── package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts
├── TODOS.md
└── .gitignore
```

## データフロー

```
    ┌─────────────────────────┐
    │   index.html (Vite)     │
    │   ├─ CDN: MediaPipe UMD │
    │   └─ <script>: /src/main.ts
    └────────────┬────────────┘
                 ▼
    ┌────────────────────────────────────┐
    │            main.ts (boot)          │
    │  - scene / renderer / camera       │
    │  - wire UI (controls, drop zone)   │
    │  - createFaceTracker()             │
    │  - requestAnimationFrame loop      │
    └────────────┬───────────────────────┘
                 │
    ┌──────────────────────────────┐
    │   createTracker (shared Cam) │
    └────────────┬─────────────────┘
                 │ sequential send per frame
    ┌────────────┼──────────────┬──────────────┐
    │            │              │              │
    ▼            ▼              ▼              ▼
[FaceMesh] [Pose Landmarker] [MicTracker]  (idle)
    │            │              │
    ▼            ▼              ▼
 FaceRig      PoseRig       micLevel (0..1)
    │            │              │
    │            │   ┌──────────┘
    │            │   │
    ▼            ▼   ▼
 applyRig(face) computePoseBoneRotations ─▶ applyBoneRotations
    │                                        │
    ▼                                        ▼
 head+neck + expressions            spine, hips, L/R arms, L/R hands
    │                                        │
    └────────────┬───────────────────────────┘
                 ▼
       vrm.humanoid + vrm.expressionManager
                 │
                 ▼
           renderer.render()
```

## 反映されている要素

### Face (Phase 2-A/B)
- ✅ 頭の向き (yaw / pitch / roll)
- ✅ 首の向き (頭の 30% 分配)
- ✅ 瞬き (左右独立)
- ✅ 口の開き (AIUEO 5 母音 BlendShape)
- ✅ 目線追従 (lookLeft / lookRight / lookUp / lookDown)
- ✅ 眉 → surprised / sad BlendShape
- ✅ マイクベースのリップシンク (音量と口形の大きい方)
- ✅ One Euro Filter スムージング

### Pose (Phase 3-a / 3-b)
- ✅ 背骨 (spine) の傾き
- ✅ ヒップ (hips) の回転
- ✅ 左右の上腕 / 前腕 / 手首
- ✅ 左右の太もも (leftUpperLeg / rightUpperLeg) — Phase 3-b
- ✅ 左右の膝 (leftLowerLeg / rightLowerLeg) — Phase 3-b
- ✅ Hips 位置オフセット (X/Y、Z は webcam 深度不安定のため除外) — Phase 3-b
- ✅ 床突き抜け防止 clamp (Y: -0.2m 〜 +0.5m) — Phase 3-b
- ✅ 脚用フィルタは minCutoff=0.5 で安定重視
- ✅ `legStrength` / `hipPosStrength` 係数で追従量を調整可能
- 👤 ポーズ ON/OFF トグル (UI)

## Pose のチューニング

`src/main.ts` 冒頭の定数で挙動を調整:

| 定数 | 既定 | 用途 |
|---|---|---|
| `LEG_STRENGTH` | `1.0` | 脚の追従強度 (0..1)。膝より下がカメラに映らないセットアップでは `0.2〜0.3` 推奨 |
| `HIP_POS_STRENGTH` | `0.3` | Hips 位置オフセット強度。`1.0` でアバターが跳ね回るので基本は低め |
| `MIRROR_WEBCAM` | `true` | webcam が CSS で鏡像表示されている前提 (y/z 軸反転) |

Pose モデル複雑度は `src/core/tracking/poseProcessor.ts` の `modelComplexity: 1` で
0 (Lite) / 1 (Full) / 2 (Heavy) を選択可能。低スペック PC は 0 に。

## 未実装 (TODOS.md 参照)
- ⬜ localStorage 設定永続化 (T-002, Phase 4)
- ⬜ サンプル VRM 同梱 (T-001)
- ⬜ Tauri パッケージング (Phase 5)
- ⬜ マルチバース (Phase E)
- ⬜ AR 演出 (Phase F)

## トラブルシューティング

### 画面が真っ黒、VRM が出ない
- コンソール (F12) でエラー確認
- `public/samples/sample.vrm` が無ければ、ドラッグ&ドロップで VRM を投入

### カメラが起動しない
- ブラウザのカメラ許可を確認
- 他アプリ (Zoom / OBS 等) が占有していないか
- `http://127.0.0.1:5173` で開く (生 IP や `file://` は NG)

### 顔は認識するが動きがカクつく / 揺れる
- 右パネルの「〰 スムージング ON」を確認
- `src/core/filters/rigFilterSet.ts` の `minCutoff` を下げるとジッタ減、`beta` を上げると速い動きへの追従向上

### マイクを ON にしても口が動かない
- `src/core/audio/micLevel.ts` の `sensitivity` (既定 5) を上げる
- 顔の口形と max ブレンドなので、顔で閉口を強く検出している間は上書きされる

## 次のマイルストーン

設計ドキュメント: `C:\Users\柳田風和\.claude\plans\image-1-image-2-bubbly-sparrow.md`

- Phase 2-A: 顔追従 + 基本表情 ✅
- Phase 2-B: リップシンク + 目線 + スムージング ✅
- Vite + TS + Vitest + Playwright migration ✅
- Phase 3-a: 上半身トラッキング ✅
- **Phase 3-b: 全身トラッキング + hip 位置オフセット + 床 clamp ✅ ← いまここ**
- Phase 4: UI / 設定永続化
- Phase 5: Tauri パッケージング
- Phase E: マルチバース
- Phase F: AR 演出
