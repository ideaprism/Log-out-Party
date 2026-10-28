import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** 단위 테스트 — 규칙만 본다. 저장소·쿠키는 tests/unit/setup.ts에서 메모리로 바꾼다. */
export default defineConfig({
  resolve: {
    alias: {
      '@content': path.resolve(import.meta.dirname, 'content'),
      '@': path.resolve(import.meta.dirname, 'src'),
      // 'server-only'는 서버 컴포넌트 밖에서 import하면 던진다. 테스트에서는 빈 모듈로.
      'server-only': path.resolve(import.meta.dirname, 'tests/unit/empty.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.ts'],
  },
});
