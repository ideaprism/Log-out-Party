import { describe, expect, it } from 'vitest';
import { ADMIN_COOKIE, adminCookieValue, isAdmin, login, logout, requireAdmin } from '@/lib/admin';
import { adminState, exportCsv, moderate, saveSchedule, setWinner } from '@/lib/adminOps';
import { ApiError, submit } from '@/lib/messages';
import { assertPublished, examSnapshot, pageSchedule } from '@/lib/schedule';
import { jar, mem } from './setup';

async function rejects(p: Promise<unknown>, status: number, text?: string) {
  const e = await p.then(
    () => null,
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(ApiError);
  expect((e as ApiError).status).toBe(status);
  if (text) expect((e as ApiError).message).toContain(text);
}

const signIn = () => jar.set(ADMIN_COOKIE, adminCookieValue()!);

let n = 0;
const write = (over: Record<string, unknown> = {}) =>
  submit(
    {
      token: `device-token-${String(n++).padStart(12, '0')}`,
      name: '김동료',
      body: '고생 많으셨습니다',
      consent: true,
      ...over,
    },
    `10.0.${n}.1`,
  );

const day = { dDay: '2026-12-19', publish: '09:00', open: '12:45', start: '12:50', pickDeadline: '16:00' };

describe('관리자 로그인', () => {
  it('ADMIN_KEY가 없으면 관리자도 없다', async () => {
    delete process.env.ADMIN_KEY;
    expect(adminCookieValue()).toBeNull();
    await rejects(login({ key: '' }, '1.1.1.1'), 503);
    expect(await isAdmin()).toBe(false);
  });

  it('틀린 키는 401, 맞는 키는 해시 쿠키', async () => {
    await rejects(login({ key: 'wrong' }, '1.1.1.1'), 401);
    expect(jar.size).toBe(0);
    await login({ key: 'unit-test-admin-key' }, '1.1.1.1');
    expect(jar.get(ADMIN_COOKIE)).toBe(adminCookieValue());
    expect(jar.get(ADMIN_COOKIE)).not.toContain('unit-test-admin-key');
    expect(await isAdmin()).toBe(true);
    await logout();
    expect(await isAdmin()).toBe(false);
  });

  it('IP당 10분 10번까지만 시도', async () => {
    for (let i = 0; i < 10; i++) await rejects(login({ key: 'wrong' }, '2.2.2.2'), 401);
    await rejects(login({ key: 'unit-test-admin-key' }, '2.2.2.2'), 429);
  });

  it('키를 바꾸면 기존 쿠키는 무효', async () => {
    signIn();
    process.env.ADMIN_KEY = 'rotated-key';
    expect(await isAdmin()).toBe(false);
    await rejects(requireAdmin(), 401);
  });
});

describe('일정 저장', () => {
  it('KST 시각을 UTC로 저장한다', async () => {
    const c = await saveSchedule({ ...day, liveUrl: ' https://ox.example.com ' });
    expect(c.publishAt).toBe('2026-12-19T00:00:00.000Z');
    expect(c.liveOpenAt).toBe('2026-12-19T03:45:00.000Z');
    expect(c.liveStartAt).toBe('2026-12-19T03:50:00.000Z');
    expect(c.pickDeadlineAt).toBe('2026-12-19T07:00:00.000Z');
    expect(c.liveUrl).toBe('https://ox.example.com');
  });

  it('게시 ≤ 입장 ≤ 시작 ≤ 선정 마감 순서, https 주소만', async () => {
    await rejects(saveSchedule({ ...day, open: '12:55', liveUrl: '' }), 400, '순서');
    await rejects(saveSchedule({ ...day, liveUrl: 'http://ox.example.com' }), 400, 'https');
    await rejects(saveSchedule({ ...day, start: '25:00', liveUrl: '' }), 400);
    expect((await saveSchedule({ ...day, liveUrl: '' })).liveUrl).toBeNull();
  });

  it('D 미정으로 되돌리면 시각만 지우고 주소·우승자는 남긴다', async () => {
    await saveSchedule({ ...day, liveUrl: 'https://ox.example.com' });
    await setWinner({ name: '홍길동' });
    const c = await saveSchedule({ dDay: null });
    expect([c.dDay, c.publishAt, c.liveOpenAt, c.liveStartAt, c.pickDeadlineAt]).toEqual([null, null, null, null, null]);
    expect(c.liveUrl).toBe('https://ox.example.com');
    expect(c.liveWinnerName).toBe('홍길동');
  });
});

describe('우승자', () => {
  it('앞뒤 공백을 걷고, 빈 값·null은 지우기, 20자 한도', async () => {
    expect((await setWinner({ name: '  홍길동 ' })).liveWinnerName).toBe('홍길동');
    expect((await setWinner({ name: '' })).liveWinnerName).toBeNull();
    await setWinner({ name: '홍길동' });
    expect((await setWinner({ name: null })).liveWinnerName).toBeNull();
    await rejects(setWinner({ name: '가'.repeat(21) }), 400);
  });
});

describe('숨김 · 선정', () => {
  it('선정은 2편까지', async () => {
    const [a, b, c] = [await write(), await write(), await write()];
    await moderate(a.id, { picked: true });
    await moderate(b.id, { picked: true });
    await rejects(moderate(c.id, { picked: true }), 409, '2편');
    await moderate(a.id, { picked: false });
    await expect(moderate(c.id, { picked: true })).resolves.toMatchObject({ picked: true });
  });

  it('선정 마감 이후 제출분은 선정할 수 없다', async () => {
    mem.config.pickDeadlineAt = new Date(Date.now() - 1000).toISOString();
    const late = await write();
    expect((await adminState()).messages[0].eligible).toBe(false);
    await rejects(moderate(late.id, { picked: true }), 409, '선정 마감');
  });

  it('숨긴 글은 선정 불가, 선정된 글은 숨김 불가, 함께 풀고 숨기면 된다', async () => {
    const m = await write();
    await moderate(m.id, { hidden: true });
    await rejects(moderate(m.id, { picked: true }), 409, '숨긴');
    await moderate(m.id, { hidden: false });
    await moderate(m.id, { picked: true });
    await rejects(moderate(m.id, { hidden: true }), 409, '숨길 수 없');
    await expect(moderate(m.id, { picked: false, hidden: true })).resolves.toMatchObject({ picked: false, hidden: true });
  });

  it('관리자 조작은 작성자의 수정 시각을 바꾸지 않는다 ("수정됨"이 붙지 않게)', async () => {
    const m = await write();
    await moderate(m.id, { picked: true });
    const saved = mem.messages.get(m.id)!;
    expect(saved.updatedAt).toBe(saved.createdAt);
  });

  it('없는 글은 404, 바꿀 항목이 없으면 400', async () => {
    await rejects(moderate('nope', { hidden: true }), 404);
    const m = await write();
    await rejects(moderate(m.id, {}), 400);
  });
});

describe('현황 · 내보내기', () => {
  it('현황 숫자와 목록에 기기 해시가 나가지 않는다', async () => {
    await write();
    await write({ visibility: 'private' });
    const h = await write();
    await moderate(h.id, { hidden: true });
    const st = await adminState();
    expect(st.stats).toMatchObject({ total: 3, public: 2, private: 1, hidden: 1, picked: 0 });
    expect(st.messages.some((m) => 'deviceHash' in m)).toBe(false);
  });

  it('CSV — BOM, 따옴표·줄바꿈 감싸기, 엑셀 수식 주입 막기', async () => {
    await write({ name: '=HYPERLINK("x")', body: '첫 줄\n"둘째" 줄, 끝' });
    const csv = await exportCsv();
    expect(csv.startsWith('﻿작성 시각(KST),이름,')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"첫 줄\n""둘째"" 줄, 끝"');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});

describe('게시 전 게이트 · 심사 공고 스냅숏', () => {
  it('게시 전에는 일반 방문자 403, 관리자는 통과, 게시 후에는 모두', async () => {
    mem.config.publishAt = new Date(Date.now() + 60_000).toISOString();
    await rejects(assertPublished(), 403);
    expect((await pageSchedule()).unpublishedUntil).toBe(mem.config.publishAt);
    signIn();
    await expect(assertPublished()).resolves.toBeUndefined();
    expect((await pageSchedule()).unpublishedUntil).toBeNull();
    jar.clear();
    mem.config.publishAt = new Date(Date.now() - 60_000).toISOString();
    await expect(assertPublished()).resolves.toBeUndefined();
  });

  it('라이브 주소는 입장 시각부터만 싣는다', async () => {
    const now = Date.now();
    mem.config.liveUrl = 'https://ox.example.com';
    mem.config.liveOpenAt = new Date(now + 60_000).toISOString();
    mem.config.liveStartAt = new Date(now + 360_000).toISOString();
    expect((await examSnapshot()).url).toBeNull();
    mem.config.liveOpenAt = new Date(now - 60_000).toISOString();
    expect((await examSnapshot()).url).toBe('https://ox.example.com');
    mem.config.liveWinnerName = '홍길동';
    expect((await examSnapshot()).url).toBeNull();
  });
});
