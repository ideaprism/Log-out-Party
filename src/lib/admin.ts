import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'fw_admin';

/** 쿠키에는 ADMIN_KEY 자체가 아니라 그 해시를 담는다. 키가 없으면 관리자도 없다. */
export function adminCookieValue(): string | null {
  const key = process.env.ADMIN_KEY;
  return key ? crypto.createHash('sha256').update(`fw-admin:${key}`).digest('hex') : null;
}

export async function isAdmin(): Promise<boolean> {
  const want = adminCookieValue();
  const got = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!want || !got || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
