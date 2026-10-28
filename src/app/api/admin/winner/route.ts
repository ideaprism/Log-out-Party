import { setWinner } from '@/lib/adminOps';
import { adminHandle, readJson } from '@/lib/api';

/** 라이브 OX 우승자 이름 */
export async function PUT(req: Request) {
  return adminHandle(async () => setWinner(await readJson(req)));
}
