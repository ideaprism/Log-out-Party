'use client';

/*
 * 브라우저 쪽 도우미. localStorage는 사생활 모드·차단 설정에서 던질 수 있으므로 전부 감싼다.
 * 저장이 안 되면 이번 방문 동안만 메모리에 둔다 (그 경우 다음 방문엔 수정·삭제를 못 한다).
 */

let memToken: string | null = null;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장 불가 — 메모리만 */
  }
}

/** 이 기기의 익명 토큰. 내 의견서를 알아보고 고치는 데만 쓴다. */
export function deviceToken(): string {
  const saved = safeGet('fw.device');
  if (saved) return saved;
  if (!memToken) memToken = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
  safeSet('fw.device', memToken);
  return memToken;
}

export type Author = { name: string; dept: string; deptOther: string };

export function loadAuthor(): Author | null {
  try {
    const raw = safeGet('fw.author');
    return raw ? (JSON.parse(raw) as Author) : null;
  } catch {
    return null;
  }
}

export function saveAuthor(a: Author) {
  safeSet('fw.author', JSON.stringify(a));
}

/** JSON API 호출. 실패하면 서버가 준 문구로 던진다. */
export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? '잠시 후 다시 시도해 주세요.');
  return data as T;
}

/** 사람이 세는 글자 수 */
export const charCount = (s: string) => Array.from(s).length;
