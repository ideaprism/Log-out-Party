/*
 * 【심사 공고】 카드 상태 (PRD 4.1·6.4). 수동 버튼 없이 시각으로만 바뀐다.
 * 서버와 브라우저가 같은 함수로 계산한다 — 브라우저는 서버 시각으로 보정한 시계를 넣는다.
 *
 *   unscheduled  일정 미정. 예고만
 *   teaser       ~ 입장 시각(12:45). 카운트다운
 *   open         12:45 ~ 12:50. [심사장 입장]
 *   live         12:50 ~ D일 자정. 관전 안내 + 입장 버튼 유지
 *   pending      D일이 지났는데 우승자 미입력
 *   result       우승자 입력됨. 등록 결정 (D일 이후에도 이것만 남는다)
 */

export type ExamPhase = 'unscheduled' | 'teaser' | 'open' | 'live' | 'pending' | 'result';

/** 브라우저로 나가는 일정. 라이브 주소는 입장 시각부터만 싣는다 (QR에는 앱 주소만). */
export type ExamSnapshot = {
  now: string;
  openAt: string | null;
  startAt: string | null;
  url: string | null;
  winner: string | null;
};

const KST = 9 * 3600_000;
const DAY = 86_400_000;

const kstDay = (ms: number) => Math.floor((ms + KST) / DAY);

/** iso가 속한 KST 날짜가 끝나는 순간 (다음 날 00:00 KST) */
export function kstDayEnd(iso: string): number {
  return (kstDay(Date.parse(iso)) + 1) * DAY - KST;
}

/** 오늘(KST)부터 iso의 날짜까지 며칠 남았나 — D-n의 n */
export function kstDaysUntil(iso: string, now: number): number {
  return kstDay(Date.parse(iso)) - kstDay(now);
}

export function examPhase(s: Pick<ExamSnapshot, 'openAt' | 'startAt' | 'winner'>, now: number): ExamPhase {
  if (s.winner) return 'result';
  if (!s.startAt) return 'unscheduled';
  const start = Date.parse(s.startAt);
  const open = s.openAt ? Date.parse(s.openAt) : start;
  if (now < open) return 'teaser';
  if (now < start) return 'open';
  if (now < kstDayEnd(s.startAt)) return 'live';
  return 'pending';
}
