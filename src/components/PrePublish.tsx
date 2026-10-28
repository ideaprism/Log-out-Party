import { copy, cover } from '@/lib/content';
import { ReloadAt } from './ReloadAt';
import { Sheet } from './Sheet';
import s from './PrePublish.module.css';

/** publishAt 전 일반 방문자 화면. 공보 내용은 싣지 않는다. */
export function PrePublish({ publishAt, now }: { publishAt: string; now: string }) {
  return (
    <main>
      <Sheet id="pre" page={1} docNo={cover.docNo} paged>
        <div className={s.box}>
          <h1 className={s.h}>{copy.prePublish.title}</h1>
          <p className={s.body}>{copy.prePublish.body}</p>
        </div>
      </Sheet>
      <ReloadAt at={publishAt} now={now} />
    </main>
  );
}
