'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/client';
import { formatKST, kstTime } from '@/lib/kst';
import { examPhase, type ExamPhase } from '@/lib/phase';
import type { AdminMessage, AdminState } from '@/lib/types';
import { Seal } from '../Seal';
import s from './Admin.module.css';

const PICK_MAX = 2;

const PHASE: Record<ExamPhase, string> = {
  unscheduled: '일정 미정 — 예고 카드만',
  teaser: '예고 — 카운트다운',
  open: '입장 — [심사장 입장] 버튼',
  live: '진행 중 — 우승자 입력 대기',
  pending: '결과 대기 — D일이 지났습니다',
  result: '결과 — 등록 결정 표시 중',
};

type Filter = 'all' | 'public' | 'private' | 'hidden' | 'picked';

/** 창균님 관리 화면 (PRD 9). 바꿀 때마다 서버 상태를 다시 받아 그린다. */
export function AdminPanel({ initial, pickedLabel }: { initial: AdminState; pickedLabel: string }) {
  const [st, setSt] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => setSt(await api<AdminState>('/api/admin/state')), []);

  /** 서버에 쓰고 다시 읽는다. 실패하면 서버 문구를 그대로 보인다. */
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setError(null);
      setBusy(true);
      try {
        await fn();
        await reload();
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const c = st.config;
  const now = Date.parse(st.now);
  const phase = examPhase({ openAt: c.liveOpenAt, startAt: c.liveStartAt, winner: c.liveWinnerName }, now);
  const unpublished = !!c.publishAt && now < Date.parse(c.publishAt);

  return (
    <main className={s.wrap}>
      <header className={s.top}>
        <h1 className={s.title}>【관리】 존속기간 만료 안내</h1>
        <div className={s.topBtns}>
          <button type="button" className={s.ghost} onClick={() => run(async () => {})} disabled={busy}>
            새로 고침
          </button>
          <button
            type="button"
            className={s.ghost}
            onClick={async () => {
              await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
              location.reload();
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {error && (
        <p className={s.errorBar} role="alert">
          ※ {error}
        </p>
      )}

      {/* ── 현황 ── */}
      <section className={s.panel}>
        <h2 className={s.h}>【현황】</h2>
        <dl className={s.stats}>
          <Stat k="방문 기기" v={st.stats.visits} />
          <Stat k="의견서" v={st.stats.total} />
          <Stat k="공개" v={st.stats.public} />
          <Stat k="창균님만" v={st.stats.private} />
          <Stat k="숨김" v={st.stats.hidden} />
          <Stat k="선정" v={`${st.stats.picked}/${PICK_MAX}`} />
        </dl>
        <dl className={s.kv}>
          <div>
            <dt>지금 화면</dt>
            <dd>{unpublished ? '게시 전 — 방문자에게는 안내 한 장만' : '공개 중'}</dd>
          </div>
          <div>
            <dt>심사 공고</dt>
            <dd>{PHASE[phase]}</dd>
          </div>
          <div>
            <dt>서버 시각</dt>
            <dd className="mono">{formatKST(st.now)}</dd>
          </div>
        </dl>
      </section>

      <Schedule key={JSON.stringify(c)} st={st} busy={busy} run={run} />
      <Winner key={c.liveWinnerName ?? ''} current={c.liveWinnerName} busy={busy} run={run} />
      <Messages st={st} busy={busy} run={run} pickedLabel={pickedLabel} />

      {/* ── 내보내기 ── */}
      <section className={s.panel}>
        <h2 className={s.h}>【내보내기】</h2>
        <p className={s.note}>소장용입니다. 숨긴 글도 CSV에는 들어가고 표시가 붙습니다. 인쇄본에서는 숨긴 글을 뺍니다.</p>
        <div className={s.row2}>
          <a className={s.ghostLink} href="/api/admin/export">
            CSV 내려받기
          </a>
          <a className={s.ghostLink} href="/admin/print" target="_blank" rel="noopener">
            인쇄용 A4 페이지
          </a>
        </div>
      </section>
    </main>
  );
}

type Run = (fn: () => Promise<unknown>) => Promise<boolean>;

function Stat({ k, v }: { k: string; v: number | string }) {
  return (
    <div className={s.stat}>
      <dt>{k}</dt>
      <dd className="mono">{v}</dd>
    </div>
  );
}

/** 【일정】 — D일 하루 안의 시각들. 저장하면 화면 상태가 그 시각에 맞춰 저절로 바뀐다. */
function Schedule({ st, busy, run }: { st: AdminState; busy: boolean; run: Run }) {
  const c = st.config;
  const [dDay, setDDay] = useState(c.dDay ?? '');
  const [publish, setPublish] = useState(c.publishAt ? kstTime(c.publishAt) : '09:00');
  const [open, setOpen] = useState(c.liveOpenAt ? kstTime(c.liveOpenAt) : '12:45');
  const [start, setStart] = useState(c.liveStartAt ? kstTime(c.liveStartAt) : '12:50');
  const [pickDeadline, setPickDeadline] = useState(c.pickDeadlineAt ? kstTime(c.pickDeadlineAt) : '16:00');
  const [liveUrl, setLiveUrl] = useState(c.liveUrl ?? '');

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      api('/api/admin/schedule', { method: 'PUT', body: { dDay, publish, open, start, pickDeadline, liveUrl } }),
    );
  };

  return (
    <form className={s.panel} onSubmit={save}>
      <h2 className={s.h}>【일정】</h2>
      <p className={s.note}>
        {c.dDay ? (
          <>
            저장된 D일 <b className="mono">{c.dDay}</b>
          </>
        ) : (
          'D일 미정 — 페이지는 공개 상태이고, 심사 공고는 예고 카드만 보입니다.'
        )}
      </p>

      <div className={s.grid}>
        <Field label="D일 (마지막 출근일)" wide>
          <input className={s.input} type="date" value={dDay} onChange={(e) => setDDay(e.target.value)} required />
        </Field>
        <Field label="게시 (이전엔 관리자만)">
          <input className={s.input} type="time" value={publish} onChange={(e) => setPublish(e.target.value)} required />
        </Field>
        <Field label="입장 버튼 열림">
          <input className={s.input} type="time" value={open} onChange={(e) => setOpen(e.target.value)} required />
        </Field>
        <Field label="1번 문항">
          <input className={s.input} type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
        </Field>
        <Field label="의견서 선정 마감">
          <input
            className={s.input}
            type="time"
            value={pickDeadline}
            onChange={(e) => setPickDeadline(e.target.value)}
            required
          />
        </Field>
        <Field label="라이브 OX 주소 (KIPlay_OX)" wide>
          <input
            className={s.input}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
          />
        </Field>
      </div>
      <p className={s.note}>모든 시각은 한국 시각(KST)입니다. 주소는 입장 버튼이 열린 뒤에만 방문자에게 전달됩니다.</p>

      <div className={s.row2}>
        <button className={s.primary} disabled={busy}>
          일정 저장
        </button>
        {c.dDay && (
          <button
            type="button"
            className={s.ghost}
            disabled={busy}
            onClick={() => {
              if (confirm('일정을 지우고 D 미정으로 되돌릴까요? 라이브 주소와 우승자는 남습니다.'))
                run(() => api('/api/admin/schedule', { method: 'PUT', body: { dDay: null } }));
            }}
          >
            D 미정으로
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`${s.field}${wide ? ` ${s.wide}` : ''}`}>
      <span className={s.lab}>{label}</span>
      {children}
    </label>
  );
}

/** 【등록 결정】 — 라이브 OX 우승자. 사번은 사내 시스템으로 이름을 확인해 적는다 (PRD 5.4). */
function Winner({ current, busy, run }: { current: string | null; busy: boolean; run: Run }) {
  const [name, setName] = useState(current ?? '');
  return (
    <form
      className={s.panel}
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api('/api/admin/winner', { method: 'PUT', body: { name } }));
      }}
    >
      <h2 className={s.h}>【등록 결정】</h2>
      <p className={s.note}>
        {current ? (
          <>
            지금 카드: 등록 결정: <b>{current}</b>님
          </>
        ) : (
          '우승 공보 카드의 사번을 사내 시스템으로 확인한 뒤 이름을 적으세요. 저장하면 카드가 결과로 바뀝니다.'
        )}
      </p>
      <Field label="우승자 이름" wide>
        <input className={s.input} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className={s.row2}>
        <button className={s.primary} disabled={busy || !name.trim() || name.trim() === current}>
          우승자 저장
        </button>
        {current && (
          <button
            type="button"
            className={s.ghost}
            disabled={busy}
            onClick={() => {
              if (confirm('우승자를 지울까요? 카드가 진행·대기 상태로 돌아갑니다.'))
                run(() => api('/api/admin/winner', { method: 'PUT', body: { name: null } }));
            }}
          >
            지우기
          </button>
        )}
      </div>
    </form>
  );
}

