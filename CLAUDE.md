# CLAUDE.md — VCam

Project-level instructions for AI agents working in this repo.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border radii, motion rules, and aesthetic
direction are defined there.

- **Do not deviate from `DESIGN.md` without explicit user approval.**
- In `/qa` / `/design-review` mode, flag any code that doesn't match `DESIGN.md`.
- When writing new UI components, quote the relevant `DESIGN.md` section in
  code review justifications.
- If you believe `DESIGN.md` is wrong for a given case, propose an amendment
  via an AskUserQuestion — do not silently override.

Key rules to internalize (full details in `DESIGN.md`):
- **No purple/violet gradients, no pill buttons, no 3-column icon grids**
- **`#B8FF3C` accent only appears when tracking is healthy** (breathing pulse 2.4s)
- **`#E8482C` warn only for record / mic-on / destructive actions**
- **No `#000` pure black, no `#FFF` pure white** — use `#0E0D0C` / `#F0EAE0`
- **Typography: Klee One (display), BIZ UDPGothic (UI body JP), Inter Tight (UI Latin), Berkeley Mono → JetBrains Mono (data)**

Preview rendering of the design system: `design-preview.html` (open in browser
to see fonts, colors, and mock app UI).

## Testing

Test framework: **Vitest** (unit) + **Playwright** (E2E)
- Unit tests: `npm run test` — `tests/unit/*.test.ts`
- E2E tests: `npm run test:e2e` — `tests/e2e/*.spec.ts`
- Type check: `npm run typecheck`

All new features must ship with unit tests. E2E coverage required for user
flows (camera permission, VRM load, multiverse connect, settings persistence).

## Stack
- Vite 5 + TypeScript 5 (strict mode)
- three.js 0.160 + @pixiv/three-vrm 3.1
- @mediapipe/face_mesh + pose (CDN scripts, UMD-only)
- kalidokit 1.1 (rig solver)
- peerjs 1.5 (WebRTC multiverse)
- Tauri 2 (desktop shell)

## Build
- `npm run dev` — browser dev server
- `npm run tauri:dev` — desktop dev (Rust build 5-10 min first time)
- `npm run build` — production web build → `dist/`
- CI builds Tauri installers via `tauri-action` on release tags

## Repo ownership
Solo maintainer mode. Proactively flag and fix issues outside the current
branch's scope when noticed (test failures, deprecations, dead code).
