import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { ApiError } from './messages';
import { getStore } from './store';

export const ADMIN_COOKIE = 'fw_admin';

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

function same(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * 쿠키에는 ADMIN_KEY 자체가 아니라 그 해시를 담는다. 키가 없으면 관리자도 없다.
 * 쿠키가 새면 ADMIN_KEY를 바꾸면 된다 — 바꾸는 순간 기존 쿠키가 모두 무효가 된다.
 */
export function adminCookieValue(): string | null {
  const key = process.env.ADMIN_KEY;
  return key ? sha(`fw-admin:${key}`) : null;
}

export async function isAdmin(): Promise<boolean> {
  const want = adminCookieValue();
  const got = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!want && !!got && same(got, want);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new ApiError(401, '관리자 로그인이 필요합니다.');
}

/** 로그인. IP당 10분에 10번까지만 시도할 수 있다. */
export async function login(input: unknown, ip: string): Promise<void> {
  const want = adminCookieValue();
  if (!want) throw new ApiError(503, 'ADMIN_KEY 환경변수가 없습니다.');
  if (!(await getStore().hit(`admin:${ip}`, 10, 600))) throw new ApiError(429, '잠시 후 다시 시도해 주세요.');

  const key = typeof input === 'object' && input && 'key' in input ? String(input.key) : '';
  if (!same(sha(`fw-admin:${key}`), want)) throw new ApiError(401, '관리자 키가 맞지 않습니다.');

  (await cookies()).set(ADMIN_COOKIE, want, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 메신저 링크로 /admin을 열어도 로그인이 유지되게. 쓰기는 JSON POST라 교차 사이트로 오지 않는다
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
