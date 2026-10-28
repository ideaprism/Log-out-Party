import { login } from '@/lib/admin';
import { clientIp, handle, readJson } from '@/lib/api';

/** 관리자 키 → 쿠키 */
export async function POST(req: Request) {
  return handle(async () => login(await readJson(req), clientIp(req)));
}
