import { saveSchedule } from '@/lib/adminOps';
import { adminHandle, readJson } from '@/lib/api';

/** 일정 저장 — D일과 그날의 시각들. { dDay: null }이면 미정으로 되돌린다 */
export async function PUT(req: Request) {
  return adminHandle(async () => saveSchedule(await readJson(req)));
}
