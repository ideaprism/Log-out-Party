import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/admin/PrintButton';
import { isAdmin } from '@/lib/admin';
import { copy, cover } from '@/lib/content';
import { formatKST } from '@/lib/kst';
import { getStore } from '@/lib/store';
import s from '@/components/admin/Print.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '의견서 소장본',
  robots: { index: false, follow: false },
};

/** 소장용 인쇄본 — 숨기지 않은 의견서 전부, 오래된 것부터. 선정 2편은 맨 앞. */
export default async function PrintPage() {
  if (!(await isAdmin())) notFound();
  const all = (await getStore().listMessages()).filter((m) => !m.hidden);
  const rows = [...all.filter((m) => m.picked), ...all.filter((m) => !m.picked)];

  return (
    <main className={s.page}>
      <PrintButton />
      <header className={s.head}>
        <p className={s.doc}>
          등록특허 <span className="mono">{cover.docNo}</span>
        </p>
        <h1 className={s.title}>
          {copy.opinion.feedHeading} {cover.title}
        </h1>
        <p className={s.meta}>
          {cover.inventor} · 의견서 <span className="mono">{rows.length}</span>편
        </p>
      </header>

      <ol className={s.list}>
        {rows.map((m) => (
          <li key={m.id} className={`${s.item}${m.picked ? ` ${s.picked}` : ''}`}>
            <p className={s.who}>
              <b>{m.name}</b>
              {m.dept && <span>{m.dept}</span>}
              {m.picked && <span className={s.mark}>登 {copy.opinion.picked}</span>}
              {m.visibility === 'private' && <span className={s.mark}>창균님만 보기</span>}
            </p>
            <p className={s.body}>{m.body}</p>
            <p className={`${s.when} mono`}>{formatKST(m.createdAt)}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
