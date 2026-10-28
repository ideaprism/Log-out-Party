import { adminState } from '@/lib/adminOps';
import { adminHandle } from '@/lib/api';

/** 일정·현황·전체 의견서(비공개·숨김 포함) */
export async function GET() {
  return adminHandle(adminState);
}
