import { handle, readJson } from '@/lib/api';
import { mine } from '@/lib/messages';

/** 이 기기에서 쓴 의견서 (비공개 포함). 토큰을 URL에 싣지 않으려고 POST다. */
export async function POST(req: Request) {
  return handle(async () => mine(await readJson(req)));
}
