import { moderate } from '@/lib/adminOps';
import { adminHandle, readJson } from '@/lib/api';

type Ctx = { params: Promise<{ id: string }> };

/** 숨김·선정 { hidden?, picked? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return adminHandle(async () => moderate(id, await readJson(req)));
}
