'use client';

import type { OpinionCopy } from '@/lib/content';
import { formatKST } from '@/lib/kst';
import type { FeedPage, PublicMessage } from '@/lib/types';
import { Seal } from './Seal';
import s from './Opinion.module.css';

/** 【의견서 목록】 — 선정 2편이 맨 위에 登 도장을 달고 온다. */
export function OpinionFeed({
  feed,
  text,
  loadingMore,
  onMore,
}: {
  feed: FeedPage;
  text: OpinionCopy;
  loadingMore: boolean;
  onMore: () => void;
}) {
  return (
    <>
      <h2 className={s.h}>
        {text.feedHeading} <span className={`${s.hSub} mono`}>공개 {feed.total}건</span>
      </h2>

      {feed.items.length === 0 ? (
        <p className={s.empty}>아직 공개된 의견서가 없습니다. 첫 의견서를 남겨 주세요.</p>
      ) : (
        <ol className={s.feed}>
          {feed.items.map((m) => (
            <Card key={m.id} m={m} pickedLabel={text.picked} />
          ))}
        </ol>
      )}

      {feed.next !== null && (
        <button type="button" className={s.more} onClick={onMore} disabled={loadingMore}>
          {loadingMore ? '불러오는 중…' : '의견서 더 보기'}
        </button>
      )}
    </>
  );
}

function Card({ m, pickedLabel }: { m: PublicMessage; pickedLabel: string }) {
  return (
    <li className={`${s.card}${m.picked ? ` ${s.cardPicked}` : ''}`}>
      {m.picked && (
        <div className={s.pick}>
          <Seal label={pickedLabel} />
          <span className={s.pickLabel}>{pickedLabel}</span>
        </div>
      )}
      <p className={s.who}>
        <b>{m.name}</b>
        {m.dept && <span className={s.dept}>{m.dept}</span>}
      </p>
      <p className={s.body}>{m.body}</p>
      <p className={`${s.when} mono`}>
        {formatKST(m.createdAt)}
        {m.edited && ' · 수정됨'}
      </p>
    </li>
  );
}
