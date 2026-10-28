/** 일정. 모든 시각은 ISO 문자열(UTC). 비어 있으면 null — D일 미정. */
export type EventConfig = {
  dDay: string | null;           // 마지막 출근일 'YYYY-MM-DD' (KST)
  publishAt: string | null;      // 게시 시각. 이전엔 관리자만 열람
  liveOpenAt: string | null;     // 12:45 입장 버튼 활성
  liveStartAt: string | null;    // 12:50 1번 문항
  liveUrl: string | null;        // KIPlay_OX 주소
  liveWinnerName: string | null; // 관리자 입력 → 결과 카드
  pickDeadlineAt: string | null; // 16:00 선정 대상 마감
};

export const EMPTY_CONFIG: EventConfig = {
  dDay: null,
  publishAt: null,
  liveOpenAt: null,
  liveStartAt: null,
  liveUrl: null,
  liveWinnerName: null,
  pickDeadlineAt: null,
};

export type Visibility = 'public' | 'private';

/** 저장되는 의견서. deviceHash는 서버 밖으로 나가지 않는다. */
export type Message = {
  id: string;
  deviceHash: string;
  name: string;
  dept: string | null;
  body: string;
  visibility: Visibility;
  hidden: boolean;
  picked: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 공개 피드에 나가는 모양 */
export type PublicMessage = {
  id: string;
  name: string;
  dept: string | null;
  body: string;
  picked: boolean;
  createdAt: string;
  edited: boolean;
};

/** 작성자 본인에게 나가는 모양 */
export type MyMessage = PublicMessage & {
  visibility: Visibility;
  hidden: boolean;
  editableUntil: string;
  canEdit: boolean;
  canDelete: boolean;
};

/** 관리자 화면에 나가는 모양 — 기기 해시만 뺀 전부 */
export type AdminMessage = Omit<Message, 'deviceHash'> & {
  /** 선정 마감 전에 제출된 글인가 */
  eligible: boolean;
};

export type AdminState = {
  now: string;
  config: EventConfig;
  stats: { visits: number; total: number; public: number; private: number; hidden: number; picked: number };
  messages: AdminMessage[];
};

export type FeedPage = {
  items: PublicMessage[];
  next: number | null;
  total: number;
};
