import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // DOM 配線モジュールはユニットテスト困難なため除外するが、テスト済みの
      // status.ts (escapeHtml — セキュリティ関数) と peerPanel.ts はカバレッジ対象に含める。
      exclude: ['src/main.ts', 'src/ui/controls.ts', 'src/ui/dropZone.ts', 'src/ui/settingsPanel.ts'],
      reporter: ['text', 'html'],
    },
  },
});
