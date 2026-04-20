# T-001 PR C — Sample VRM 配置チェックリスト

T-001 part 1/2 (`bd4714c`) と候補調査 (`42960f9`) で全コード仕込みは完了済。
本ファイルは **part 2/2** (実 VRM ファイル配置) を人手で完遂するための
step-by-step ガイド。所要時間 **約 5 分**。

推奨候補: **VRoid Studio CC0 サンプル `AvatarSample_F` (旧 Vita)**。
理由は `docs/SAMPLE_VRM_ATTRIBUTION.md` Option 1 を参照。

---

## 前提

- VCam リポを clone 済 (`C:/project/test/a/VCam` 等)
- `feature/vite-migration` ブランチが最新 (`bc60ce4 release: v0.1.0-beta.2` 以降)
- ブラウザでファイルダウンロード可能
- (任意) UniVRM Inspector または Three-VRM Viewer 等の VRM メタデータ閲覧手段

---

## Step 1: VRM ファイルを取得 (約 2 分)

### 方法 A — VRoid Hub から直接 (推奨)

1. https://hub.vroid.com/en/characters/4593660874193246717/models/7942721847119018516
   を開く
2. 「Download VRM」ボタンを押下 (ログイン要求あり、pixiv ID で OK)
3. ファイル名は `AvatarSample_F.vrm` 等で保存される (約 12 MB)
4. **CC0 ライセンスである** ことをページ上で目視確認:
   - Redistribution: Allowed
   - Modification: Allowed
   - Commercial use (個人/法人): Allowed
   - Credit: Unnecessary

### 方法 B — GitHub mirror から (バックアップ)

```bash
curl -L -o sample.vrm \
  https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/fem_vroid.vrm
```

⚠️ mirror 版は in-VRM license metadata が CC0 のままか確認必須。
方法 A が困難な場合のみ使用。

---

## Step 2: ライセンスメタデータを確認 (約 1 分)

VRM ファイルの **embedded license** が CC0 になっていることを確認。
以下いずれかで:

- **UniVRM Inspector** (Unity): VRM をインポート → Inspector の VRM Meta タブ
- **Three-VRM Viewer** (Web): https://pixiv.github.io/three-vrm/packages/three-vrm/examples/ にドロップ
- **CLI**: VRM はバイナリ glTF + JSON、`json/extensions/VRMC_vrm/meta` 内に license フィールド

確認すべきフィールド:
- `licenseUrl`: `https://creativecommons.org/publicdomain/zero/1.0/` 相当
- `commercialUssageName`: `PersonalCommercialFree` または同等
- `redistributionAllowed`: `true`

⚠️ メタデータが CC0 でなかった場合 → **このファイルは採用不可**。
別の CC0 候補を `docs/SAMPLE_VRM_ATTRIBUTION.md` Option 3 のフィルタ URL から探す。

---

## Step 3: ファイル配置 (約 30 秒)

```bash
cd /path/to/VCam
git checkout feature/vite-migration
git pull
git checkout -b feat/sample-vrm-content

# ダウンロードしたファイルを配置 (リネーム必須)
mv ~/Downloads/AvatarSample_F.vrm public/samples/sample.vrm
ls -la public/samples/
# → sample.vrm (約 12 MB) と .gitkeep が並ぶこと
```

---

## Step 4: attribution を埋める (約 1 分)

`docs/SAMPLE_VRM_ATTRIBUTION.md` の `## sample.vrm` セクションを編集:

```markdown
## sample.vrm

| Field | Value |
|---|---|
| Filename | `public/samples/sample.vrm` |
| Display name | AvatarSample_F (旧 Vita) |
| Author | pixiv Inc. |
| Source URL | https://hub.vroid.com/en/characters/4593660874193246717/models/7942721847119018516 |
| License | CC0 1.0 Universal |
| License URL | https://creativecommons.org/publicdomain/zero/1.0/ |
| Allowed: redistribution | yes |
| Allowed: bundling in closed-source installer | yes (CC0 waives all rights) |
| Allowed: commercial use | yes (個人/法人問わず) |
| Required attribution text | (none — CC0 waives attribution; voluntary credit only) |
| Date acquired | 2026-04-XX |
| Acquired by | (your-github-username) |

### Required attribution display

CC0 のため法的に attribution display は不要。本ドキュメントへの自主的な
出典記録のみで十分。
```

---

## Step 5: E2E テストの skip を解除 (約 30 秒)

`tests/e2e/sample-vrm.spec.ts` を開いて 2 箇所の `test.skip` を `test` に置換:

```bash
sed -i 's/test\.skip(/test(/g' tests/e2e/sample-vrm.spec.ts
# または手動で 2 箇所編集
```

---

## Step 6: 検証 (約 1 分)

```bash
npm run typecheck                    # clean のはず
npm run test:e2e -- sample-vrm       # 2 tests passed のはず

# 手動確認
npm run dev
# → http://127.0.0.1:5173 を開く
# → 起動時に status に「VRM 読込完了: AvatarSample_F (VRM 1.0)」相当が出る
# → 画面中央にアバターが表示される
```

---

## Step 7: CHANGELOG 追記 (約 30 秒)

`CHANGELOG.md` の `[Unreleased]` セクションを更新:

```markdown
## [Unreleased]

### Added

- **T-001 part 2/2 完了**: `public/samples/sample.vrm` に CC0 ライセンスの
  VRoid Studio サンプル `AvatarSample_F` (旧 Vita) を配置。Web/Tauri 両方で
  起動時に自動 load される。`tests/e2e/sample-vrm.spec.ts` の skip を解除し
  E2E カバレッジに復帰 (9 tests / 0 skipped)。
```

`Pending` セクションから T-001 part 2/2 行を削除。

---

## Step 8: コミット + PR (約 30 秒)

```bash
git add public/samples/sample.vrm \
        docs/SAMPLE_VRM_ATTRIBUTION.md \
        tests/e2e/sample-vrm.spec.ts \
        CHANGELOG.md

git commit -m "feat(samples): bundle CC0 AvatarSample_F as sample.vrm (T-001 part 2/2)

Closes T-001. Auto-load path (src/main.ts:294) becomes live for first-time
users. CC0 license waives all restrictions for redistribution in installer
+ web build.

See docs/SAMPLE_VRM_ATTRIBUTION.md for source and license details."

git push -u origin feat/sample-vrm-content
gh pr create --base feature/vite-migration \
  --title "feat(samples): bundle CC0 AvatarSample_F as sample.vrm (T-001 part 2/2)" \
  --body "Closes T-001. See PR #3 / #4 for context."
```

---

## トラブルシューティング

### `npm run test:e2e -- sample-vrm` が「VRM 読込完了」を待ってタイムアウト

- ブラウザコンソール (`npx playwright test --headed`) で 404 が出ていないか確認
- `dist/samples/sample.vrm` が `npm run build` 後に生成されているか確認
  - 出ていれば Vite が `public/samples/` を copy している → 正常
  - 出ていなければ `vite.config.ts` の `publicDir: 'public'` を確認

### Tauri 同梱が動かない

```bash
npm run tauri:build
ls src-tauri/target/release/bundle/*/samples/
# → sample.vrm がコピーされているはず
```

`tauri.conf.json` の `bundle.resources` 設定 (PR #3 で追加済) を確認。

### VRM が読み込めない / 画面が真っ黒

- VRM ファイル自体が破損している可能性 → 別の CC0 モデルで再試行
- three-vrm 3.1 が VRM 1.0 を期待 → モデルが VRM 0.x の場合は load 失敗
  - VRoid Studio から export 時に「VRM 1.0」を選んだか確認
