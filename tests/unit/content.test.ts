import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { contact, copy, cover, getLetter, links } from '@/lib/content';

/*
 * CLAUDE.md '절대 규칙' 중 글로 지킬 수 있는 것들. content/를 고치다 어기면 여기서 걸린다.
 */

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), 'content', f), 'utf8');
const strip = (json: string) => JSON.stringify(JSON.parse(json), (k, v) => (k.startsWith('_') ? undefined : v));

describe('content/ 로드', () => {
  it('모든 파일이 형식 검사를 통과한다', () => {
    expect(cover.docNo).toBeTruthy();
    expect(copy.exam.rules.length).toBeGreaterThan(0);
    expect(getLetter().paragraphs.length).toBeGreaterThan(0);
  });
});

describe('배치 규칙', () => {
  it('IdeaPrism은 엔딩 ② 링크 한 곳뿐 — 표지·메타·카피·편지·타임라인에 없다', () => {
    for (const f of ['cover.json', 'copy.json', 'timeline.json', 'departments.json', 'contact.json']) {
      expect(strip(read(f)), f).not.toMatch(/ideaprism/i);
    }
    expect(read('letter.md')).not.toMatch(/ideaprism/i);
    expect(links.ideaprism.label).toBe('IdeaPrism');
  });

  it("'스티브 창스'는 엔딩 ③ 서명에만, '(자칭)'과 함께", () => {
    const all = strip(read('copy.json'));
    expect(all.match(/스티브 창스/g)).toHaveLength(1);
    expect(copy.ending.signature).toContain('스티브 창스');
    expect(copy.ending.signature).toContain('(자칭)');
    for (const f of ['cover.json', 'timeline.json']) expect(strip(read(f))).not.toContain('스티브 창스');
    expect(read('letter.md')).not.toContain('스티브 창스');
  });

  it('표지·메타 제목에 창업 공지 냄새가 없다', () => {
    expect(copy.meta.title).not.toMatch(/ideaprism|창업|출원/i);
  });

  it('자리 표시({n}·{time})가 남아 있다', () => {
    expect(copy.exam.dDay).toContain('{n}');
    expect(copy.exam.opensAt).toContain('{time}');
  });
});

describe('vCard', () => {
  it('3.0, CRLF, 쉼표·세미콜론·줄바꿈 이스케이프, 빈 칸은 뺀다', async () => {
    vi.resetModules();
    vi.doMock('@/lib/content', () => ({
      contact: { name: '정;창,균', phone: undefined, email: 'a@b.kr', note: '첫 줄\n둘째 줄' },
    }));
    const { vcard } = await import('@/lib/vcard');
    const v = vcard();
    expect(v.split('\r\n').slice(0, 2)).toEqual(['BEGIN:VCARD', 'VERSION:3.0']);
    expect(v).toContain('FN:정\\;창\\,균\r\n');
    expect(v).toContain('NOTE:첫 줄\\n둘째 줄\r\n');
    expect(v).not.toContain('TEL');
    expect(v.replace(/\r\n/g, '')).not.toContain('\n');
    vi.doUnmock('@/lib/content');
  });

  it('실제 contact.json으로도 만들어진다', async () => {
    vi.resetModules();
    const { vcard } = await import('@/lib/vcard');
    expect(vcard()).toContain(`FN:${contact.name}`);
  });
});
