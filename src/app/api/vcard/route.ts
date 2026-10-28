import { NextResponse } from 'next/server';
import { contact } from '@/lib/content';
import { ApiError } from '@/lib/messages';
import { assertPublished } from '@/lib/schedule';
import { vcard } from '@/lib/vcard';

/** 연락처 저장 (.vcf). 전화번호가 들어 있으므로 게시 전에는 관리자만. */
export async function GET() {
  try {
    await assertPublished();
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
  return new NextResponse(vcard(), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contact.vcf"; filename*=UTF-8''${encodeURIComponent(`${contact.name}.vcf`)}`,
      'Cache-Control': 'no-store',
    },
  });
}
