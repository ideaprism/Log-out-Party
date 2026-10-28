import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getStore } from './store';
import { BODY_MAX, DEPT_MAX, EDIT_WINDOW_MS, FEED_PAGE, NAME_MAX } from './limits';
import type { FeedPage, Message, MyMessage, PublicMessage } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 기기 토큰은 해시로만 저장한다. 저장소가 새어도 남의 글을 고칠 수 없게. */
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(`fw:${token}`).digest('hex');
}

/** 글자 수는 사람이 세는 대로 — 이모지 하나도 한 글자 */
const chars = (s: string) => Array.from(s).length;

/** 제어문자를 걷고, 빈 줄은 두 줄까지만 */
const clean = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const Token = z.string().min(16).max(100);
const Body = z
  .string()
  .transform(clean)
  .refine((s) => s.length > 0, '메시지를 적어 주세요.')
  .refine((s) => chars(s) <= BODY_MAX, `메시지는 ${BODY_MAX}자까지 적을 수 있습니다.`);
const Visibility = z.enum(['public', 'private']);

const NewInput = z.object({
  token: Token,
  name: z
    .string()
    .transform(clean)
    .refine((s) => s.length > 0, '이름을 적어 주세요.')
    .refine((s) => chars(s) <= NAME_MAX, `이름은 ${NAME_MAX}자까지입니다.`),
  dept: z
    .string()
    .nullish()
    .transform((s) => (s ? clean(s) : null) || null)
    .refine((s) => s === null || chars(s) <= DEPT_MAX, `부서는 ${DEPT_MAX}자까지입니다.`),
  body: Body,
  visibility: Visibility.default('public'),
  consent: z.literal(true, { error: '개인정보 수집·이용에 동의해 주세요.' }),
});

const EditInput = z.object({ token: Token, body: Body, visibility: Visibility });
const OwnerInput = z.object({ token: Token });

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new ApiError(400, r.error.issues[0]?.message ?? '입력을 확인해 주세요.');
  return r.data;
}

function toPublic(m: Message): PublicMessage {
  return {
    id: m.id,
    name: m.name,
    dept: m.dept,
    body: m.body,
    picked: m.picked,
    createdAt: m.createdAt,
    edited: m.updatedAt !== m.createdAt,
  };
}

function toMine(m: Message, now = Date.now()): MyMessage {
  const until = Date.parse(m.createdAt) + EDIT_WINDOW_MS;
  return {
    ...toPublic(m),
    visibility: m.visibility,
    hidden: m.hidden,
    editableUntil: new Date(until).toISOString(),
    canEdit: !m.hidden && now < until,
    canDelete: !m.picked,
  };
}

/** 공개 피드: 공개이고 숨김이 아닌 것. 선정 2편 먼저, 이후 최신순. */
export async function feed(offset: number): Promise<FeedPage> {
  const all = await getStore().listMessages();
  const rows = all
    .filter((m) => m.visibility === 'public' && !m.hidden)
    .sort((a, b) => Number(b.picked) - Number(a.picked) || b.createdAt.localeCompare(a.createdAt));
  const start = Math.max(0, Math.floor(offset) || 0);
  const items = rows.slice(start, start + FEED_PAGE).map(toPublic);
  const next = start + FEED_PAGE < rows.length ? start + FEED_PAGE : null;
  return { items, next, total: rows.length };
}

export async function submit(input: unknown, ip: string): Promise<MyMessage> {
  const v = parse(NewInput, input);
  const store = getStore();
  const deviceHash = hashToken(v.token);

  // 기기당 10분에 5건, 같은 IP(사내 공유기 뒤 여러 명)에는 넉넉히 10분에 40건
  const okDevice = await store.hit(`dev:${deviceHash}`, 5, 600);
  const okIp = await store.hit(`ip:${ip}`, 40, 600);
  if (!okDevice || !okIp) throw new ApiError(429, '잠시 후 다시 제출해 주세요.');

  const now = new Date().toISOString();
  const m: Message = {
    id: crypto.randomUUID(),
    deviceHash,
    name: v.name,
    dept: v.dept,
    body: v.body,
    visibility: v.visibility,
    hidden: false,
    picked: false,
    createdAt: now,
    updatedAt: now,
  };
  await store.putMessage(m);
  return toMine(m);
}

export async function mine(input: unknown): Promise<MyMessage[]> {
  const { token } = parse(OwnerInput, input);
  const h = hashToken(token);
  const all = await getStore().listMessages();
  return all
    .filter((m) => m.deviceHash === h)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => toMine(m));
}

async function owned(id: string, token: string): Promise<Message> {
  const m = await getStore().getMessage(id);
  // 남의 글인지 없는 글인지 구분해 알려 주지 않는다
  if (!m || m.deviceHash !== hashToken(token)) throw new ApiError(404, '의견서를 찾을 수 없습니다.');
  return m;
}

export async function edit(id: string, input: unknown): Promise<MyMessage> {
  const v = parse(EditInput, input);
  const m = await owned(id, v.token);
  if (m.hidden) throw new ApiError(403, '관리자가 숨긴 의견서는 고칠 수 없습니다.');
  if (Date.now() >= Date.parse(m.createdAt) + EDIT_WINDOW_MS)
    throw new ApiError(403, '작성 후 24시간이 지나 고칠 수 없습니다.');
  const next: Message = { ...m, body: v.body, visibility: v.visibility, updatedAt: new Date().toISOString() };
  await getStore().putMessage(next);
  return toMine(next);
}

export async function remove(id: string, input: unknown): Promise<void> {
  const { token } = parse(OwnerInput, input);
  const m = await owned(id, token);
  if (m.picked) throw new ApiError(403, '창균님이 고른 의견서는 지울 수 없습니다.');
  await getStore().deleteMessage(id);
}

export async function visit(input: unknown): Promise<void> {
  const { token } = parse(OwnerInput, input);
  await getStore().addVisit(hashToken(token));
}
