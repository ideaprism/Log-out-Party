import { handle } from '@/lib/api';
import { examSnapshot } from '@/lib/schedule';

/** 【심사 공고】 — 서버 시각, 일정, (입장 시각부터) 라이브 주소, 우승자 */
export async function GET() {
  return handle(examSnapshot);
}
