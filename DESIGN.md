# Design System — VCam

Created by `/design-consultation` on 2026-04-20. Preview: [`design-preview.html`](./design-preview.html).

## Product Context
- **What this is:** Web カメラ一台で VRM アバターを動かす VTuber / 配信者向けツール。ブラウザ版（Vite）とデスクトップ版（Tauri）。
- **Who it's for:** 個人 VTuber、カジュアル配信者、複数人コラボ配信。「Unity や専用機材は避けたい」「軽くて無料」を求める層。
- **Space/industry:** VTuber トラッキングツール。競合: VSeeFace / 3tene / Luppet（Japanese utilitarian desktop）、VTube Studio / Animaze（cartoon marketing）。
- **Project type:** デスクトップ／Web アプリ。3D キャンバスが主役、UI は heads-up display。ドキュメント型ではない。

## Aesthetic Direction
- **Direction:** Japanese × Artisan instrument（和 × 職人ツール）
- **Decoration level:** intentional — 装飾ではなく「機能の質感」として最小限のテクスチャ・細線・計器表記
- **Mood:** 深夜の配信機材棚に置かれた一台の精密オシロスコープ。派手な歓迎もチュートリアルもない。触るたびに少しだけ背筋が伸びる道具
- **Reference positioning:** Teenage Engineering / Nothing Phone / Field Notes の DNA を VTuber ツールに持ち込む
- **Anti-patterns (never do):** パープルグラデ、3列アイコングリッド、全センター、均一な丸角、グラデ CTA ボタン、「Built for VTubers」系のマーケコピー、アニメカワイイ装飾

## Typography

| Role | Font | Weight | Loading | Rationale |
|------|------|--------|---------|-----------|
| Display / Heading / Logo | **Klee One** | 600 | Google Fonts | 教科書体の柔らかい筆致、ゴシック一色の VTuber ツール界で唯一「手触り」がある |
| UI body (Japanese) | **BIZ UDPGothic** | 400 / 700 | Google Fonts | 役所書類ではなく「80 年代音響機器パネルの刻印」として再解釈。Meiryo / MS UI Gothic からの明確な昇格 |
| UI accent (Latin) | **Inter Tight** | 500 | Google Fonts | Japanese 併記時の欧文レンダリング用。overused 例外として許可 |
| Data / telemetry / code | **Berkeley Mono** (preferred, paid) / **JetBrains Mono** (free fallback) | 400 / 500 | Self-host (Berkeley) or Google Fonts (JetBrains) | 計器数値・座標・FPS・骨数を「機器の表示」として |

**Loading strategy:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=Klee+One:wght@400;600&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Scale (modular, base 14px):**
| Level | Size | Line height | Usage |
|-------|------|-------------|-------|
| display | 56px | 1.1 | Hero (Klee One) |
| h1 | 32px | 1.2 | Page headings |
| h2 | 24px | 1.3 | Section headings |
| h3 | 18px | 1.4 | Panel titles |
| body | 14px | 1.6 | Default UI / reading |
| small | 12px | 1.5 | Helper text, labels |
| tiny | 11px | 1.5 | Telemetry / monospace labels |
| micro | 10px | 1.4 | Keyboard hints, dense HUD |

## Color

**Approach:** restrained — 無彩色ベース + 1点豪華主義（蛍光緑）+ 警告用 1 色（鳥居朱）。

### Dark mode (primary — the app runs here)
```css
--canvas:         #0E0D0C;                       /* 炭 */
--surface:        rgba(20, 18, 16, 0.72);        /* 半透明 HUD */
--surface-opaque: #141210;                       /* ソリッド版 */
--elevated:       #1A1714;                       /* カード背景 */
--text:           #F0EAE0;                       /* 生成り和紙 */
--muted:          #8A8178;                       /* 石墨 */
--accent:         #B8FF3C;                       /* 蛍光テープ緑 */
--accent-dim:     rgba(184, 255, 60, 0.35);      /* アクセント発光 */
--warn:           #E8482C;                       /* 鳥居朱 */
--border:         rgba(240, 234, 224, 0.08);     /* 極細区切り */
--border-strong:  rgba(240, 234, 224, 0.16);
```

### Light mode (for docs / marketing surfaces only)
```css
--canvas:         #F4EFE6;
--surface:        rgba(255, 251, 243, 0.86);
--surface-opaque: #FBF6EC;
--elevated:       #FFFFFF;
--text:           #201C18;
--muted:          #756D64;
--accent:         #2A8F00;   /* 蛍光緑は光らせずに落ち着いた緑 */
--warn:           #C53311;
--border:         rgba(32, 28, 24, 0.08);
--border-strong:  rgba(32, 28, 24, 0.18);
```

