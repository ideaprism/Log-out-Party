import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { exportCsv } from '@/lib/adminOps';

/** 소장용 CSV 내려받기 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  return new NextResponse(await exportCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="farewell-opinions.csv"; filename*=UTF-8''${encodeURIComponent('의견서_전체.csv')}`,
      'Cache-Control': 'no-store',
    },
  });
}
