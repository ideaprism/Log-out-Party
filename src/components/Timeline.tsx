import { cover, timeline } from '@/lib/content';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import s from './Timeline.module.css';

/**
 * 【도 1】 — 26년 근속을 '방법 발명'의 흐름도로 그린다.
 * 시작·끝은 둥근 단자, 사이는 단계 상자. 단계 부호 S10, S20 …은 공보 흐름도의 관례다.
 */
export function Timeline() {
  const t = timeline;
  return (
    <Sheet id="timeline" page={3} docNo={cover.docNo}>
      <h2 className={s.h}>
        【도 1】 <span className={s.caption}>{t.caption}</span>
      </h2>

      <ol className={s.flow}>
        <li className={s.terminal} aria-label={`시작: ${t.start}`}>
          {t.start}
        </li>
        {t.items.map((it, i) => (
          <li key={i} className={s.step}>
            <span className={`${s.code} mono`} aria-hidden="true">
              S{(i + 1) * 10}
            </span>
            <p className={`${s.year} mono`}>
              <Txt>{it.year}</Txt>
            </p>
            <p className={s.title}>
              <Txt>{it.title}</Txt>
            </p>
            {it.note && (
              <p className={s.note}>
                <Txt>{it.note}</Txt>
              </p>
            )}
          </li>
        ))}
        <li className={s.terminal} aria-label={`끝: ${t.end}`}>
          {t.end}
        </li>
      </ol>
    </Sheet>
  );
}
