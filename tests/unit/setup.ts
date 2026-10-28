import { beforeEach, vi } from 'vitest';
import type { Store } from '@/lib/store/types';
import { EMPTY_CONFIG, type EventConfig, type Message } from '@/lib/types';

/*
 * 저장소는 메모리로, next/headers의 쿠키는 테스트가 고칠 수 있는 항아리로 바꾼다.
 * 각 테스트 전에 비운다. 개발용 .data/store.json은 건드리지 않는다.
 */

export const mem = {
  config: { ...EMPTY_CONFIG } as EventConfig,
  messages: new Map<string, Message>(),
  visits: new Set<string>(),
  rate: new Map<string, { n: number; resetAt: number }>(),
};

export const jar = new Map<string, string>();

const store: Store = {
  kind: 'file',
  getConfig: async () => ({ ...mem.config }),
  setConfig: async (c) => void (mem.config = { ...c }),
  getMessage: async (id) => (mem.messages.has(id) ? { ...mem.messages.get(id)! } : null),
  putMessage: async (m) => void mem.messages.set(m.id, { ...m }),
  deleteMessage: async (id) => void mem.messages.delete(id),
  listMessages: async () => [...mem.messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  hit: async (key, limit, windowSec) => {
    const now = Date.now();
    const cur = mem.rate.get(key);
    if (!cur || cur.resetAt <= now) mem.rate.set(key, { n: 1, resetAt: now + windowSec * 1000 });
    else cur.n += 1;
    return mem.rate.get(key)!.n <= limit;
  },
  addVisit: async (h) => void mem.visits.add(h),
  countVisits: async () => mem.visits.size,
};

vi.mock('@/lib/store', () => ({ getStore: () => store }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

beforeEach(() => {
  mem.config = { ...EMPTY_CONFIG };
  mem.messages.clear();
  mem.visits.clear();
  mem.rate.clear();
  jar.clear();
  vi.useRealTimers();
  process.env.ADMIN_KEY = 'unit-test-admin-key';
});
