'use client';

import { useEffect, useRef, useState } from 'react';

/** 섹션이 화면에 들어올 때 한 번 페이드인한다. prefers-reduced-motion이면 CSS가 끈다. */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${shown ? ' in' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
