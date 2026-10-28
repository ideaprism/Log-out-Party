import 'server-only';
import { contact } from './content';

/** vCard 3.0 값 이스케이프 — 역슬래시·쉼표·세미콜론·줄바꿈 */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

/**
 * 엔딩 ① [연락처 저장]이 내려주는 연락처 (content/contact.json).
 * 성·이름을 나눠 짐작하지 않고 N에는 이름 전체를 성 자리에 둔다 — 아이폰·안드로이드 모두 '정창균'으로 보인다.
 * 3.0은 아이폰 연락처 가져오기가 가장 잘 받는 판이다.
 */
export function vcard(): string {
  const c = contact;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(c.name)};;;;`,
    `FN:${esc(c.name)}`,
    c.phone && `TEL;TYPE=CELL:${esc(c.phone)}`,
    c.email && `EMAIL;TYPE=INTERNET:${esc(c.email)}`,
    c.note && `NOTE:${esc(c.note)}`,
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\r\n') + '\r\n';
}
