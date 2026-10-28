'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DepartmentList, OpinionCopy } from '@/lib/content';
import { api, deviceToken } from '@/lib/client';
import type { FeedPage, MyMessage } from '@/lib/types';
import { MyOpinions } from './MyOpinions';
import { OpinionFeed } from './OpinionFeed';
import { OpinionForm } from './OpinionForm';
import { Sheet } from './Sheet';
import s from './Opinion.module.css';

/** 【의견서】 작성 + 내 의견서 + 【의견서 목록】. 셋이 같은 상태를 나눠 쓴다. */
export function Opinions({
  docNo,
  initialFeed,
  departments,
  text,
}: {
  docNo: string;
  initialFeed: FeedPage;
  departments: DepartmentList;
  text: OpinionCopy;
}) {
  const [feed, setFeed] = useState(initialFeed);
  const [mine, setMine] = useState<MyMessage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const refreshMine = useCallback(async () => {
    setMine(await api<MyMessage[]>('/api/messages/mine', { method: 'POST', body: { token: deviceToken() } }));
  }, []);

  const refresh = useCallback(async () => {
    const [f] = await Promise.all([api<FeedPage>('/api/messages'), refreshMine()]);
    setFeed(f);
  }, [refreshMine]);

  useEffect(() => {
    refreshMine().catch(() => {});
    // 방문 수 — 탭마다 한 번만 보낸다
    try {
      if (!sessionStorage.getItem('fw.visited')) {
        sessionStorage.setItem('fw.visited', '1');
        api('/api/visit', { method: 'POST', body: { token: deviceToken() } }).catch(() => {});
      }
    } catch {
      /* 저장 불가 — 세지 않는다 */
    }
  }, [refreshMine]);

  async function more() {
    if (feed.next === null) return;
    setLoadingMore(true);
    try {
      const f = await api<FeedPage>(`/api/messages?cursor=${feed.next}`);
      setFeed((prev) => {
        // 그사이 새 글이 들어오면 순번이 밀려 겹칠 수 있다
        const seen = new Set(prev.items.map((m) => m.id));
        return { items: [...prev.items, ...f.items.filter((m) => !seen.has(m.id))], next: f.next, total: f.total };
      });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <Sheet id="opinion" page={4} docNo={docNo}>
        <h2 className={s.h}>{text.heading}</h2>
        <p className={s.notice}>※ {text.notice}</p>
        <p className={s.rule}>{text.pickRule}</p>
        <OpinionForm departments={departments} text={text} onSubmitted={() => refresh().catch(() => {})} />
        <MyOpinions items={mine} onChanged={() => refresh().catch(() => {})} />
      </Sheet>
      <Sheet id="feed" page={5} docNo={docNo}>
        <OpinionFeed feed={feed} text={text} loadingMore={loadingMore} onMore={more} />
      </Sheet>
    </>
  );
}
