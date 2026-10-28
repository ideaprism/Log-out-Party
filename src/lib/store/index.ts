import 'server-only';
import { createFileStore } from './file';
import { createRedisStore } from './redis';
import type { Store } from './types';

let store: Store | null = null;

/**
 * Vercel Marketplace의 Upstash 연동은 KV_REST_API_* 이름으로, Upstash 콘솔은 UPSTASH_REDIS_REST_*
 * 이름으로 환경변수를 넣는다. 둘 다 받는다. 없으면 로컬 파일 — 단 Vercel 위에서는 멈춘다.
 */
export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    store = createRedisStore(url, token);
  } else if (process.env.VERCEL) {
    throw new Error('저장소 환경변수가 없습니다. Vercel 대시보드 → Storage에서 Upstash Redis를 연결하세요.');
  } else {
    store = createFileStore();
  }
  return store;
}

export type { Store };
