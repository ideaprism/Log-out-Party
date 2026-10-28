'use client';

import { useState } from 'react';
import { api } from '@/lib/client';
import s from './Admin.module.css';

export function AdminLogin() {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api('/api/admin/login', { method: 'POST', body: { key } });
      location.reload();
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  return (
    <main className={s.wrap}>
      <form className={s.panel} onSubmit={submit}>
        <h1 className={s.h}>【관리】</h1>
        <label className={s.lab} htmlFor="admin-key">
          관리자 키
        </label>
        <input
          id="admin-key"
          className={s.input}
          type="password"
          autoComplete="current-password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
        />
        {error && (
          <p className={s.error} role="alert">
            ※ {error}
          </p>
        )}
        <button className={s.primary} disabled={sending || !key}>
          {sending ? '확인 중…' : '들어가기'}
        </button>
      </form>
    </main>
  );
}
