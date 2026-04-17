# TODOS

## Deferred work (from /plan-eng-review, 2026-04-17)

### T-001: サンプル VRM を同梱
**What:** `samples/` に再配布可能な VRM (AliciaSolid 等) を配置し、`./sample.vrm` フォールバックパスが常に HIT するようにする。
**Why:** 初回起動で手持ち VRM が無いユーザーでも即座にデモ体験できる。
**Pros:** 初見体験が劇的に改善。README のスクリーンショット撮影も楽に。
**Cons:** リポサイズ +5〜10MB。ライセンス表記の手間。
**Context:** 現在は `./sample.vrm` が無ければドラッグ&ドロップを促す。無料配布 VRM として AliciaSolid (CC BY / ニコニコ立体)、ニコニ立体ちゃん、VRoid Hub の OSS ラベルモデル等が候補。
**Depends on:** Vite 移行 (public/ 配下に置く構成にするため)
**Target phase:** Vite 移行 PR 内

### T-002: 設定の localStorage 永続化
**What:** マイク ON/OFF、目線 ON/OFF、スムージング ON/OFF、感度パラメータを localStorage に保存/復元。
**Why:** ページリロードで設定が消えるのが地味にストレス。
**Pros:** UX 改善。Tauri 化時の設定永続化にもそのまま使える。
**Cons:** 初期化時の flash of unstyled content を避けるため読込タイミング注意。
**Context:** 現状 `options = { mic, gaze, smooth }` と `updateMicLevel` の `rms * 5` 感度係数。
**Depends on:** Phase 4 (UI + 設定画面)
**Target phase:** Phase 4

### T-003: FaceMesh/Kalidokit/AudioContext の critical gap に try/catch
**What:** 失敗時にサイレント停止しないよう、setStatus で明示。
- `FaceMesh` の tflite ロード失敗
- `Kalidokit.Face.solve` のスロー
- `AudioContext` の suspended 状態 (ブラウザ autoplay policy)
**Why:** Failure Modes 分析で critical gap 3 件。本番で最も多いユーザー報告。
**Pros:** デバッグ時間短縮、サポート負荷減。
**Cons:** 無し。
**Context:** `index.html` 内 `faceMesh.onResults`、`new FaceMesh(...)`、`new AudioContext(...)` の各コールサイト。
**Depends on:** Vite 移行
**Target phase:** Vite 移行 PR 内 (migration と同時)

### T-004: applyRig の新フレーム判定
**What:** FaceMesh は 30fps、rAF は 60fps。`rigSeq` カウンタで同じ rig への再適用をスキップし、One Euro Filter の velocity 推定が歪むのを防ぐ。
**Why:** 同値 × 新時刻を filter に渡すと velocity=0 になり、速い動きへの追従が鈍る可能性。
**Context:** `faceMesh.onResults` で `rigSeq++`、`applyRig` 内で `lastAppliedSeq !== rigSeq` のときだけフィルタ更新。
**Depends on:** Vite 移行 (モジュール分離後に実装が楽)
**Target phase:** Phase 3-a 着手時

### T-005: GPU 推論フォールバック検出
**What:** MediaPipe が GPU → CPU にフォールバックしたことを検知し、低スペック環境ではフレームレート調整。
**Why:** サイレントに重くなるのを避ける。
**Context:** FaceMesh の GPU 判定 API は薄い。devicePixelRatio や performance timing で間接測定も可。
**Target phase:** Phase 3-b 以降 (全身トラッキング時に CPU 負荷が顕在化)

### T-006: tasks-vision への移行判断の再評価
**What:** Kalidokit のメンテ状態 / legacy face_mesh CDN の生存状態を半年に一度確認し、切替判断する。
**Why:** Arch-1 で「legacy 続行」を選んだが、CDN が消えたら一気に詰む。
**Context:** Kalidokit の GitHub コミット頻度と @mediapipe/face_mesh の jsdelivr バージョン。
**Target phase:** 四半期レビュー
