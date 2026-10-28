import type { Metadata } from 'next';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { adminCookieValue, isAdmin } from '@/lib/admin';
import { adminState } from '@/lib/adminOps';
import { copy } from '@/lib/content';
import s from '@/components/admin/Admin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '관리',
  robots: { index: false, follow: false },
};

/** /admin — 창균님 전용. 쿠키가 없으면 키 입력, 있으면 관리 화면. */
export default async function AdminPage() {
  if (!adminCookieValue()) {
    return (
      <main className={s.wrap}>
        <section className={s.panel}>
          <h1 className={s.h}>【관리】</h1>
          <p className={s.note}>
            ADMIN_KEY 환경변수가 없어 관리 화면을 열 수 없습니다. 로컬은 <code>.env.local</code>, 운영은 Vercel 대시보드에
            넣고 서버를 다시 띄우세요.
          </p>
        </section>
      </main>
    );
  }
  if (!(await isAdmin())) return <AdminLogin />;
  return <AdminPanel initial={await adminState()} pickedLabel={copy.opinion.picked} />;
}
