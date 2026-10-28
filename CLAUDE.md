# 존속기간 만료 안내 — 굿바이 KIPI, 헬로 월드

정창균 명예퇴직 기념 모바일 Farewell 앱 (`farewell-ck.vercel.app`). 청첩장처럼 링크만 열면 끝.
기획: `docs/farewell_app_PRD.md` (v1.3).

**범위: ① Farewell 앱만.** ② 12:50 라이브 OX는 `ideaprism/KIPlay_OX` 엔진의 일이다 —
이 레포에서 게임을 만들지 않는다. 앱은 입장 버튼으로 그 주소를 새 창에 열 뿐이다.
`docs/questions.farewell.json`은 ②용 문항 초안으로, 보관만 한다.

## 두 PC 작업 규칙 (회사 PC / 집 PC)

1. **시작할 때 `git pull`** 부터. 다른 PC에서 한 일을 먼저 받는다.
2. **끝낼 때 commit + push.** 미완성이어도 올린다. 안 올리면 다른 PC에서 갈라진다.
3. **커밋 메시지 맨 앞에 `[회사]` 또는 `[집]`** 태그. 예: `[집] 의견서 피드 페이지네이션`
   `hostname`이 `DESKTOP-9PTLFA7`이면 집 PC. 회사 PC 이름은 처음 작업할 때 여기에 적어 둘 것.
4. `.env.local`은 커밋하지 않는다. PC마다 따로 두고, 값은 Vercel 대시보드가 원본이다.
5. 충돌이 나면 덮어쓰지 말고 멈춰서 어느 쪽을 살릴지 묻는다.

## 실행

```
npm install
npm run dev          # http://localhost:3000
npm run typecheck
```

- 미리보기 설정: `.claude/launch.json` (farewell-dev)
- 저장소 환경변수가 없으면 로컬 파일(`.data/store.json`)로 돈다. 운영은 Upstash Redis.
- 미리보기 그림의 절대 주소는 `SITE_URL` → Vercel 운영 도메인 → localhost 순. 도메인을 바꾸면 `SITE_URL`을 넣는다.

## 구조

```
content/            ★ 글만 바꾸는 곳 (편지·타임라인·연락처·IdeaPrism 링크·부서·카피). README 참고
src/lib/content.ts  content/ 로더. zod로 검증하고, 틀리면 파일·칸 이름을 대며 멈춘다
src/lib/store/      저장소 어댑터. redis.ts(운영, Upstash) · file.ts(로컬, .data/store.json). 같은 Store 인터페이스
src/lib/messages.ts 의견서 규칙 전부 (검증·속도 제한·24시간 수정·선정글 삭제 불가·피드 정렬)
src/lib/limits.ts   서버 검증과 입력창이 같이 쓰는 한도 (300자 등)
src/lib/phase.ts    【심사 공고】 상태 계산. 서버·브라우저 공용 (아래 '시각 기준 상태')
src/lib/schedule.ts 일정 → 카드 스냅숏, publish_at 전 게이트(화면·의견서 API 모두)
src/app/opengraph-image.tsx  링크 미리보기(공보 1면). 빌드 때 Google Fonts에서 쓰는 글자만 받아 그린다
src/lib/admin.ts    관리자 쿠키·로그인. adminOps.ts는 일정 저장·우승자·숨김/선정·CSV
src/components/     admin/(AdminPanel·AdminLogin·인쇄) · Sheet(공보 한 쪽) · Cover · Letter · Timeline · Exam(심사 공고) · Opinions(Form·MyOpinions·Feed) · Seal · Reveal · Txt · PrePublish · Ending(①자유 실시·②다음 출원·③서명)
src/app/api/        messages(GET 피드·POST 작성) · messages/mine · messages/[id](PATCH·DELETE) · visit · exam(GET 카드 스냅숏) · vcard(연락처 .vcf, 게시 전엔 관리자만)
                    admin/ login·logout·state·schedule·winner·messages/[id]·export (전부 쿠키 확인)
docs/               PRD, ②용 문항 초안
```

### 의견서 데이터 규칙

- 기기 식별은 localStorage의 익명 토큰. 서버는 **sha256 해시만** 저장하고 응답에 절대 싣지 않는다.
  토큰은 URL에 싣지 않는다(그래서 `mine`·`visit`도 POST).
- 수정: 같은 기기 + 작성 후 24시간 + 숨김 아님. 삭제: 같은 기기 + 선정되지 않은 글. 남의 글이면 "없음"(404)으로 답한다.
- 피드: 공개 + 숨김 아님, 선정 먼저 → 최신순, 20건씩. 글자 수는 `Array.from`으로 센다(이모지 1자).
- 속도 제한: 기기당 10분 5건, IP당 10분 40건(사내 공유기 뒤 여러 명).
- 선정은 `/admin`에서. 최대 2편, 선정 마감 전 제출분만, 숨긴 글 불가. 선정된 글은 숨김 불가.
- 관리자 화면 문구는 의견서 폼 라벨처럼 코드에 둔다(창균님 전용 도구). 방문자에게 보이는 글은 여전히 `content/`.

## 절대 규칙

