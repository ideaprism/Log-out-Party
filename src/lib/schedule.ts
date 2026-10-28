import 'server-only';
import { isAdmin } from './admin';
import { ApiError } from './messages';
import { examPhase, type ExamSnapshot } from './phase';
import { getStore } from './store';
import type { EventConfig } from './types';

function snapshot(c: EventConfig, now: number): ExamSnapshot {
  const base = { openAt: c.liveOpenAt, startAt: c.liveStartAt, winner: c.liveWinnerName?.trim() || null };
  const phase = examPhase(base, now);
  return {
    now: new Date(now).toISOString(),
    ...base,
    url: phase === 'open' || phase === 'live' ? c.liveUrl : null,
  };
}

/** /api/exam — 카드가 시각을 맞추고 주소·우승자를 받아 가는 곳 */
export async function examSnapshot(): Promise<ExamSnapshot> {
  return snapshot(await getStore().getConfig(), Date.now());
}

/**
 * 첫 화면용. publishAt 전이면 일반 방문자에게는 안내만 보이도록 게시 시각을 함께 준다.
 * 관리자 쿠키가 있으면 통과.
 */
/** 의견서 API 앞단. 게시 전에는 화면처럼 API도 관리자만 쓴다. */
export async function assertPublished(): Promise<void> {
  const { publishAt } = await getStore().getConfig();
  if (publishAt && Date.now() < Date.parse(publishAt) && !(await isAdmin()))
    throw new ApiError(403, '아직 공고 전입니다.');
}

export async function pageSchedule(): Promise<{ exam: ExamSnapshot; unpublishedUntil: string | null }> {
  const c = await getStore().getConfig();
  const now = Date.now();
  const before = !!c.publishAt && now < Date.parse(c.publishAt);
  return {
    exam: snapshot(c, now),
    unpublishedUntil: before && !(await isAdmin()) ? c.publishAt : null,
  };
}
