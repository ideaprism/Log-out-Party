'use client';

import s from './Print.module.css';

export function PrintButton() {
  return (
    <button type="button" className={s.printBtn} onClick={() => window.print()}>
      인쇄하기
    </button>
  );
}
