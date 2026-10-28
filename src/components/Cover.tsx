import { cover, copy } from '@/lib/content';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import s from './Cover.module.css';

/**
 * 표지 — 공보 1면 표제부.
 *
 * 순서는 실제 등록특허공보를 따른다 (KIPlay_OX ending.js · spec.html):
 * 굵은 괘선 → (19)(12) → 굵은 괘선 → (45)(11)(24) / (72)(73) 서지 → (54) 띠 → 대표도.
 * 폰 폭에서는 두 단을 한 단으로 내려 쌓는다.
 */
export function Cover() {
  const c = cover;
  return (
    <Sheet id="cover" page={1} docNo={c.docNo} paged>
      <hr className="rule-bold" />
      <header className={s.mast}>
        <p className={s.t19}>
          <span className="inid">(19)</span> {c.agency}
        </p>
        <h1 className={s.t12}>
          <span className={`inid ${s.t12inid}`}>(12)</span>
          <span>{c.kind}</span>
        </h1>
        <p className={s.sub}>{c.subtitle}</p>
      </header>
      <hr className="rule-bold" />

      <dl className={s.biblio}>
        <Row inid="(45)" k="공고일자" v={c.pubDate} />
        <Row inid="(11)" k="등록번호" v={c.regNo} mono />
        <Row inid="(24)" k="등록일자" v={c.regDate} />
        <Row inid="(72)" k="발명자" v={c.inventor} strong />
        <div className={`${s.row} ${s.holder}`}>
          <dt>
            <span className="inid">(73)</span> 특허권자
          </dt>
          <dd>
            <Txt>{c.holder}</Txt>
          </dd>
        </div>
        <div className={`${s.row} ${s.term}`}>
          <dt>존속기간</dt>
          <dd>
            <span className="mono">
              {c.term.from} ~ {c.term.to}
            </span>{' '}
            <span className={s.termNote}>({c.term.note})</span>
          </dd>
        </div>
      </dl>

      <hr className="rule-thin" />
      <div className={s.t54}>
        <p className={s.t54label}>
          <span className="inid">(54)</span> 발명의 명칭
        </p>
        <p className={s.title}>
          <Txt>{c.title}</Txt>
        </p>
      </div>
      <hr className="rule-thin" />

      <figure className={s.fig}>
        <div className={s.figbox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.figure.src} alt={c.figure.alt} width={240} height={240} />
        </div>
        <figcaption className={s.figcap}>{c.figure.caption}</figcaption>
      </figure>

      <p className={s.hint}>
        {copy.scrollHint} <span aria-hidden="true">↓</span>
      </p>
    </Sheet>
  );
}

function Row({ inid, k, v, mono, strong }: { inid: string; k: string; v: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className={s.row}>
      <dt>
        <span className="inid">{inid}</span> {k}
      </dt>
      <dd className={`${mono ? 'mono' : ''}${strong ? ` ${s.strong}` : ''}`}>
        <Txt>{v}</Txt>
      </dd>
    </div>
  );
}
