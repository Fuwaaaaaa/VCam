# Sample VRM Attribution

VCam bundles the following VRM 3D models as "sample" assets shipped under
`public/samples/` (web build) and inside the Tauri desktop installers.
These models are **NOT covered by VCam's MIT license** (`/LICENSE`). Each
is licensed separately by its original author. Their licenses are
respected and reproduced below.

If you redistribute VCam (forks, custom builds), you MUST keep this
attribution and obey each model's license terms.

---

## sample.vrm

| Field | Value |
|---|---|
| Filename | `public/samples/sample.vrm` |
| Display name | _(fill in after VRM file is added)_ |
| Author | _(fill in)_ |
| Source URL | _(fill in)_ |
| License | _(fill in — e.g. CC BY 4.0, CC BY-SA 4.0, etc.)_ |
| License URL | _(fill in)_ |
| Allowed: redistribution | _(yes / no)_ |
| Allowed: bundling in closed-source installer | _(yes / no)_ |
| Allowed: commercial use | _(yes / no)_ |
| Required attribution text | _(copy verbatim from license)_ |
| Date acquired | _(YYYY-MM-DD)_ |
| Acquired by | _(GitHub username)_ |

### Required attribution display

_(If the model's license requires attribution to be shown in-app, document
the exact text and where it must appear. e.g. "About dialog must contain
'Avatar by ___ — CC BY 4.0'".)_

---

## Candidate VRMs (researched 2026-04-20)

Three options ranked by how cleanly the license permits VCam's use case
(closed-source Tauri installer + GitHub Pages web build redistribution).

### 🥇 Option 1: VRoid Studio CC0 sample models (recommended)

| Field | Value |
|---|---|
| Candidates | `AvatarSample_F` (旧 `Vita`), and any other CC0-tagged VRoid sample |
| Author | pixiv Inc. |
| License | **CC0 1.0 Universal** (public domain dedication) |
| Source — official FAQ | https://vroid.pixiv.help/hc/en-us/articles/4402614652569 |
| Source — VRoid Hub Vita page | https://hub.vroid.com/en/characters/4593660874193246717/models/7942721847119018516 |
| Mirror (GitHub) | https://github.com/madjin/vrm-samples/tree/master/vroid (`fem_vroid.vrm` 12MB / `masc_vroid.vrm` 12MB are likely the CC0 ones — verify in-VRM license metadata before adopting) |
| Redistribution in installer | **Permitted** (CC0 waives all copyright; no restriction on redistribution form) |
| Commercial use | **Permitted** (CC0) |
| Attribution required | **No** (CC0 waives attribution; we will still credit voluntarily) |
| Estimated file size | ~12 MB (above the 5–10 MB target — verify acceptable for repo + installer) |

**Quote from VRoid official FAQ** (CC0 sample models section):
> CC0. This model can be edited and used freely. Copyright is waived,
> and there is no particular limit when using them.

**Concrete next step**: open VRoid Studio (or VRoid Hub) → download
`AvatarSample_F.vrm`. Open the file in a VRM inspector (e.g. UniVRM
Inspector) and **screenshot the embedded license metadata** for the
attribution row. The embedded license MUST also say CC0 (avoiding
license divergence per the VRoid FAQ at
https://vroid.pixiv.help/hc/en-us/articles/360014960454).

### 🥈 Option 2: AliciaSolid / ニコニ立体ちゃん (not recommended)

| Field | Value |
|---|---|
| Candidate | `AliciaSolid_vrm-0.51.vrm` (≈7.9 MB, smaller than VRoid samples) |
| Author | キャラデザ: 黒星紅白 / ドワンゴ (株) |
| Source — 特設サイト | https://3d.nicovideo.jp/alicia/ |
| Source — 利用規約 | https://3d.nicovideo.jp/alicia/rule.html |
| Source — VRM 配布 | https://3d.nicovideo.jp/works/td32797 |
| Mirror (GitHub) | https://raw.githubusercontent.com/vrm-c/UniVRM/master/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm |
| Commercial use | 個人のみ (法人不可) |
| Attribution required | 表記不要 |
| Redistribution in installer | **不明 (グレー)** — 利用規約に第三者ソフトウェアへの同梱配布の明示条項なし |

**Quote from 利用規約 verbatim** (relevant clauses):
> 利用者 = 「個人の方（法人を除く団体を含む）」
> 「（１）当社キャラクターの二次創作物を作成すること。
>  （２）利用者自ら作成した当社キャラクターの二次創作物を複製、上演、上映、
>     公衆送信、展示その他販売・頒布すること。」

**Why not recommended**:
1. 「個人の方」限定。VCam を将来法人がフォーク・配布する場合に詰む。
2. インストーラ同梱が「VRM データの頒布」(認められる) に当たるか、
   それとも「商品同梱配布」(明示なし) に当たるか不明。
3. 仮に問題なくても、利用者を制限する条項がある時点で MIT ライセンス本体と
   非整合 (派生物に法人/個人の制限が漏れる)。
4. UniVRM がテスト用に同梱しているのは「テストフィクスチャ」(エンドユーザー
   配布ではなく開発者配布) なので前例として弱い。

採用には公式へのメール照会 (info@3d.nicovideo.jp 等) を経ることを推奨。

### 🥉 Option 3: VRoid Hub の任意 CC0 設定モデル (case-by-case)

| Field | Value |
|---|---|
| 探し方 | https://hub.vroid.com/en/license?redistribution=allow&modification=allow&corporate_commercial_use=allow&personal_commercial_use=allow&credit=unnecessary でフィルタ |
| License | クリエイターが個別設定 (CC0 / CC BY / 独自条件) |
| Notes | モデルごとに利用条件が異なる。再配布許可 + 法人商用許可 + クレジット不要 のフィルタを掛けると CC0 相当のみが残る |
| Concrete next step | 上記フィルタで残ったモデルから 1 つ選び、Option 1 と同様に in-VRM license metadata を確認 |

---

## Recommended action

Option 1 (VRoid Studio CC0 サンプル) で進める。理由：

1. **CC0 = 法的不確実性ゼロ** (パブリックドメイン献納)。インストーラ同梱・
   再配布・商用・改変いずれも明示的に無制限。
2. 公式 (pixiv) から直接配布されているため出典も追跡可能。
3. ファイルサイズ (~12MB) は repo +5-10MB 目標を超えるが、`.git` 1.4MB の
   現状からして GitHub Pages 100MB 上限・Tauri installer サイズとも問題なし。
4. CC0 故にクレジット不要だが、本ドキュメントに自主的な出典記録を残すことで
   将来の「これどこから来た?」問い合わせに即答できる。

---

## Removal procedure

If a model author later revokes redistribution permission:

1. Delete `public/samples/<filename>.vrm`
2. Remove the entry from this file
3. Cut a new VCam release without the asset
4. Notify users via CHANGELOG and GitHub release notes
