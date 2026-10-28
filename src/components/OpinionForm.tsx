'use client';

import { useEffect, useId, useState } from 'react';
import type { DepartmentList, OpinionCopy } from '@/lib/content';
import { api, charCount, deviceToken, loadAuthor, saveAuthor } from '@/lib/client';
import { BODY_MAX, DEPT_MAX, NAME_MAX } from '@/lib/limits';
import type { MyMessage, Visibility } from '@/lib/types';
import s from './Opinion.module.css';

const OTHER = '__other';

/** 【의견서】 작성. 표제는 실제 의견서 서식의 【 】 항목을 따른다. */
export function OpinionForm({
  departments,
  text,
  onSubmitted,
}: {
  departments: DepartmentList;
  text: OpinionCopy;
  onSubmitted: (m: MyMessage) => void;
}) {
  const uid = useId();
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [deptOther, setDeptOther] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Visibility | null>(null);

  // 두 번째 의견서부터는 이름·부서를 다시 묻지 않는다
  useEffect(() => {
    const a = loadAuthor();
    if (!a) return;
    setName(a.name);
    setDept(a.dept);
    setDeptOther(a.deptOther);
  }, []);

  const count = charCount(body);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setSending(true);
    try {
      const m = await api<MyMessage>('/api/messages', {
        method: 'POST',
        body: {
          token: deviceToken(),
          name,
          dept: dept === OTHER ? deptOther : dept || null,
          body,
          visibility,
          consent,
        },
      });
      saveAuthor({ name, dept, deptOther });
      setBody('');
      setDone(m.visibility);
      onSubmitted(m);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <div className={s.field}>
        <label htmlFor={`${uid}-name`} className={s.lab}>
          【성명】<span className={s.req}>필수</span>
        </label>
        <input
          id={`${uid}-name`}
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          required
          autoComplete="name"
        />
      </div>

      <div className={s.field}>
        <label htmlFor={`${uid}-dept`} className={s.lab}>
          【소속】
        </label>
        <select id={`${uid}-dept`} className={s.input} value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">선택 안 함</option>
          {departments.groups.map((g) => (
            <optgroup key={g.name} label={g.name}>
              {g.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER}>{departments.other}</option>
        </select>
        {dept === OTHER && (
          <input
            aria-label="소속 직접 입력"
            className={`${s.input} ${s.sub}`}
            value={deptOther}
            onChange={(e) => setDeptOther(e.target.value)}
            maxLength={DEPT_MAX}
            placeholder="소속을 적어 주세요"
          />
        )}
      </div>

      <div className={s.field}>
        <label htmlFor={`${uid}-body`} className={s.lab}>
          【의견 내용】<span className={s.req}>필수</span>
        </label>
        <textarea
          id={`${uid}-body`}
          className={`${s.input} ${s.area}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          required
          aria-describedby={`${uid}-count`}
        />
        <p id={`${uid}-count`} className={`${s.count} mono`} aria-live="polite">
          <span className={count > BODY_MAX ? s.over : undefined}>{count}</span> / {BODY_MAX}
        </p>
      </div>

      <fieldset className={s.field}>
        <legend className={s.lab}>【공개 범위】</legend>
        <div className={s.seg}>
          <label className={s.segItem}>
            <input
              type="radio"
              name={`${uid}-vis`}
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />
            <span>공개</span>
          </label>
          <label className={s.segItem}>
            <input
              type="radio"
              name={`${uid}-vis`}
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />
            <span>창균님만 보기</span>
          </label>
        </div>
      </fieldset>

      <label className={s.consent}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>{text.consent}</span>
      </label>

      {error && (
        <p className={s.error} role="alert">
          ※ {error}
        </p>
      )}
      {done && (
        <p className={s.done} role="status">
          {done === 'public'
            ? '의견서가 접수되었습니다. 아래 목록에 실렸습니다.'
            : '창균님만 볼 수 있게 접수되었습니다.'}
        </p>
      )}

      <button type="submit" className={s.submit} disabled={sending || count > BODY_MAX}>
        {sending ? '제출 중…' : '의견서 제출'}
      </button>
    </form>
  );
}
