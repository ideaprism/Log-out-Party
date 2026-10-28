import type { EventConfig, Message } from '../types';

/**
 * 저장소. 운영은 Upstash Redis, 로컬 개발은 .data/store.json.
 * 짧은 글 100건 규모라 목록은 통째로 읽어 서버에서 거른다.
 */
export interface Store {
  readonly kind: 'redis' | 'file';

  getConfig(): Promise<EventConfig>;
  setConfig(next: EventConfig): Promise<void>;

  getMessage(id: string): Promise<Message | null>;
  putMessage(m: Message): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  /** 작성순(오래된 것부터) 전체 */
  listMessages(): Promise<Message[]>;

  /** 창 안에서 key의 호출 횟수를 세고, limit 이내면 true */
  hit(key: string, limit: number, windowSec: number): Promise<boolean>;

  addVisit(deviceHash: string): Promise<void>;
  countVisits(): Promise<number>;
}