/** 【의견서 관리】 — 비공개·숨김까지 전부. 숨김은 삭제 대신이다. */
function Messages({
  st,
  busy,
  run,
  pickedLabel,
}: {
  st: AdminState;
  busy: boolean;
  run: Run;
  pickedLabel: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const all = st.messages;
  const counts: Record<Filter, number> = {
    all: all.length,
    public: all.filter((m) => m.visibility === 'public').length,
    private: all.filter((m) => m.visibility === 'private').length,
    hidden: all.filter((m) => m.hidden).length,
    picked: all.filter((m) => m.picked).length,
  };
  const shown = all.filter((m) =>
    filter === 'all'
      ? true
      : filter === 'hidden'
        ? m.hidden
        : filter === 'picked'
          ? m.picked
          : m.visibility === filter,
  );
  const full = counts.picked >= PICK_MAX;
  const deadline = st.config.pickDeadlineAt;

  const patch = (m: AdminMessage, body: { hidden?: boolean; picked?: boolean }) =>
    run(() => api(`/api/admin/messages/${m.id}`, { method: 'PATCH', body }));

  const tabs: [Filter, string][] = [
    ['all', '전체'],
    ['public', '공개'],
    ['private', '창균님만'],
    ['hidden', '숨김'],
    ['picked', '선정'],
  ];

  return (
    <section className={s.panel}>
      <h2 className={s.h}>【의견서 관리】</h2>
      <p className={s.note}>
        선정은 {PICK_MAX}편까지
        {deadline ? (
          <>
            , <span className="mono">{formatKST(deadline)}</span> 전에 제출된 글만
          </>
        ) : null}
        . 선정된 글은 숨길 수 없고, 작성자도 지울 수 없습니다. 창균님만 보기 글은 선정해도 공개 목록에 나오지 않습니다.
      </p>

      <div className={s.tabs} role="tablist">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filter === k}
            className={s.tab}
            onClick={() => setFilter(k)}
          >
            {label} <span className="mono">{counts[k]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className={s.empty}>해당하는 의견서가 없습니다.</p>
      ) : (
        <ol className={s.list}>
          {shown.map((m) => (
            <li key={m.id} className={`${s.card}${m.hidden ? ` ${s.cardHidden}` : ''}`}>
              {m.picked && (
                <div className={s.pick}>
                  <Seal label={pickedLabel} />
                </div>
              )}
              <p className={s.who}>
                <b>{m.name}</b>
                {m.dept && <span className={s.dept}>{m.dept}</span>}
              </p>
              <p className={s.tags}>
                <span className="mono">{formatKST(m.createdAt)}</span>
                {m.visibility === 'private' && <span className={s.tag}>창균님만 보기</span>}
                {m.hidden && <span className={s.tag}>숨김</span>}
                {!m.eligible && <span className={s.tag}>선정 마감 후</span>}
                {m.updatedAt !== m.createdAt && <span className={s.tag}>수정됨</span>}
              </p>
              <p className={s.body}>{m.body}</p>
              <div className={s.actions}>
                {m.picked ? (
                  <button type="button" className={s.ghost} disabled={busy} onClick={() => patch(m, { picked: false })}>
                    선정 취소
                  </button>
                ) : (
                  <button
                    type="button"
                    className={s.primarySm}
                    disabled={busy || m.hidden || !m.eligible || full}
                    title={full ? `이미 ${PICK_MAX}편을 골랐습니다` : undefined}
                    onClick={() => patch(m, { picked: true })}
                  >
                    선정
                  </button>
                )}
                <button
                  type="button"
                  className={s.ghost}
                  disabled={busy || m.picked}
                  onClick={() => {
                    if (m.hidden || confirm(`${m.name}님의 의견서를 숨길까요? 공개 목록에서 빠집니다.`))
                      patch(m, { hidden: !m.hidden });
                  }}
                >
                  {m.hidden ? '숨김 해제' : '숨김'}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
