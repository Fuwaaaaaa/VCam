# TODOS

## Active plan (locked by /plan-eng-review, 2026-04-20)

対象 3 項目（T-001 縮小、T-003 拡張、T-004 拡張）を次回 patch PR でまとめて実装。
**T-004 は事前検証で仮説 falsified → 2026-04-20 ドロップ済 (Closed 参照)。**

### T-001: サンプル VRM を同梱（scope reduced）
**What:** `public/samples/sample.vrm` に再配布可能な VRM を 1 個配置。README/LICENSE に属性表記を追加。
**Why:** 初回起動で手持ち VRM が無いユーザーでも即座にデモ体験できる。コードは既に `main.ts:294-299` で `/samples/sample.vrm` を HEAD 確認→load する分岐が実装済のため、ファイル配置のみで機能する。
**Pros:** 初見体験が劇的に改善。README のスクショ撮影も楽に。
**Cons:** リポ +5〜10MB（NSIS 誤差、Tauri dmg/appimage/deb 各プラットフォーム含む）。ライセンス表記の手間。
**Context:**
- 候補 VRM: AliciaSolid (CC BY / ニコニ立体)、VRoid Hub OSS ラベル等。**商用クローズド Tauri インストーラ同梱での再配布可否を個別確認必須**。
- Web 版: `vite` が `public/` を `dist/` にコピー → GitHub Pages に反映
- Tauri 版: `src-tauri/tauri.conf.json` の `bundle.resources` に含まれる確認必要
- 進捗表示は loadVRM:147 の `status.set('VRM 読込中…')` が既に存在 → 追加実装不要
- **GitHub Pages 100MB リポ上限への影響**: 現在リポサイズを確認し、+10MB で問題ないことを事前検証
**Tests:**
- [E2E] `tests/e2e/sample-vrm.spec.ts` — `/samples/sample.vrm` がネットワーク 200 で返り、`status` に「VRM 読込完了」が出るまで
- [E2E] サンプル VRM 欠落時の既存ドロップ案内フロー（regression）
**Depends on:** なし
**Target phase:** 次回 patch PR（**T-003/T-004 とは別 PR 推奨** — コンテンツ vs コード）

### T-003: FaceMesh tflite / CDN 失敗のハンドリング（expanded）
**What:** 以下 3 つのサイレント失敗経路を status 通知に昇格。
1. `<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/...">` が 404 → `index.html` の script に `onerror="window.__faceMeshCdnFailed=true"` を付け、起動時にチェックし status.set('顔認識ライブラリのダウンロードに失敗しました。ネットワークを確認してください')
2. `new FaceMesh(...)` 初期化は成功するが tflite wasm/binarypb が 404/CORS/timeout → `onResults` が一度も呼ばれない → `ensureActive(timeoutMs)` で検知
3. **区別ロジック**: `onResults` 内で `rawCallbackFired = true` をセット。タイマーは「`rawCallbackFired === false` で 8 秒経過」のときだけ「モデル読み込み失敗」エラーを出す。`rawCallbackFired === true` だが landmarks が空（= 顔が映ってない）は今まで通りサイレント。
**Why:** 現状 Kalidokit.solve のスローと AudioContext suspended は対応済（faceProcessor.ts:63-65, micLevel.ts:36-40）。残る tflite/CDN サイレント失敗は本番ユーザー報告で最多。誤検知を避けるため「ライブラリ未ロード」と「顔外し」を区別する。
**Cons:** タイムアウト閾値 8 秒は低速回線で誤報の可能性 → 初回 DL は 5 秒を超え得るため 5→8 に引き上げ（outside voice 指摘反映）。
**Context:**
- 検知の居場所: `src/core/tracking/faceProcessor.ts:56-66` (faceMesh.onResults)
- API: `createFaceProcessor` の return に `isActive(): boolean` と `waitForActive(timeoutMs): Promise<boolean>` を追加（minimal diff、既存 send/close は無変更）
- 呼び出し元: `src/main.ts` の boot() で `tracker.start()` 後に `face.waitForActive(8000)` を await し、結果で status 文言を分岐
- CDN 検知は index.html:head に `<script onerror>` を仕込む
**Pose 側:** `poseProcessor.ts` も同構造。同じパターンを pose にも適用（DRY のため共通ヘルパ化せず、まずは 2 箇所コピー。3 箇所目が出てからリファクタ）
**Tests:**
- [unit] `faceProcessor.test.ts` — onResults を一度も呼ばないモックで waitForActive が false を返す
- [unit] rawCallbackFired フラグが立った後は waitForActive が true（landmarks 空でも）
- [E2E] ネット遮断下で起動 → 8 秒後に「顔認識ライブラリのダウンロードに失敗」が status に出る
**Depends on:** なし
**Target phase:** 次回 patch リリース

