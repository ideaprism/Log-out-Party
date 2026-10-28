import { Reveal } from './Reveal';
import s from './Sheet.module.css';

/**
 * 공보 한 쪽. 오른쪽 위에 등록번호(러닝 헤드), 아래에 쪽번호를 단다.
 * paged면 폰 한 화면을 한 장으로 잡는다 (spec.html paged 모드).
 */
export function Sheet({
  id,
  page,
  docNo,
  paged = false,
  children,
}: {
  id: string;
  page: number;
  docNo: string;
  paged?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${s.sheet}${paged ? ` ${s.paged}` : ''}`}>
      <p className={s.runhead} aria-hidden="true">
        등록특허 <span className="mono">{docNo}</span>
      </p>
      <Reveal className={s.body}>{children}</Reveal>
      <p className={`${s.pageno} mono`} aria-hidden="true">
        - {page} -
      </p>
    </section>
  );
}
