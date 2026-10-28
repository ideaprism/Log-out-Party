'use client';

import { useState } from 'react';
import { api, charCount, deviceToken } from '@/lib/client';
import { formatKST } from '@/lib/kst';
import { BODY_MAX } from '@/lib/limits';
import type { MyMessage, Visibility } from '@/lib/types';
import s from './Opinion.module.css';

/** 이 기기에서 쓴 의견서. 수정은 24시간 안, 삭제는 언제든(선정된 글 제외). */
export function MyOpinions({ items, onChanged }: { items: MyMessage[]; onChanged: () => void }) {
  if (items.length === 0) return null;
  return (
    <section className={s.mine} aria-labelledby="mine-h">
      <h3 id="mine-h" className={s.mineH}>
        내가 쓴 의견서 <span className={s.mineSub}>이 기기에서 쓴 것만 보입니다</span>
      </h3>
      <ul className={s.mineList}>
        {items.map((m) => (
          <MyItem key={m.id} m={m} onChanged={onChanged} />
        ))}
      </ul>
    </section>
  );
}

function MyItem({ m, onChanged }: { m: MyMessage; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(m.body);
  const [visibility, setVisibility] = useState<Visibility>(m.visibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/messages/${m.id}`, { method: 'PATCH', body: { token: deviceToken(), body, visibility } });
      setEditing(false);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm('이 의견서를 지울까요? 되돌릴 수 없습니다.')) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/messages/${m.id}`, { method: 'DELETE', body: { token: deviceToken() } });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const count = charCount(body);

  return (
    <li className={s.mineItem}>
      <p className={s.tags}>
        <span className={s.tag}>{m.visibility === 'public' ? '공개' : '창균님만 보기'}</span>
        {m.picked && <span className={s.tag}>선정됨</span>}
        {m.hidden && <span className={s.tag}>관리자 숨김</span>}
        <span className={`${s.when} mono`}>{formatKST(m.createdAt)}</span>
      </p>

      {editing ? (
        <>
          <textarea
            className={`${s.input} ${s.area}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            aria-label="의견 내용 수정"
          />
          <p className={`${s.count} mono`}>
            <span className={count > BODY_MAX ? s.over : undefined}>{count}</span> / {BODY_MAX}
          </p>
          <div className={s.seg}>
            <label className={s.segItem}>
              <input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
              <span>공개</span>
            </label>
            <label className={s.segItem}>
              <input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
              <span>창균님만 보기</span>
            </label>
          </div>
        </>
      ) : (
        <p className={s.body}>{m.body}</p>
      )}

      {error && (
        <p className={s.error} role="alert">
          ※ {error}
        </p>
      )}

      <div className={s.actions}>
        {editing ? (
          <>
            <button type="button" className={s.btn} onClick={save} disabled={busy || count > BODY_MAX}>
              저장
            </button>
            <button
              type="button"
              className={s.btnGhost}
              onClick={() => {
                setEditing(false);
                setBody(m.body);
                setVisibility(m.visibility);
                setError(null);
              }}
              disabled={busy}
            >
              취소
            </button>
          </>
        ) : (
          <>
            {m.canEdit && (
              <button
                type="button"
                className={s.btnGhost}
                onClick={() => {
                  setBody(m.body);
                  setVisibility(m.visibility);
                  setEditing(true);
                }}
                disabled={busy}
              >
                수정
              </button>
            )}
            {m.canDelete && (
              <button type="button" className={s.btnGhost} onClick={del} disabled={busy}>
                삭제
              </button>
            )}
            {m.canEdit && <span className={s.until}>수정 가능 · {formatKST(m.editableUntil)}까지</span>}
          </>
        )}
      </div>
    </li>
  );
}
