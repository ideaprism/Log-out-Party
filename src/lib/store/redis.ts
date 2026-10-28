import { Redis } from '@upstash/redis';
import { EMPTY_CONFIG, type EventConfig, type Message } from '../types';
import type { Store } from './types';

/*
 * 키 구조
 *   fw:config        EventConfig (JSON)
 *   fw:msg:{id}      Message (JSON)
 *   fw:msgs          정렬 집합. score = 작성 시각(ms), member = id
 *   fw:visits        집합. 기기 해시
 *   fw:rl:{key}      속도 제한 카운터 (EXPIRE)
 */
const K = {
  config: 'fw:config',
  msg: (id: string) => `fw:msg:${id}`,
  msgs: 'fw:msgs',
  visits: 'fw:visits',
  rl: (key: string) => `fw:rl:${key}`,
};

export function createRedisStore(url: string, token: string): Store {
  const r = new Redis({ url, token });

  return {
    kind: 'redis',

    async getConfig() {
      const c = await r.get<Partial<EventConfig>>(K.config);
      return { ...EMPTY_CONFIG, ...(c ?? {}) };
    },
    async setConfig(next) {
      await r.set(K.config, next);
    },

    async getMessage(id) {
      return (await r.get<Message>(K.msg(id))) ?? null;
    },
    async putMessage(m) {
      const p = r.pipeline();
      p.set(K.msg(m.id), m);
      p.zadd(K.msgs, { score: Date.parse(m.createdAt), member: m.id });
      await p.exec();
    },
    async deleteMessage(id) {
      const p = r.pipeline();
      p.del(K.msg(id));
      p.zrem(K.msgs, id);
      await p.exec();
    },
    async listMessages() {
      const ids = await r.zrange<string[]>(K.msgs, 0, -1);
      if (ids.length === 0) return [];
      const rows = await r.mget<(Message | null)[]>(...ids.map(K.msg));
      return rows.filter((m): m is Message => m !== null);
    },

    async hit(key, limit, windowSec) {
      const k = K.rl(key);
      const n = await r.incr(k);
      if (n === 1) await r.expire(k, windowSec);
      return n <= limit;
    },

    async addVisit(deviceHash) {
      await r.sadd(K.visits, deviceHash);
    },
    async countVisits() {
      return r.scard(K.visits);
    },
  };
}
