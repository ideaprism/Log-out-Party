'use client';

import { useEffect } from 'react';

/**
 * 게시 시각이 되면 새로 고친다. 시계는 서버 시각 기준.
 * 하루 넘게 남았으면 걸지 않는다 — setTimeout은 약 24.8일을 넘으면 바로 터진다.
 */
export function ReloadAt({ at, now }: { at: string; now: string }) {
  useEffect(() => {
    const wait = Date.parse(at) - Date.parse(now) + Math.random() * 3000;
    if (wait > 86_400_000) return;
    const t = setTimeout(() => location.reload(), Math.max(0, wait));
    return () => clearTimeout(t);
  }, [at, now]);
  return null;
}