### Semantic colors
- `success` = `--accent` (#B8FF3C / #2A8F00 で切替)
- `error` / `warning` = `--warn` (#E8482C / #C53311)
- `info` / `neutral` = `--muted`

### Usage rules
- **`--accent` は「動作中」のサインとしてしか使わない.** ボタン primary、トラッキング正常 dot、アクティブトグル枠線、フォーカスリング。装飾には絶対使わない
- **`--warn` は「録画中」「マイク ON」「破壊的操作」のみ.** 日常の赤字禁止
- **純黒 `#000` と純白 `#FFF` は使用禁止.** 目疲れと 3D 立体感のため

### Accessibility
- Colorblind 配慮: accent/warn 状態は色だけでなく形で区別（dot / square / icon 併用）
- コントラスト: `--text` on `--canvas` は 15.2:1、`--muted` on `--canvas` は 5.8:1 (AA 以上)

## Spacing
- **Base unit:** 4px
- **Density:** compact（VTuber ツールは情報密度高めが文化）
- **Scale:** 2xs=2 / xs=4 / sm=8 / md=12 / lg=16 / xl=24 / 2xl=32 / 3xl=48 / 4xl=72

| Context | Padding |
|---------|---------|
| HUD panel inner | 10px 14px |
| Button (default) | 8px 16px |
| Button (HUD compact) | 6px 10px |
| Input | 8px 12px |
| Card | 24px |
| Section gap | 64px |

## Layout
- **Approach:** hybrid — 3D キャンバスは聖域（中央を常に空ける）、HUD は画面四辺にフリー配置（ドラッグ可能、将来的に）、マーケ／docs surfaces はグリッド規律
- **Max content width (docs/marketing):** 1280px
- **HUD positioning rules:**
  - 左上: ステータス（アバター名 + トラッキング状態）
  - 右上: Web カム小窓（固定 200×150）+ 下にコントロールボタン列（幅 200px）
  - 左下: 設定パネル（開閉式、デフォルト閉）
  - 右下: マルチバース／ドロップゾーン（開閉式）
  - 下中央: テレメトリ帯（FPS / LAT / PEERS / REC）
- **Border radius:**
  - sm 2px (input, meter)
  - md 4px (button, HUD panel)
  - lg 8px (modal, card, sheet)
  - **9999px (pill / circle) は禁止** — 計器 DNA を壊すため

## Motion
- **Approach:** minimal-functional + 1 intentional accent
- **Easing:**
  - enter: `ease-out`
  - exit: `ease-in`
  - move/state: `ease-in-out`
- **Duration:**
  - micro: 50-100ms (hover)
  - short: 150-250ms (fade, slide-in)
  - medium: 250-400ms (modal)
  - long: 400-700ms (boot, page transition)
- **Breathing pulse:** `--accent` のみ 2.4s ease-in-out ループで opacity 1 ↔ 0.55。トラッキング正常時に静かに呼吸する唯一の動き。トラッキング失敗で即停止（状態の視覚化）

## Texture
- **SVG noise overlay** `feTurbulence baseFrequency=0.9, numOctaves=2` を 2-3% opacity で HUD surface と marketing 面に重ねる
- `mix-blend-mode: overlay` で dark/light 両対応
- GPU 負荷は初回 1 回のみ（cached）
- **canvas 上には置かない** — 3D レンダリングと干渉するため

## Sound (scope: future)
Subagent 提案より deferred:
- 起動時 0.8s 低周波チャイム（Teenage Engineering OP-1 の電源音系譜）
- スライダー操作時の擬似物理音（クリック）
- デフォルト OFF、設定で ON 可能

**Target phase:** v0.2 以降。Phase 6 scope 外。

## Anti-slop Checklist

毎回の PR で違反が無いか確認:
- [ ] パープル / 紫グラデーションを accent に使っていない
- [ ] 3 列アイコングリッドを採用していない
- [ ] 全センター配置になっていない（片寄りと非対称性を許容）
- [ ] 均一な border-radius 9999px / pill ボタンが無い
- [ ] グラデーション CTA ボタンが無い（flat fill のみ）
- [ ] 「Built for VTubers」「Designed for streamers」系マーケコピーが無い
- [ ] 絵文字アイコンを装飾目的で使っていない（機能明示のみ OK）
- [ ] 純黒 #000 / 純白 #FFF が無い

## File locations
- Design system source of truth: `DESIGN.md` (this file)
- Live preview: `design-preview.html`
- CLAUDE.md integration: "Design System" セクション参照

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-20 | Initial design system v0 created | `/design-consultation` run. Direction=Japanese×Artisan instrument based on competitive landscape analysis (VTuber tools category lacks "designer-made precision instrument" positioning — EUREKA logged) |
| 2026-04-20 | Accent = `#B8FF3C` breathing green only | Lifeline model: accent only fires when tracking is healthy, goes muted on failure. Chosen over 6-color subagent proposal for focus |
| 2026-04-20 | Klee One as heading font | Brush-texture softness in a category dominated by sans-serif — differentiator, matches "artisan tool" direction |
| 2026-04-20 | BIZ UDPGothic over system-ui | system-ui on Windows JP = Meiryo / MS UI Gothic, which degrade at small HUD sizes. BIZ UDPGothic has instrument-panel DNA |
| 2026-04-20 | Berkeley Mono as data font (preferred) | JetBrains Mono fallback if Berkeley license not available. Both have tabular-nums for telemetry alignment |
| 2026-04-20 | SVG grain texture at 2-3% opacity | Anti-slop: distinguishes from the "perfectly smooth" AI-generated look. Teenage Engineering / Field Notes DNA |
| 2026-04-20 | Audio feedback deferred to v0.2 | Subagent proposal — valuable but scope-expanding. Parked in TODOS |
| 2026-04-20 | "Practice mode" deferred | Subagent proposal — product scope change, not design scope. Parked as design brief for future product decision |
