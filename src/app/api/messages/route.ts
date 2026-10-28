import { clientIp, publicHandle, readJson } from '@/lib/api';
import { feed, submit } from '@/lib/messages';

/** 공개 피드. ?cursor=20 */
export async function GET(req: Request) {
  const cursor = Number(new URL(req.url).searchParams.get('cursor') ?? 0);
  return publicHandle(() => feed(cursor));
}

/** 의견서 제출 */
export async function POST(req: Request) {
  return publicHandle(async () => submit(await readJson(req), clientIp(req)), 201);
}
