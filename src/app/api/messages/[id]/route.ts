import { publicHandle, readJson } from '@/lib/api';
import { edit, remove } from '@/lib/messages';

type Ctx = { params: Promise<{ id: string }> };

/** 수정 — 같은 기기, 작성 후 24시간 이내 */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return publicHandle(async () => edit(id, await readJson(req)));
}

/** 삭제 — 같은 기기, 선정된 글은 불가 */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return publicHandle(async () => remove(id, await readJson(req)));
}
