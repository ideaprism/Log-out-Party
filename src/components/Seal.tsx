'use client';

import { useEffect, useRef, useState } from 'react';
import s from './Seal.module.css';

/**
 * 登 도장 — 이 앱에서 인주가 등장하는 유일한 자리.
 * KIPlay_OX crowd.js seal()과 같은 모양: 이중 원, -0.12rad 기울기, 찍힐 때 1.12배로 눌렸다 돌아온다.
 */
export function Seal({ label }: { label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStamped(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={`${s.seal}${stamped ? ` ${s.stamped}` : ''}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`登 — ${label}`}
    >
      <g transform="rotate(-6.9 50 50)">
        <circle cx="50" cy="50" r="44" className={s.ring} strokeWidth="4.8" />
        <circle cx="50" cy="50" r="36" className={s.ring} strokeWidth="2.2" />
        <text x="50" y="52" className={s.char}>
          登
        </text>
      </g>
    </svg>
  );
}