### T-004: applyRig / remoteAvatar の新フレーム判定（expanded）
**What:** FaceMesh 30fps + rAF 60fps の重複フレームで OneEuroFilter velocity が 0 に退化するのを防ぐ seq ガード。**ローカル + リモート両方**をカバー。
**Why:** 同値 × 新時刻を filter.filter() に渡すと dt>0 かつ Δvalue=0 となり derivative が 0 推定され、速い動きへの追従が鈍る（outside voice: OneEuroFilter 実装の確認テストをまず書いて前提検証すべき）。
**Implementation:**
- **事前検証**: `tests/unit/OneEuroFilter.test.ts` に「同値を異なる t で連続 filter() したとき、derivative が 0 に収束する」ことを assert するテストを追加。もし収束しないことが判明したら T-004 全体をドロップする。
- **ローカル**: `main.ts` の `onFaceRig` / `onPoseRig` コールバックで `rigSeq++`。`applyRig(vrm, rig, seq, opts, filters, now)` のシグネチャに seq を追加。applyRig 内で `filters.lastAppliedSeq !== seq` のときだけ filter.filter() を呼び、同値の時は前回出力を返す。
- **リモート**: `rigSerialize.ts` のメッセージ型に `seq?: number` を追加。`remoteAvatar.receive(peerId, msg)` で `lastRemoteSeq.set(peerId, msg.seq)` を保持し、`tick()` 時に `applyRig(..., lastRemoteSeq.get(peerId) ?? 0, ...)`。送信側 (`encodeMessage`) は `rigSeq` を載せる。
- **ピア単位**: 複数ピア × 複数 VRM で seq がねじれないよう、lastAppliedSeq は filterSet 側ではなく **呼び出し元が seq を渡す責任**（今回決定: signature に seq 追加）に統一。ローカル faceFilters とリモート各 peerId ごとの filterSet を分離する。
**Depends on:** 事前検証テストで仮説が確認された場合のみ着手
**Target phase:** T-003 と同じ PR（両方 faceProcessor 周辺）
**Tests:**
- [unit] OneEuroFilter 事前検証（仮説立証）
- [unit] `applyRig` が同じ seq で呼ばれたら filter.filter() を呼ばない
- [unit] 新しい seq で呼ばれたら filter.filter() を呼ぶ
- [unit] rigSerialize の encodeMessage/decodeMessage で seq が往復する

### T-007: デバイス選択 UI (camera + mic)
**What:** 複数カメラ / 複数マイクを切替できる UI を追加。選択値は localStorage に永続化。
**Why:** 外部 USB カメラ / Web カム内蔵マイクが混在する実機では、OS 既定デバイスが意図通りとは限らない。VTuber 用途でユーザー要望の頻度が高い割に実装コスト小。
**Pros:** Web/Tauri 共通で動く。既存 `getUserMedia` 経路の置き換えのみ。
**Cons:** `@mediapipe/camera_utils` の `Camera` は deviceId 指定を持たないため、独自の rAF frame driver に置換が必要。
**Implementation:**
- 新設 `src/core/devices/enumerate.ts` — `navigator.mediaDevices.enumerateDevices()` を `{cameras, mics}` にラップ。label は permission 取得後にのみ埋まる仕様をドキュメント化。
- `tracker.ts` を rework: `window.Camera` の代わりに `getUserMedia({video:{deviceId}})` + rAF ループ。既存 `@mediapipe/camera_utils` CDN は削除。
- `MicTracker.enable(opts?: {deviceId?: string})` に deviceId を追加。
- `Settings` に `cameraDeviceId?: string | null` / `micDeviceId?: string | null` を追加 (normalize も更新)。
- index.html `#settings` にカメラ/マイク `<select>` を追加。`navigator.mediaDevices.ondevicechange` で再列挙。
**Tests:**
- [unit] `enumerate.test.ts` — mock `navigator.mediaDevices` でカテゴリ分離
- [unit] `settings.test.ts` 拡張 — cameraDeviceId/micDeviceId が normalize で保持される
- [unit] `micLevel.test.ts` 拡張 — enable(deviceId) が constraints に反映される
- [E2E] `device-selection.spec.ts` — selector が表示され、optons が 1 件以上 enumerate される (fake device)
**Depends on:** なし
**Target phase:** 次回 patch PR

### T-008: 録画 + スクショ機能
**What:** three.js canvas をキャプチャして (a) PNG スクショ単発保存、(b) webm クリップ録画 (開始/停止) をサポート。
**Why:** デモ動画・README スクショ・ユーザー自身の配信切抜きに使える。外部ツール不要で VCam 単体で完結。
**Pros:** `HTMLCanvasElement.captureStream()` + `MediaRecorder` で Web API のみ、Tauri 追加処理不要。
**Cons:** ブラウザコーデック差 (Chrome/Edge は webm/VP9 OK、Safari は mp4 に要調整。当面 Chromium 前提)。
**Implementation:**
- `src/core/capture/recorder.ts` — `createRecorder(canvas)` が `start()/stop(): Promise<Blob>` を返す薄いラッパ。MediaRecorder 非対応時はエラー。
- `src/core/capture/screenshot.ts` — `captureCanvasPNG(canvas): Promise<Blob>` を toBlob でラップ。
- UI: `#controls` に 📸 スクショ / ⏺ 録画ボタンを追加。録画中は赤点滅 (DESIGN.md: `#E8482C` warn 色)。
- ダウンロードは `<a download>` を動的生成 → click → revoke。
**Tests:**
- [unit] `recorder.test.ts` — MediaRecorder mock で start→stop フローで Blob が生成される
- [unit] `screenshot.test.ts` — canvas.toBlob を mock して PNG Blob
- [E2E] `capture.spec.ts` — スクショボタンクリックで download 属性付き URL が生成される
**Depends on:** なし
**Target phase:** T-007 の次 PR

