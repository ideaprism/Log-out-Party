import 'server-only';
import { z } from 'zod';
import { formatKST, kstToISO } from './kst';
import { NAME_MAX } from './limits';
import { ApiError } from './messages';
import { getStore } from './store';
import type { AdminMessage, AdminState, EventConfig, Message } from './types';

/*
 * 관리자 일 (PRD 9). 호출 전에 requireAdmin()을 거친다 — 라우트에서.
 * 숨김은 삭제 대신이다. 관리자도 글을 지우지 않는다.
 */

export const PICK_MAX = 2;

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new ApiError(400, r.error.issues[0]?.message ?? '입력을 확인해 주세요.');
  return r.data;
}

const eligible = (m: Message, c: EventConfig) => !c.pickDeadlineAt || m.createdAt < c.pickDeadlineAt;

function toAdmin(m: Message, c: EventConfig): AdminMessage {
  const { deviceHash: _, ...rest } = m;
  return { ...rest, eligible: eligible(m, c) };
}

export async function adminState(): Promise<AdminState> {
  const store = getStore();
  const [config, all, visits] = await Promise.all([store.getConfig(), store.listMessages(), store.countVisits()]);
  return {
    now: new Date().toISOString(),
    config,
    stats: {
      visits,
      total: all.length,
      public: all.filter((m) => m.visibility === 'public').length,
      private: all.filter((m) => m.visibility === 'private').length,
      hidden: all.filter((m) => m.hidden).length,
      picked: all.filter((m) => m.picked).length,
    },
    messages: all
      .sort((a, b) => Number(b.picked) - Number(a.picked) || b.createdAt.localeCompare(a.createdAt))
      .map((m) => toAdmin(m, config)),
  };
}

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '시각은 HH:MM으로 적어 주세요.');

const ScheduleInput = z.union([
  // D 미정으로 되돌리기
  z.object({ dDay: z.null() }),
  z.object({
    dDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'D일을 골라 주세요.'),
    publish: Time,
    open: Time,
    start: Time,
    pickDeadline: Time,
    liveUrl: z
      .string()
      .trim()
      .transform((s) => s || null)
      .refine((s) => s === null || /^https:\/\/\S+$/.test(s), '라이브 OX 주소는 https://로 시작해야 합니다.'),
  }),
]);

/** 일정 저장. D일 하루 안의 시각만 받는다 — 모든 일이 D일에 끝나므로. */
export async function saveSchedule(input: unknown): Promise<EventConfig> {
  const v = parse(ScheduleInput, input);
  const store = getStore();
  const cur = await store.getConfig();

  let next: EventConfig;
  if (v.dDay === null) {
    next = { ...cur, dDay: null, publishAt: null, liveOpenAt: null, liveStartAt: null, pickDeadlineAt: null };
  } else {
    if (!(v.publish <= v.open && v.open <= v.start && v.start <= v.pickDeadline))
      throw new ApiError(400, '게시 ≤ 입장 ≤ 시작 ≤ 선정 마감 순서여야 합니다.');
    next = {
      ...cur,
      dDay: v.dDay,
      publishAt: kstToISO(v.dDay, v.publish),
      liveOpenAt: kstToISO(v.dDay, v.open),
      liveStartAt: kstToISO(v.dDay, v.start),
      pickDeadlineAt: kstToISO(v.dDay, v.pickDeadline),
      liveUrl: v.liveUrl,
    };
  }
  await store.setConfig(next);
  return next;
}

const WinnerInput = z.object({
  name: z
    .string()
    .trim()
    .max(NAME_MAX, `이름은 ${NAME_MAX}자까지입니다.`)
    .nullable()
    .transform((s) => s || null),
});

/** 우승자 입력 → 카드가 결과로 바뀐다. null이면 되돌린다. */
export async function setWinner(input: unknown): Promise<EventConfig> {
  const { name } = parse(WinnerInput, input);
  const store = getStore();
  const next = { ...(await store.getConfig()), liveWinnerName: name };
  await store.setConfig(next);
  return next;
}

const ModerateInput = z
  .object({ hidden: z.boolean().optional(), picked: z.boolean().optional() })
  .refine((v) => v.hidden !== undefined || v.picked !== undefined, '바꿀 항목이 없습니다.');

/** 숨김·선정. 선정은 최대 2편, 선정 마감 전 제출분만, 숨긴 글은 안 된다. */
export async function moderate(id: string, input: unknown): Promise<AdminMessage> {
  const v = parse(ModerateInput, input);
  const store = getStore();
  const [m, config] = await Promise.all([store.getMessage(id), store.getConfig()]);
  if (!m) throw new ApiError(404, '의견서를 찾을 수 없습니다.');

  const next: Message = { ...m };
  if (v.picked === true && !m.picked) {
    if (m.hidden || v.hidden === true) throw new ApiError(409, '숨긴 의견서는 선정할 수 없습니다.');
    if (!eligible(m, config))
      throw new ApiError(409, `선정 마감(${formatKST(config.pickDeadlineAt!)}) 이후에 제출된 의견서입니다.`);
    const picked = (await store.listMessages()).filter((x) => x.picked).length;
    if (picked >= PICK_MAX) throw new ApiError(409, `이미 ${PICK_MAX}편을 골랐습니다. 하나를 먼저 취소해 주세요.`);
  }
  if (v.hidden === true && !m.hidden && (v.picked ?? m.picked))
    throw new ApiError(409, '선정된 의견서는 숨길 수 없습니다. 선정을 먼저 취소해 주세요.');

  if (v.picked !== undefined) next.picked = v.picked;
  if (v.hidden !== undefined) next.hidden = v.hidden;
  // updatedAt은 작성자의 수정만 기록한다 — 관리자 조작으로 '수정됨'이 붙지 않게
  await store.putMessage(next);
  return toAdmin(next, config);
}

/** 엑셀에서 수식으로 읽히지 않게, 쉼표·따옴표·줄바꿈은 따옴표로 감싼다 */
function cell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** 소장용 CSV. 숨긴 글도 넣고 표시한다. 엑셀이 한글을 읽도록 BOM을 붙인다. */
export async function exportCsv(): Promise<string> {
  const store = getStore();
  const [all, config] = await Promise.all([store.listMessages(), store.getConfig()]);
  const head = ['작성 시각(KST)', '이름', '부서', '공개 범위', '선정', '숨김', '선정 대상', '수정됨', '내용'];
  const rows = all.map((m) => [
    formatKST(m.createdAt),
    m.name,
    m.dept ?? '',
    m.visibility === 'public' ? '공개' : '창균님만 보기',
    m.picked ? 'O' : '',
    m.hidden ? 'O' : '',
    eligible(m, config) ? 'O' : '',
    m.updatedAt !== m.createdAt ? 'O' : '',
    m.body,
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
