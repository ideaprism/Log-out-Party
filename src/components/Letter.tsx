import { cover, getLetter } from '@/lib/content';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import s from './Letter.module.css';

/** (57) 요약 — 감사 편지. 문단마다 공보의 문단번호 [0001]을 단다. */
export function Letter() {
  const { paragraphs, signature } = getLetter();
  return (
    <Sheet id="letter" page={2} docNo={cover.docNo} paged>
      <h2 className={s.h}>
        <span className="inid">(57)</span> 요<span className={s.gap} />약
      </h2>
      <div className={s.text}>
        {paragraphs.map((p, i) => (
          <p key={i} className={s.para}>
            <span className={`${s.pn} mono`} aria-hidden="true">
              [{String(i + 1).padStart(4, '0')}]
            </span>
            <Txt>{p}</Txt>
          </p>
        ))}
      </div>
      {signature && (
        <p className={s.sign}>
          <Txt>{signature}</Txt>
        </p>
      )}
    </Sheet>
  );
}
