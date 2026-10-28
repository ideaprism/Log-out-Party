import 'server-only';
import { NextResponse } from 'next/server';
import { requireAdmin } from './admin';
import { ApiError } from './messages';
import { assertPublished } from './schedule';

/** 라우트 공통: ApiError는 그 상태와 문구로, 나머지는 500으로 돌려준다. */
export async function handle<T>(fn: () => Promise<T>, status = 200) {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true }, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, '잘못된 요청입니다.');
  }
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

/** 관리자 라우트: 쿠키를 먼저 확인한다 */
export function adminHandle<T>(fn: () => Promise<T>) {
  return handle(async () => {
    await requireAdmin();
    return fn();
  });
}

/** 의견서·방문 라우트: 게시 전이면 관리자만 통과 */
export function publicHandle<T>(fn: () => Promise<T>, status = 200) {
  return handle(async () => {
    await assertPublished();
    return fn();
  }, status);
}
