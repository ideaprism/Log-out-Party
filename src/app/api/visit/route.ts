import { handle, readJson } from '@/lib/api';
import { visit } from '@/lib/messages';

/** 방문 수 — 기기당 1회 */
export async function POST(req: Request) {
  return handle(async () => visit(await readJson(req)));
}
