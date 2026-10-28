import { copy, cover, links } from '@/lib/content';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import s from './Ending.module.css';

/**
 * 엔딩 — 순서 고정 ①자유 실시 → ②다음 출원 → ③서명 (PRD 4.4).
 * 감사(연락) → 근황 → 웃음으로 끝나야 홍보로 읽히지 않는다.
 * IdeaPrism은 ②에서 단 1회, '스티브 창스(자칭)'은 ③에서만.
 */
export function Ending() {
  const e = copy.ending;
  return (
    <Sheet id="ending" page={7} docNo={cover.docNo}>
      <h2 className={s.h}>{e.heading}</h2>

      <section className={s.part} aria-label="자유 실시">
        <p className={s.free}>
          <Txt>{e.freeUse}</Txt>
        </p>
        <a className={s.contact} href="/api/vcard" download>
          {e.contactButton}
        </a>
      </section>

      <section className={s.part} aria-label="다음 출원">
        <p className={s.next}>
          {e.nextFilingPrefix}{' '}
          <a className={s.link} href={links.ideaprism.url} target="_blank" rel="noopener">
            {links.ideaprism.label}
          </a>{' '}
          {e.nextFilingSuffix}
        </p>
      </section>

      <p className={s.sign}>
        <Txt>{e.signature}</Txt>
      </p>
    </Sheet>
  );
}
