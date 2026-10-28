import { Cover } from '@/components/Cover';
import { Letter } from '@/components/Letter';
import { Opinions } from '@/components/Opinions';
import { Timeline } from '@/components/Timeline';
import { copy, cover, departments } from '@/lib/content';
import { feed } from '@/lib/messages';

// 의견서와 일정이 바뀌므로 매 요청 새로 그린다
export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialFeed = await feed(0);
  return (
    <main>
      <Cover />
      <Letter />
      <Timeline />
      <Opinions docNo={cover.docNo} initialFeed={initialFeed} departments={departments} text={copy.opinion} />
    </main>
  );
}
