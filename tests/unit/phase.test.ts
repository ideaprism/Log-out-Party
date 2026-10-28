import { describe, expect, it } from 'vitest';
import { examPhase, kstDayEnd, kstDaysUntil } from '@/lib/phase';

// D일 2026-12-19, 입장 12:45 KST, 1번 문항 12:50 KST
const openAt = '2026-12-19T03:45:00.000Z';
const startAt = '2026-12-19T03:50:00.000Z';
const at = (iso: string) => Date.parse(iso);
const s = { openAt, startAt, winner: null };

describe('examPhase — 【심사 공고】 상태', () => {
  it('일정이 없으면 미정', () => {
    expect(examPhase({ openAt: null, startAt: null, winner: null }, Date.now())).toBe('unscheduled');
  });

  it('입장 시각 전은 예고, 입장~시작은 입장, 시작 후 D일 자정까지 진행', () => {
    expect(examPhase(s, at('2026-12-19T03:44:59.999Z'))).toBe('teaser');
    expect(examPhase(s, at(openAt))).toBe('open');
    expect(examPhase(s, at('2026-12-19T03:49:59.999Z'))).toBe('open');
    expect(examPhase(s, at(startAt))).toBe('live');
    expect(examPhase(s, at('2026-12-19T14:59:59.999Z'))).toBe('live'); // 23:59:59 KST
  });

  it('D일이 지나도 우승자가 없으면 대기', () => {
    expect(examPhase(s, at('2026-12-19T15:00:00.000Z'))).toBe('pending'); // 12/20 00:00 KST
  });

  it('우승자가 입력되면 언제든 결과', () => {
    expect(examPhase({ ...s, winner: '홍길동' }, at('2026-12-19T03:51:00.000Z'))).toBe('result');
    expect(examPhase({ ...s, winner: '홍길동' }, at('2027-03-01T00:00:00.000Z'))).toBe('result');
  });

  it('입장 시각이 비면 시작 시각에 바로 진행', () => {
    const noOpen = { openAt: null, startAt, winner: null };
    expect(examPhase(noOpen, at('2026-12-19T03:49:00.000Z'))).toBe('teaser');
    expect(examPhase(noOpen, at(startAt))).toBe('live');
  });
});

describe('KST 날짜 계산', () => {
  it('D일 자정은 KST 기준', () => {
    expect(new Date(kstDayEnd(startAt)).toISOString()).toBe('2026-12-19T15:00:00.000Z');
  });

  it('D-n은 KST 날짜가 바뀌는 순간 줄어든다 (UTC 자정이 아니라)', () => {
    expect(kstDaysUntil(startAt, at('2026-12-17T15:00:00.000Z'))).toBe(1); // 12/18 00:00 KST
    expect(kstDaysUntil(startAt, at('2026-12-18T14:59:59.000Z'))).toBe(1); // 12/18 23:59 KST
    expect(kstDaysUntil(startAt, at('2026-12-18T15:00:00.000Z'))).toBe(0); // 12/19 00:00 KST
  });
});
