# VCam

**Web カメラで自分の顔や体の動きを読み取って、VRM アバターに反映させる PC 用アプリ。**

- 顔の向き・目線・まばたき・口パクを自動で再現
- マイクの声に合わせて口が動く
- 上半身も下半身も追従 (Web カメラ 1 台でOK)
- 複数人で同じ画面にアバターを並べられる (ネット越し)
- OBS で配信に使える透過背景 / Bloom などの画面演出
- スクリーンショット (PNG) / 録画 (webm) をワンクリックで保存

![architecture](https://via.placeholder.com/800x300?text=VCam+screen+layout)

---

## 💡 こういう人向けです

- VTuber 配信をしたいけど Unity や専用機材は面倒
- 自分の VRM アバターを持っていて、Web カメラだけで動かしたい
- VSeeFace / Luppet / 3tene の代わりに、軽くて無料で使えるものがほしい
- 複数人のアバターを同じ画面に並べてコラボ配信したい

---

## 🚀 いちばん簡単な使い方

### 1. アプリを起動する

**パッケージ版 (beta)** — [Releases ページ](../../releases) から自分の OS の
インストーラをダウンロードして実行します。

| OS | 落とすファイル |
|---|---|
| Windows | `VCam_x.x.x_x64-setup.exe` または `.msi` |
| macOS | `VCam_x.x.x_x64.dmg` / `_aarch64.dmg` |
| Linux | `vcam_x.x.x_amd64.AppImage` / `.deb` |

インストール後、**デスクトップの VCam アイコン**をダブルクリックで起動します。
初回起動時に Web カメラとマイクの許可を求められるので「許可」を選んでください。

### 2. アバターを読み込む

`.vrm` ファイル (VRM 形式のアバター) を用意します。持っていない場合は
[⛩ VRoid Hub](https://hub.vroid.com/) から無料でダウンロードできます。

- **方法 1**: アプリ画面 **左下の点線枠に .vrm ファイルをドラッグ&ドロップ**
- **方法 2**: 点線枠をクリックしてファイル選択

> 💡 ビルド時に `public/samples/sample.vrm` が同梱されている場合、起動時に
> 自動で読み込まれます。同梱モデルのライセンス・クレジットは
> [`docs/SAMPLE_VRM_ATTRIBUTION.md`](docs/SAMPLE_VRM_ATTRIBUTION.md) に
> 記載されます。

### 3. 顔を認識させる

画面右上に自分のカメラ映像が表示されます。カメラに正面を向くとアバターが
連動して動きます。

### 4. 必要なら設定する

画面右のボタンで各機能の ON/OFF:

| ボタン | 意味 |
|---|---|
| 🎙 マイク ON/OFF | マイクの音量で口パクを強化する |
| 👀 目線 ON/OFF | 目の向きをアバターに反映する |
| 〰 スムージング | 動きの揺れを滑らかにする |
| 👤 ポーズ ON/OFF | 腕・脚の動きを追従する |
| 📸 スクショ | 画面を PNG で 1 枚保存 (`vcam-YYYYMMDD-HHMMSS.png`) |
| ⏺ 録画開始 | 画面を webm で録画開始/停止。録画中は赤く点滅 |

画面左の「⚙ 設定」パネル:
- **カメラ** — 複数台つないでいる場合に使うカメラを選ぶ (USB 抜き差しに自動追従)
- **マイク** — 使うマイクを選ぶ。選んだ値は次回起動時も保持される
- **脚の強度** — 膝より下がカメラに映らないなら 0.2〜0.3 に下げる
- **ヒップ位置強度** — 動きが激しすぎるなら下げる
- **マイク感度** — 小さい声で反応しないなら上げる
- **透過背景** — OBS で合成するときは ON
- **ブルーム効果** — 光らせて綺麗に見せる

---

## 🎨 VRChat のアバターを使いたい

VRChat 用のアバターは **そのままでは使えません**。Unity で VRM 形式に変換する
必要があります。詳しい手順は **[docs/VRCHAT_TO_VRM.md](docs/VRCHAT_TO_VRM.md)**
をご覧ください。

要約:
1. Unity 2022.3 + VRChat SDK を用意
2. 「VRM Converter for VRChat」というツールを Booth で購入 (500 円)
3. Unity でアバターを読み込み、メニューから VRM エクスポート
4. 生成した `.vrm` を VCam にドラッグ&ドロップ

**⚠️ アバターのライセンスで「VRM 変換 OK」か必ず確認してください。** 禁止されて
いる場合は使えません。

VRM 対応モデルを探す方が楽な場合は:
- [VRoid Hub](https://hub.vroid.com/) (無料、VRM 直接ダウンロード)
- [VRoid Studio](https://vroid.com/studio) (無料、自作ツール)
- [ニコニ立体](https://3d.nicovideo.jp/) (再配布 OK モデル多数)

---

## 📺 OBS で配信に使う

1. VCam を起動、アバターを読み込む
2. 「⚙ 設定 > 透過背景」を ON (アバターの背景が消える)
3. OBS で「**ウィンドウキャプチャ**」を追加 → VCam のウィンドウを選ぶ
4. OBS 側でクロマキー不要でそのまま合成できます

仮想カメラとして他アプリ (Zoom 等) に流したい場合は、OBS の「**仮想カメラ**」
機能を有効にしてください。

---

## 🌐 複数人でアバターを並べる (マルチバース)

画面右下「🌐 マルチバース」パネル:

1. アプリ起動すると「自分の Peer ID」が表示される (長い英数字の文字列)
2. 一緒に使う相手に📋ボタンで ID をコピーして送る (Discord 等で)
3. 相手は「相手の Peer ID」欄にそれを貼り付けて「接続」
4. 両方のアバターが同じ画面に並んで動きます

※ 会社のネットワークだとつながらない場合があります。家庭回線推奨。

---

## ❓ 困ったとき

### カメラが動かない
- アプリのカメラ許可を確認 (Windows 設定 > プライバシー > カメラ)
- 他のアプリ (Zoom / OBS 等) がカメラを占有していないか確認

### 複数のカメラ / マイクを切り替えたい
- 「⚙ 設定」パネル上部の「カメラ」「マイク」欄から選べます
- USB カメラを後から挿した場合も自動で一覧に追加されます

### 録画した webm が一部プレイヤーで開けない
- VCam の録画は vp9 / vp8 の webm です。Windows 標準のメディアプレーヤーで
  再生できない場合は、VLC / MPV / Chrome にドロップしてください
- OBS / DaVinci Resolve / ffmpeg など編集ソフトは直接読めます

### マイクに反応しない
- マイク許可を確認
- 画面右「🎙 マイク」ボタンが ON になっているか
- 「⚙ 設定 > マイク感度」を上げる

### アバターがカクつく / 揺れる
- 画面右「〰 スムージング」が ON か確認
- PC スペックが足りない場合は「👤 ポーズ」OFF で軽くなります

### 脚が変に動く
- 「⚙ 設定 > 脚の強度」を 0.2 くらいに下げる
- 膝より下がカメラに映るとこの問題は出にくい

### アバターが真っ黒 / 妙な色
- VRM 変換時にシェーダが壊れた可能性 (特に VRChat 出身の場合)
- [docs/VRCHAT_TO_VRM.md](docs/VRCHAT_TO_VRM.md) の「よくある詰まりポイント」参照

---

## 🛠 開発者向け

自分でビルドしたい・中身を改造したい場合:

<details>
<summary>クリックで展開</summary>

### 環境

- Node.js 20 以上
- npm (または pnpm)
- (Tauri ビルド時) Rust 1.77 以上 + 各 OS のビルドツール

### 起動

```bash
git clone https://github.com/Fuwaaaaaa/VCam.git
cd VCam
npm install
npx playwright install chromium  # 初回のみ、E2E テスト用

npm run dev          # ブラウザ版 http://127.0.0.1:5173
npm run tauri:dev    # デスクトップアプリ版 (Rust ビルド 5-10 分)
```

### スタック

| 役割 | 使用ライブラリ |
|---|---|
| ビルド | Vite 5 + TypeScript 5 |
| デスクトップ外殻 | Tauri 2 |
| 3D | three.js 0.160 |
| VRM | @pixiv/three-vrm 3.1 |
| 顔認識 | @mediapipe/face_mesh (CDN) |
| 姿勢認識 | @mediapipe/pose (CDN) |
| 角度計算 | kalidokit 1.1 |
| P2P 通信 | peerjs 1.5 |
| 単体テスト | Vitest 2 |
| E2E | Playwright 1 |

### テスト

```bash
npm run typecheck    # TypeScript 型チェック
npm run test         # 単体テスト (Vitest)
npm run test:e2e     # E2E (Playwright + Chromium)
npm run build        # プロダクションビルド (dist/)
```

### ディレクトリ

```
VCam/
├── src/
│   ├── main.ts                       # エントリ
│   ├── types.ts                      # 型定義
│   ├── core/
│   │   ├── avatar/                   # VRM 読込 & ボーン反映
│   │   ├── audio/                    # マイク入力
│   │   ├── capture/                  # スクショ (PNG) + 録画 (webm)
│   │   ├── devices/                  # カメラ / マイク列挙 + 切替
│   │   ├── filters/                  # One Euro Filter (スムージング)
│   │   ├── math/                     # 数学ユーティリティ
│   │   ├── net/                      # PeerJS マルチバース
│   │   ├── render/                   # ポストエフェクト + 背景
│   │   ├── storage/                  # localStorage 設定永続化
│   │   └── tracking/                 # MediaPipe face + pose
│   └── ui/                           # UI コンポーネント
├── src-tauri/                        # Rust デスクトップ外殻
├── tests/unit/                       # Vitest
├── tests/e2e/                        # Playwright
├── docs/                             # ドキュメント
├── .github/workflows/                # CI / Release
├── package.json / vite.config.ts 等
```

### 実装済みフェーズ

- ✅ Phase 2-A: 顔トラッキング + 基本表情
- ✅ Phase 2-B: リップシンク + 目線 + スムージング
- ✅ Phase 3-a: 上半身トラッキング
- ✅ Phase 3-b: 下半身トラッキング + hip 位置オフセット
- ✅ Phase 4: 設定 UI + 永続化
- ✅ Phase 5: Tauri デスクトップパッケージング
- ✅ Phase E: マルチバース (WebRTC)
- ✅ Phase F: 透過背景 + Bloom
- ✅ T-007 / T-008: デバイス選択 + スクショ / 録画

テストカバレッジ:
- 96 unit tests / 13 E2E tests (capture / device-selection を含む, 2 skipped)
- TypeScript strict mode

</details>

---

## 📜 ライセンス

このアプリ自体は **MIT ライセンス** ([`LICENSE`](LICENSE) 参照)。
**利用する VRM モデルのライセンスは、各モデル作者の規約に従ってください。**
VCam はモデルを同梱しません。

---

## 📫 フィードバック

- バグ報告 / 要望: [GitHub Issues](../../issues)
- 詳しいドキュメント: [`docs/`](docs/) フォルダ
