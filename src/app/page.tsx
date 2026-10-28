import { Cover } from '@/components/Cover';
import { Exam } from '@/components/Exam';
import { Letter } from '@/components/Letter';
import { Opinions } from '@/components/Opinions';
import { PrePublish } from '@/components/PrePublish';
import { Timeline } from '@/components/Timeline';
import { copy, cover, departments } from '@/lib/content';
import { feed } from '@/lib/messages';
import { pageSchedule } from '@/lib/schedule';

// 의견서와 일정이 바뀌므로 매 요청 새로 그린다
export const dynamic = 'force-dynamic';

export default async function Home() {
  const { exam, unpublishedUntil } = await pageSchedule();
  if (unpublishedUntil) return <PrePublish publishAt={unpublishedUntil} now={exam.now} />;

  const initialFeed = await feed(0);
  return (
    <main>
      <Cover />
      <Letter />
      <Timeline />
      <Exam docNo={cover.docNo} initial={exam} text={copy.exam} />
      <Opinions docNo={cover.docNo} initialFeed={initialFeed} departments={departments} text={copy.opinion} />
    </main>
  );
}