- **문구를 코드에 하드코딩하지 않는다.** 화면 글은 전부 `content/`에서 온다.
- **인주(`--seal` #B03A2E)는 선정 의견서의 登 도장에만 쓴다.** 그 외 화면의 빨강은 0%다.
  강조·경고·오류·포커스 링에도 쓰지 않는다(오류는 먹색 + 문구로). 빨강·주황·분홍 계열 전체가 인주의 자리다.
- **남색(`--navy`)은 표지 (19)(12) 기관명 줄에만.** spec.html의 분홍 이탤릭 표제는 먹으로 바꿨다 — 분홍이 登와 경쟁한다.
- **IdeaPrism은 엔딩 ② '다음 출원'에서 단 1회.** 표지·메타·OG·게시판 제목에 넣지 않는다 — 송별 인사가 창업 공지로 읽힌다.
- **'스티브 창스(자칭)'은 엔딩 ③에서만, '(자칭)' 필수.** 엔딩 순서 ①자유 실시 → ②다음 출원 → ③서명 고정.
- **사번·전화번호를 수집하지 않는다.** 저장하는 것은 이름·부서·메시지뿐. 사번은 ② 라이브 OX 서버 메모리에만 있다.
- 저장소 토큰과 `ADMIN_KEY`는 서버 라우트에서만 쓴다. 브라우저는 저장소에 직접 닿지 않는다.

## 아트 디렉션 — 등록특허공보 (원본: KIPlay_OX CLAUDE.md · public/style.css)

- 먹 `#141414` · 용지 `#FAF7F0` · 지면 `#EFEBE1` · 괘선 `#C8C2B6`. 면은 해칭. 명암·그라디언트·광택·드롭섀도 금지.
  종이 가장자리는 그림자 대신 1px 괘선.
- 본문·제목은 명조(Nanum Myeongjo, `next/font`로 자체 호스팅 — 안드로이드엔 바탕체가 없다), 라벨은 고딕, 숫자·부호는 모노.
- **INID 괄호 숫자가 디자인의 서명이다.** (19)(12)(45)(11)(24)(72)(73)(54)(57). 섹션 표제는 【도 1】【심사 공고】【의견서】.
- 표제부 순서는 실제 공보를 따른다: 굵은 괘선 → (19)(12) → 굵은 괘선 → 서지 → (54) 띠 → (57) → 대표도.
- 본문 17px 이상. 대비 4.5:1 이상(`--ink-3`이 하한). 기준 화면 360~430px, PC는 가운데 480px 고정 폭.
- 표지·편지는 한 화면 = 한 장(`Sheet paged`, scroll-snap proximity). **375×812에서 표지가 넘치지 않을 것** —
  넘치면 대표도(`22svh`)가 먼저 줄어든다. 표지에 줄을 더하면 높이를 다시 재 볼 것.
- 모션은 섹션 진입 페이드와 도장 찍힘뿐. `prefers-reduced-motion`이면 둘 다 끈다.
  페이드는 `html.js`일 때만 숨기므로 스크립트가 막혀도 글은 보인다.
- 도장은 KIPlay_OX `crowd.js seal()`과 같은 모양: 이중 원, -0.12rad 회전, 찍힐 때 1.12배로 눌렸다 돌아옴.
- 문단은 왼쪽 정렬. 양끝 맞춤은 `word-break: keep-all`과 만나 어절 사이가 벌어진다.
- `[확인필요]`는 인주 대신 점선 테두리로 표시한다(`Txt` 컴포넌트).

## 시각 기준 상태 (PRD 6.4, 수동 버튼 없음)

```
[PREVIEW] ─publish_at─▶ [OPEN] ─live_open_at─▶ [LIVE] ─우승자 입력─▶ [AFTER]
```

- 일정 값이 비어 있으면(D 미정) 페이지는 공개, 【심사 공고】는 예고 카드만.
- `publish_at`이 정해졌고 그 전이면 일반 방문자에게는 "게임은 지정한 날 12:50에 실행됩니다" 안내만. 관리자 쿠키는 통과.
- 모든 시각은 KST. 클라이언트 시계 대신 서버 시각으로 보정한다.
- 카드 세부 상태: 미정 → 예고(D-n / 당일 HH:MM:SS) → 입장(live_open_at) → 진행(live_start_at ~ D일 자정)
  → 결과(우승자 입력) / 대기(D일이 지났는데 우승자 없음). 라이브 주소는 입장 시각부터만 응답에 싣는다.
- 관리자 쿠키 `fw_admin` = sha256(`fw-admin:` + ADMIN_KEY), httpOnly·30일. 키를 바꾸면 기존 쿠키는 모두 무효.
  로그인 시도는 IP당 10분 10회. 로컬은 `.env.local`의 `ADMIN_KEY`로 `/admin`에 들어간다.
- 일정은 `/admin`에서 D일 + 그날의 시각(게시·입장·1번 문항·선정 마감)으로 입력한다. 저장은 ISO(UTC).

## 진행 단계

①레이아웃·표지·편지·타임라인 ②의견서 작성·피드 ③심사 공고 카드 ④/admin ⑤OG 이미지·vCard ⑥테스트.
단계마다 375px·PC 화면을 캡처해 확인받은 뒤 다음 단계로 간다.
