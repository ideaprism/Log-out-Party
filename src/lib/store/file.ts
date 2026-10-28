import fs from 'node:fs/promises';
import path from 'node:path';
import { EMPTY_CONFIG, type EventConfig, type Message } from '../types';
import type { Store } from './types';

/**
 * 로컬 개발 전용 저장소. .data/store.json 한 파일.
 * Vercel의 파일 시스템은 읽기 전용이라 운영에서는 쓸 수 없다 (getStore가 막는다).
 */
type Data = {
  config: EventConfig;
  messages: Record<string, Message>;
  visits: string[];
  rate: Record<string, { n: number; resetAt: number }>;
};

const FILE = path.join(process.cwd(), '.data', 'store.json');

export function createFileStore(): Store {
  // 한 프로세스 안에서 읽고-고치고-쓰기가 겹치지 않게 줄 세운다
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<Data> {
    try {
      const d = JSON.parse(await fs.readFile(FILE, 'utf8')) as Partial<Data>;
      return {
        config: { ...EMPTY_CONFIG, ...(d.config ?? {}) },
        messages: d.messages ?? {},
        visits: d.visits ?? [],
        rate: d.rate ?? {},
      };
    } catch {
      return { config: { ...EMPTY_CONFIG }, messages: {}, visits: [], rate: {} };
    }
  }

  async function save(d: Data) {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(d, null, 2), 'utf8');
  }

  function tx<T>(fn: (d: Data) => T | Promise<T>, write = false): Promise<T> {
    const run = queue.then(async () => {
      const d = await load();
      const out = await fn(d);
      if (write) await save(d);
      return out;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    kind: 'file',

    getConfig: () => tx((d) => d.config),
    setConfig: (next) => tx((d) => void (d.config = next), true),

    getMessage: (id) => tx((d) => d.messages[id] ?? null),
    putMessage: (m) => tx((d) => void (d.messages[m.id] = m), true),
    deleteMessage: (id) => tx((d) => void delete d.messages[id], true),
    listMessages: () =>
      tx((d) => Object.values(d.messages).sort((a, b) => a.createdAt.localeCompare(b.createdAt))),

    hit: (key, limit, windowSec) =>
      tx((d) => {
        const now = Date.now();
        const cur = d.rate[key];
        if (!cur || cur.resetAt <= now) d.rate[key] = { n: 1, resetAt: now + windowSec * 1000 };
        else cur.n += 1;
        return d.rate[key].n <= limit;
      }, true),

    addVisit: (h) => tx((d) => void (d.visits.includes(h) || d.visits.push(h)), true),
    countVisits: () => tx((d) => d.visits.length),
  };
}
