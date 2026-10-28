import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { E2E } from '../../playwright.config';
import { EMPTY_CONFIG, type EventConfig, type Message } from '../../src/lib/types';

/** 파일 저장소는 요청마다 파일을 다시 읽으므로, 테스트가 파일을 직접 써서 상태를 만든다. */
export function seed(config: Partial<EventConfig> = {}, messages: Partial<Message>[] = []) {
  const file = path.resolve(E2E.storeFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const now = Date.now();
  const msgs = Object.fromEntries(
    messages.map((m, i) => {
      const at = new Date(now - (messages.length - i) * 60_000).toISOString();
      const full: Message = {
        id: `seed-${i}`,
        deviceHash: `seed-hash-${i}`,
        name: `동료${i}`,
        dept: null,
        body: `의견서 ${i}`,
        visibility: 'public',
        hidden: false,
        picked: false,
        createdAt: at,
        updatedAt: at,
        ...m,
      };
      return [full.id, full];
    }),
  );
  fs.writeFileSync(file, JSON.stringify({ config: { ...EMPTY_CONFIG, ...config }, messages: msgs, visits: [], rate: {} }));
}

export function readStore(): { config: EventConfig; messages: Record<string, Message> } {
  return JSON.parse(fs.readFileSync(path.resolve(E2E.storeFile), 'utf8'));
}

export async function adminLogin(request: APIRequestContext) {
  const r = await request.post('/api/admin/login', { data: { key: E2E.adminKey } });
  if (!r.ok()) throw new Error(`관리자 로그인 실패 ${r.status()}`);
}

/** 페이드 대상까지 화면에 들어오게 끝까지 한 번 훑는다 */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
}

export const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
