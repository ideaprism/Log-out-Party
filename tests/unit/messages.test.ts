import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, edit, feed, hashToken, mine, remove, submit, visit } from '@/lib/messages';
import { mem } from './setup';

const A = 'device-token-aaaaaaaaaaaa';
const B = 'device-token-bbbbbbbbbbbb';
const IP = '10.0.0.1';

const post = (over: Record<string, unknown> = {}, ip = IP) =>
  submit({ token: A, name: '김동료', dept: 'IP정보확산실', body: '고생 많으셨습니다', consent: true, ...over }, ip);

async function rejects(p: Promise<unknown>, status: number, text?: string) {
  const e = await p.then(
    () => null,
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(ApiError);
  expect((e as ApiError).status).toBe(status);
  if (text) expect((e as ApiError).message).toContain(text);
}

afterEach(() => vi.useRealTimers());

describe('의견서 작성', () => {
  it('저장은 기기 해시만, 응답에는 해시도 토큰도 없다', async () => {
    const m = await post();
    expect(m).not.toHaveProperty('deviceHash');
    expect(JSON.stringify(m)).not.toContain(A);
    const saved = mem.messages.get(m.id)!;
    expect(saved.deviceHash).toBe(hashToken(A));
    expect(JSON.stringify(saved)).not.toContain(A);
    expect(m.canEdit).toBe(true);
  });

  it('필수 칸과 동의를 확인한다', async () => {
    await rejects(post({ name: '   ' }), 400, '이름');
    await rejects(post({ body: '' }), 400, '메시지');
    await rejects(post({ consent: false }), 400, '동의');
    await rejects(post({ token: 'short' }), 400);
  });

  it('300자 한도는 사람이 세는 글자로 — 이모지 1개가 1자', async () => {
    await expect(post({ body: '🙏'.repeat(300) })).resolves.toBeTruthy();
    await rejects(post({ token: B, body: '🙏'.repeat(301) }), 400, '300자');
  });

  it('제어문자를 걷고 빈 줄은 두 줄까지만', async () => {
    const m = await post({ body: '첫줄\u0007\n\n\n\n둘째 줄  ' });
    expect(m.body).toBe('첫줄\n\n둘째 줄');
  });

  it('부서는 비워도 되고, 사번·전화 같은 다른 칸은 저장하지 않는다', async () => {
    const m = await post({ dept: '', empNo: '26005', phone: '010-1234-5678' });
    expect(m.dept).toBeNull();
    const saved = JSON.stringify(mem.messages.get(m.id));
    expect(saved).not.toContain('26005');
    expect(saved).not.toContain('010-1234-5678');
  });

  it('기기당 10분 5건', async () => {
    for (let i = 0; i < 5; i++) await post();
    await rejects(post(), 429);
  });

  it('같은 IP(사내 공유기)는 10분 40건까지 여러 기기가 쓸 수 있다', async () => {
    for (let i = 0; i < 40; i++) await post({ token: `device-token-${String(i).padStart(12, '0')}` });
    await rejects(post({ token: 'device-token-zzzzzzzzzzzz' }), 429);
    await expect(post({ token: 'device-token-zzzzzzzzzzzz' }, '10.0.0.2')).resolves.toBeTruthy();
  });
});

describe('피드', () => {
  it('공개·숨김 아님만, 선정 먼저 → 최신순', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-19T01:00:00Z'));
    const old = await post({ name: '옛글' });
    vi.setSystemTime(new Date('2026-12-19T02:00:00Z'));
    const mid = await post({ name: '중간' });
    vi.setSystemTime(new Date('2026-12-19T03:00:00Z'));
    await post({ name: '새글' });
    await post({ name: '비공개', visibility: 'private' });
    const hidden = await post({ name: '숨김' });
    mem.messages.get(hidden.id)!.hidden = true;
    mem.messages.get(old.id)!.picked = true;

    const f = await feed(0);
    expect(f.items.map((m) => m.name)).toEqual(['옛글', '새글', '중간']);
    expect(f.total).toBe(3);
    expect(f.items.every((m) => !('deviceHash' in m) && !('visibility' in m))).toBe(true);
    expect(mid).toBeTruthy();
  });

  it('20건씩 나눠 준다', async () => {
    for (let i = 0; i < 25; i++) await post({ token: `device-token-${String(i).padStart(12, '0')}` });
    const p1 = await feed(0);
    expect(p1.items).toHaveLength(20);
    expect(p1.next).toBe(20);
    const p2 = await feed(20);
    expect(p2.items).toHaveLength(5);
    expect(p2.next).toBeNull();
  });
});

describe('내 의견서 · 수정 · 삭제', () => {
  it('내 기기 글만, 비공개도 보인다', async () => {
    await post({ visibility: 'private' });
    await post({ token: B });
    const list = await mine({ token: A });
    expect(list).toHaveLength(1);
    expect(list[0].visibility).toBe('private');
  });

  it('남의 글은 수정·삭제 모두 "없음"(404)', async () => {
    const m = await post();
    await rejects(edit(m.id, { token: B, body: '바꿈', visibility: 'public' }), 404);
    await rejects(remove(m.id, { token: B }), 404);
    await rejects(edit('no-such-id', { token: A, body: '바꿈', visibility: 'public' }), 404);
  });

  it('수정은 작성 후 24시간까지', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-19T01:00:00Z'));
    const m = await post();
    vi.setSystemTime(new Date('2026-12-20T00:59:59Z'));
    const e = await edit(m.id, { token: A, body: '고친 글', visibility: 'private' });
    expect(e.body).toBe('고친 글');
    expect(e.edited).toBe(true);
    vi.setSystemTime(new Date('2026-12-20T01:00:00Z'));
    await rejects(edit(m.id, { token: A, body: '또 고침', visibility: 'public' }), 403, '24시간');
  });

  it('숨긴 글은 고칠 수 없다', async () => {
    const m = await post();
    mem.messages.get(m.id)!.hidden = true;
    await rejects(edit(m.id, { token: A, body: '바꿈', visibility: 'public' }), 403);
  });

  it('선정된 글은 지울 수 없고, 아니면 지워진다', async () => {
    const picked = await post();
    mem.messages.get(picked.id)!.picked = true;
    await rejects(remove(picked.id, { token: A }), 403);
    const plain = await post();
    await remove(plain.id, { token: A });
    expect(mem.messages.has(plain.id)).toBe(false);
  });
});

describe('방문 수', () => {
  it('기기당 한 번', async () => {
    await visit({ token: A });
    await visit({ token: A });
    await visit({ token: B });
    expect(mem.visits.size).toBe(2);
  });
});
