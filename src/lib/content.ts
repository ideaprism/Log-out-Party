import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import coverJson from '@content/cover.json';
import timelineJson from '@content/timeline.json';
import copyJson from '@content/copy.json';
import contactJson from '@content/contact.json';
import linksJson from '@content/links.json';
import departmentsJson from '@content/departments.json';

/*
 * content/ 의 글을 읽어 검증한다.
 *
 * 비개발자가 고치는 파일이므로 형식이 어긋나면 조용히 빈칸을 그리지 말고
 * 어느 파일의 어느 칸이 틀렸는지 말하며 멈춘다.
 */

const Cover = z.object({
  docNo: z.string(),
  agency: z.string(),
  kind: z.string(),
  subtitle: z.string(),
  pubDate: z.string(),
  regNo: z.string(),
  regDate: z.string(),
  title: z.string(),
  inventor: z.string(),
  holder: z.string(),
  term: z.object({ from: z.string(), to: z.string(), note: z.string() }),
  figure: z.object({ src: z.string(), alt: z.string(), caption: z.string() }),
});

const Timeline = z.object({
  caption: z.string(),
  start: z.string(),
  end: z.string(),
  items: z.array(z.object({ year: z.string(), title: z.string(), note: z.string().optional() })).min(1),
});

const Copy = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  scrollHint: z.string(),
  prePublish: z.object({ title: z.string(), body: z.string() }),
  exam: z.object({
    heading: z.string(),
    teaser: z.string(),
    unscheduled: z.string(),
    rules: z.array(z.string()),
    prize: z.string(),
    enter: z.string(),
    enterHint: z.string(),
    live: z.string(),
    resultPrefix: z.string(),
    resultSuffix: z.string(),
    resultPending: z.string(),
  }),
  opinion: z.object({
    heading: z.string(),
    feedHeading: z.string(),
    notice: z.string(),
    pickRule: z.string(),
    picked: z.string(),
    consent: z.string(),
  }),
  ending: z.object({
    freeUse: z.string(),
    contactButton: z.string(),
    nextFilingPrefix: z.string(),
    nextFilingSuffix: z.string(),
    signature: z.string(),
  }),
});

const Contact = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  note: z.string().optional(),
});

const Links = z.object({
  ideaprism: z.object({ label: z.string(), url: z.string().url() }),
});

const Departments = z.object({
  groups: z.array(z.object({ name: z.string(), departments: z.array(z.string()) })),
  other: z.string(),
});

function parse<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const where = r.error.issues.map((i) => `  - ${i.path.join('.') || '(전체)'}: ${i.message}`).join('\n');
    throw new Error(`content/${file} 형식이 맞지 않습니다.\n${where}`);
  }
  return r.data;
}

export const cover = parse(Cover, coverJson, 'cover.json');
export const timeline = parse(Timeline, timelineJson, 'timeline.json');
export const copy = parse(Copy, copyJson, 'copy.json');
export const contact = parse(Contact, contactJson, 'contact.json');
export const links = parse(Links, linksJson, 'links.json');
export const departments = parse(Departments, departmentsJson, 'departments.json');

export type OpinionCopy = z.infer<typeof Copy>['opinion'];
export type DepartmentList = z.infer<typeof Departments>;

export type Letter = { paragraphs: string[]; signature: string | null };

/** letter.md — 빈 줄로 문단을 나누고, "—"로 시작하는 문단은 서명으로 뗀다. */
export function getLetter(): Letter {
  const raw = fs.readFileSync(path.join(process.cwd(), 'content', 'letter.md'), 'utf8');
  const blocks = raw
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  let signature: string | null = null;
  const paragraphs: string[] = [];
  for (const b of blocks) {
    if (/^[—–-]\s?/.test(b) && signature === null) signature = b.replace(/^[—–-]\s?/, '');
    else paragraphs.push(b);
  }
  return { paragraphs, signature };
}
