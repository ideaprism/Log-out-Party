import { logout } from '@/lib/admin';
import { handle } from '@/lib/api';

export async function POST() {
  return handle(logout);
}