### T-009: VMC プロトコル送信 (OSC/UDP)
**What:** VSeeFace 互換の VMC Protocol (OSC over UDP) で rig データを外部ツールに送信。Tauri 版のみサポート。
**Why:** 既存 VTuber エコシステム (MotionBuilder / VMC Receiver 対応アプリ) と連携可能に。配信側で複数ツール併用したいユーザーの要望。
**Pros:** 既存 `encodeMessage` で rig 形式は確立済。VMC 仕様に mapping するだけ。
**Cons:** UDP が Web では使えず Tauri invoke 経由必須 → Web/Tauri の機能差が露出。Rust 側 `tokio-udp` or 同等の依存追加、`tauri.conf.json` の `allowlist.shell`/net 設定再点検。
**Implementation:**
- `src-tauri/src/vmc.rs` — `send_vmc(addr: String, port: u16, packets: Vec<Vec<u8>>) -> Result<(), String>` を `#[tauri::command]` で公開。`UdpSocket::bind("0.0.0.0:0")` + send_to をループ。
- Rust deps: `rosc`（OSC encoder）追加。
- `src/core/net/vmcEncode.ts` — FaceRig/PoseRig を VMC の bone address (`/VMC/Ext/Bone/Pos` 等) に変換し Uint8Array[] を返す pure 関数。
- `src/core/net/vmcSender.ts` — Tauri `invoke('send_vmc', ...)` を呼ぶ薄い wrapper。Web 版では no-op + warn。
- `Settings` に `vmcEnabled: boolean`, `vmcHost: string`, `vmcPort: number` (既定 39539) を追加。
- UI: 新パネル `#vmc` で host/port 入力 + toggle。Tauri 判定で非表示 (Web 版)。
**Tests:**
- [unit] `vmcEncode.test.ts` — FaceRig から VMC OSC packet (bundle) への変換が仕様通り
- [unit] `vmcSender.test.ts` — invoke が正しい引数で呼ばれる (mock)
- [Rust] `vmc.rs` に `#[cfg(test)]` で UdpSocket binding/send の smoke test
- [E2E] Tauri 専用のため本 PR ではスキップ (手動検証チェックリスト `docs/T-009-MANUAL-QA.md` を添付)
**Depends on:** なし (T-007/T-008 と独立)
**Target phase:** T-008 の次 PR (スコープ最大)

### T-005: GPU 推論フォールバック検出（deferred）
**What:** MediaPipe が GPU → CPU にフォールバックしたことを検知し、status に通知。
**Target phase 変更:** 「**beta ユーザーから「重い」フィードバックが 3 件以上来てから**」。
**Reason:** 実ユーザー報告ゼロの段階では YAGNI。status 表示のみの UX はユーザー価値が薄い（outside voice 指摘）。必要性が確認できてから auto-intervention 含めて再設計。
**Context:** FaceMesh の delegate 情報は JS から取れないためタイミングヒューリスティックのみが現実案。実装時は「300ms」の対象（send→onResults 往復 vs rAF 間隔）を明確化すること。

### T-006: tasks-vision への移行判断の再評価（quarterly reminder）
**What:** Kalidokit メンテ状態 / @mediapipe/face_mesh の jsdelivr 版管理 / @mediapipe/tasks-vision への移行コストを四半期ごとに評価。
**Next review:** 2026-07-20
**Trigger to migrate immediately:** jsdelivr で `@0.4.1633559619` が 404 化、または Kalidokit の GitHub で 6 ヶ月無活動。

## Closed

- **T-002** 設定の localStorage 永続化 — Phase 4 (commit 02b79d9) で実装済、2026-04-20 クローズ
- **T-004** applyRig / remoteAvatar の新フレーム判定 — 2026-04-20 **ドロップ**。
  事前検証 (`tests/unit/OneEuroFilter.test.ts` の "T-004 regression" テスト) で
  「同値 × 異 t での連続 filter() が derivative を退化させる」という仮説が **falsified**。
  `OneEuroFilter` は `xPrev`/`dxPrev`/`tPrev` のみ状態保持し、同値連続では
  `dxPrev=0` が init 直後と同等のまま維持され、次の遷移で `dx` が独立に再推定
  されるため追従は劣化しない。warm-up したフィルタと fresh フィルタの遷移出力は
  10 桁精度で一致する。seq ガードは不要。
