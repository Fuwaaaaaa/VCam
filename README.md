# VRM Face Tracking PoC

Webカメラで顔を認識し、VRM アバターに顔の向き・表情・瞬きを反映する最小デモ。
Unity なし、単一 HTML で完結。将来的に Tauri でデスクトップアプリ化する想定。

## スタック

| 役割 | ライブラリ |
|---|---|
| 3D レンダリング | [three.js](https://threejs.org/) 0.160 |
| VRM 読込・制御 | [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) 3.1 |
| 顔ランドマーク検出 | [@mediapipe/face_mesh](https://developers.google.com/mediapipe) |
| ランドマーク→ボーン角度変換 | [kalidokit](https://github.com/yeemachine/kalidokit) 1.1 |

依存はすべて CDN から直接ロード。ビルド不要。

---

## 起動手順

### 1. ローカル HTTP サーバで開く

`file://` では MediaPipe の wasm/tflite が CORS で読めないため、**必ず HTTP サーバ経由**で開く。

**Python が入っている場合** (推奨):

```bash
cd C:\project\test\a
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開く。

**Node.js が入っている場合**:

```bash
cd C:\project\test\a
npx http-server -p 8000
```

**VS Code の Live Server 拡張**でも可。

### 2. VRM モデルを用意

次のいずれか:

- **(a) 自動読込**: `sample.vrm` というファイル名で `C:\project\test\a\` に置く → ページ読み込み時に自動表示
- **(b) ドラッグ&ドロップ**: ページを開いてから、左下のドロップ領域に `.vrm` をドロップ
- **(c) ファイル選択**: 左下のドロップ領域をクリック → ファイルダイアログから選択

### 3. カメラ許可

ブラウザから「カメラへのアクセス」を求められるので許可。顔が検出されるとアバターに反映される。

---

## 無料・再配布可能な VRM の入手先

自分で VRM を持っていない場合:

- **VRoid Hub** — https://hub.vroid.com/
  - 「ライセンス > 再配布・二次利用」が許可されたモデルを探す
  - 検索フィルタで「アバター利用: OK」「改変: OK」等を絞り込む
- **ニコニ立体** — https://3d.nicovideo.jp/works.html?type_filters=VrmFile
- **VRoid Studio** — https://vroid.com/studio — 自作ツール (無料)

ダウンロードした `.vrm` をそのままドラッグ&ドロップすれば動く。

---

## 反映されている要素

### Phase 2-A
- ✅ 頭の向き (yaw / pitch / roll)
- ✅ 首の向き (頭の 30% 分配)
- ✅ 瞬き (左右独立)
- ✅ 口の開き (AIUEO 5 母音 BlendShape)

### Phase 2-B (追加)
- ✅ 目線追従 (lookLeft / lookRight / lookUp / lookDown)
- ✅ 眉 → surprised / sad BlendShape
- ✅ マイクベースのリップシンク (音量と口形の大きい方を採用)
- ✅ One Euro Filter によるスムージング (LERP より遅延少・揺れ少)
- ✅ 画面右側のコントロールパネルでマイク / 目線 / スムージングを ON/OFF 切替

### 未実装
- ⬜ 頬 (Kalidokit は未対応 → 別手段で実装予定)
- ⬜ 上半身・腕のトラッキング (フェーズ 3-a)
- ⬜ 全身 + IK (フェーズ 3-b)

---

## トラブルシューティング

### 画面が真っ黒、VRM が出ない
- ブラウザのコンソール (F12) でエラーを確認
- `./sample.vrm` が存在しない場合、左下に「ドラッグ&ドロップ」の案内が出る

### カメラが起動しない
- ブラウザのカメラ許可を確認 (アドレスバーのカメラアイコン)
- 他アプリ (Zoom / Teams / OBS 等) がカメラを占有していないか確認
- HTTPS または `localhost` でアクセスする必要あり (`127.0.0.1` は OK、生 IP は NG)

### 顔は認識するが動きがカクつく / 揺れる
- 画面右の「〰 スムージング ON」が有効なことを確認
- それでも気になる場合、`index.html` 内 One Euro Filter のパラメータを調整:
  - `minCutoff` を下げると停止時のジッタが減る (遅延は増える)
  - `beta` を上げると速い動きへの追従が速くなる
- スムージング OFF 時は LERP (`FALLBACK_EASE = 0.4`) にフォールバック

### マイクを ON にしても口が動かない
- マイク感度 (updateMicLevel の `rms * 5`) を上げる
- 顔の口形とのブレンドは「大きい方を採用」なので、顔が閉じてる口を検出している間は上書きされる
  → 必要なら `Math.max` を加重ブレンド `micLevel * 0.7 + aaFace * 0.3` 等に変更

### 目線の左右が逆
- webcam は鏡像表示前提で `px = -px` の反転をしている
- 鏡像を切りたい場合、CSS `#webcam { transform: scaleX(-1); }` を外し、同時に `applyRig` 内の符号も見直す

### VRM 0.x で表情が反映されない
- VRM 1.0 モデルを推奨
- 0.x でも頭の動きは反映されるはず。BlendShape 名が異なるため表情は動かない場合あり

---

## 次のマイルストーン

設計ドキュメント: `C:\Users\柳田風和\.claude\plans\image-1-image-2-bubbly-sparrow.md`

- Phase 2-A (Week 1 デモ): 顔追従 + 基本表情 ✅
- **Phase 2-B: リップシンク (Web Audio) + 目線追従 + スムージング ← いまここ** ✅
- Phase 3-a: 上半身トラッキング (MediaPipe Pose + Kalidokit.pose)
- Phase 3-b: 全身 + IK
- Phase 4: UI / 設定永続化 / キャリブレーション
- Phase 5: Tauri パッケージング + GitHub Releases
- Phase E: マルチバース (WebRTC)
- Phase F: AR 演出 (Segmentation + シェーダ)
