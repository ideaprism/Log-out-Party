'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExamCopy } from '@/lib/content';
import { api } from '@/lib/client';
import { formatKST } from '@/lib/kst';
import { examPhase, kstDaysUntil, type ExamSnapshot } from '@/lib/phase';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import s from './Exam.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

/** 하루 넘게 남으면 D-n, 당일이면 HH:MM:SS */
function countdown(startAt: string, now: number, text: ExamCopy) {
  const days = kstDaysUntil(startAt, now);
  if (days >= 1) return text.dDay.replace('{n}', String(days));
  const sec = Math.max(0, Math.floor((Date.parse(startAt) - now) / 1000));
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
}

/**
 * 【심사 공고】 — 시각에 따라 예고 → 입장 → 진행 → 결과로 저절로 바뀐다 (lib/phase.ts).
 * 시계는 서버 시각으로 보정한다. 라이브 주소는 입장 시각이 되면 서버에서 받아 온다.
 */
export function Exam({ docNo, initial, text }: { docNo: string; initial: ExamSnapshot; text: ExamCopy }) {
  const [snap, setSnap] = useState(initial);
  // 첫 그림은 서버 시각으로 — 서버 HTML과 어긋나지 않게
  const [now, setNow] = useState(() => Date.parse(initial.now));
  const offset = useRef(0);

  const refetch = useCallback(async () => {
    try {
      const t0 = Date.now();
      const next = await api<ExamSnapshot>('/api/exam');
      offset.current = Date.parse(next.now) - (t0 + Date.now()) / 2;
      setSnap(next);
      setNow(Date.now() + offset.current);
    } catch {
      /* 못 받으면 가진 일정으로 계속 센다 */
    }
  }, []);

  useEffect(() => {
    offset.current = Date.parse(initial.now) - Date.now();
    refetch();
    const id = setInterval(() => setNow(Date.now() + offset.current), 1000);
    // 폰을 잠갔다 켜면 시계가 밀렸을 수 있다
    const onShow = () => document.visibilityState === 'visible' && refetch();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [initial.now, refetch]);

  const phase = examPhase(snap, now);

  // 입장 시각이 되면 주소를 받으러 간다. 150명이 같은 초에 몰리지 않게 조금씩 흩는다.
  useEffect(() => {
    if ((phase !== 'open' && phase !== 'live') || snap.url) return;
    const t = setTimeout(refetch, Math.random() * 3000);
    return () => clearTimeout(t);
  }, [phase, snap.url, refetch]);

  // 진행 중에는 우승자 입력을 기다린다
  useEffect(() => {
    if (phase !== 'live' && phase !== 'pending') return;
    const id = setInterval(() => document.visibilityState === 'visible' && refetch(), 30_000);
    return () => clearInterval(id);
  }, [phase, refetch]);

  return (
    <Sheet id="exam" page={4} docNo={docNo}>
      <h2 className={s.h}>{text.heading}</h2>

      {phase === 'result' && (
        <div className={s.result}>
          <p className={s.resultLabel}>{text.resultPrefix}</p>
          <p className={s.winner}>
            {snap.winner}
            <span className={s.suffix}>{text.resultSuffix}</span>
          </p>
        </div>
      )}

      {phase === 'pending' && <p className={s.pending}>{text.resultPending}</p>}

      {phase !== 'result' && phase !== 'pending' && (
        <>
          <p className={s.lead}>
            <Txt>{phase === 'live' ? text.live : text.teaser}</Txt>
          </p>

          <dl className={s.biblio}>
            <div className={s.row}>
              <dt>{text.when}</dt>
              <dd className={snap.startAt ? 'mono' : undefined}>
                {snap.startAt ? formatKST(snap.startAt) : <Txt>{text.unscheduled}</Txt>}
              </dd>
            </div>
            <div className={s.row}>
              <dt>{text.prizeLabel}</dt>
              <dd>
                <Txt>{text.prize}</Txt>
              </dd>
            </div>
          </dl>

          {snap.startAt && (phase === 'teaser' || phase === 'open') && (
            <div className={s.timer}>
              <span className={s.timerLabel}>{text.countdown}</span>
              <span className={`${s.clock} mono`} role="timer">
                {countdown(snap.startAt, now, text)}
              </span>
            </div>
          )}

          {phase === 'teaser' && snap.openAt && (
            <p className={s.opens}>{text.opensAt.replace('{time}', formatKST(snap.openAt).slice(-5))}</p>
          )}

          {(phase === 'open' || phase === 'live') && (
            <div className={s.entry}>
              {snap.url && (
                <a className={s.enter} href={snap.url} target="_blank" rel="noopener noreferrer">
                  {text.enter}
                </a>
              )}
              <p className={s.hint}>
                <Txt>{text.enterHint}</Txt>
              </p>
            </div>
          )}

          {phase !== 'live' && (
            <ol className={s.rules}>
              {text.rules.map((r, i) => (
                <li key={i}>
                  <span className={s.claim}>
                    【{text.ruleLabel} <span className="mono">{i + 1}</span>】
                  </span>
                  <Txt>{r}</Txt>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Sheet>
  );
}
