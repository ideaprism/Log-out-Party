import { defineConfig } from '@playwright/test';

/*
 * E2E — 운영 빌드(next build → next start)를 3100번에 띄워 375×812 폰 화면으로 본다.
 * 저장소는 .data/e2e-store.json, 관리자 키는 아래 테스트 값. 개발 서버(3000)·개발 데이터와 섞이지 않는다.
 * 브라우저는 이 PC에 깔린 Chrome을 쓴다 (Playwright 브라우저를 따로 받지 않는다).
 */

export const E2E = {
  port: 3100,
  storeFile: '.data/e2e-store.json',
  adminKey: 'e2e-admin-key-not-secret',
};

export default defineConfig({
  testDir: 'tests/e2e',
  // 저장소 파일 하나를 같이 쓰므로 한 줄로
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${E2E.port}`,
    channel: 'chrome',
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx next start -p ${E2E.port}`,
    url: `http://localhost:${E2E.port}/api/exam`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { STORE_FILE: E2E.storeFile, ADMIN_KEY: E2E.adminKey, SITE_URL: `http://localhost:${E2E.port}` },
  },
});
