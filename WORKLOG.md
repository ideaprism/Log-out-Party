# 작업일지

## 2026-10-28 (수) — 집 PC
**작업**: 진행 단계 ①~⑥ 코드 전부 완료. 배포는 사용자가 "나중에"로 미룸.

**사고와 복구**: 20:53에 ①·②를 만들던 Claude 세션(`872a35fd…`)이 앱에서 삭제됨. 대화 기록만 사라졌고
코드는 커밋돼 있어 손실 없음. 휴지통의 `Log-out Party.md`(13.6KB)는 PRD v1.0 초안이라 `docs/` v1.3으로 대체됨.
원격 저장소가 없던 것을 `https://github.com/ideaprism/Log-out-Party`(origin)로 연결해 처음 push.

**완료** (커밋 순)
- `977fc51` ③ 【심사 공고】 카드 — `src/lib/phase.ts`(상태 6개: 미정·예고·입장·진행·대기·결과), `src/components/Exam.tsx`,
  `/api/exam`. 서버 시각 보정, 라이브 주소는 입장 시각부터만 응답. `publish_at` 전 `PrePublish` 안내 한 장
- `d3dffc3` ④ `/admin` — 로그인(쿠키=ADMIN_KEY 해시), 현황·일정·우승자·숨김/선정(2편·마감 전·숨김 불가)·CSV·인쇄 A4.
  게시 전에는 의견서·방문 API도 관리자만(`publicHandle`)
- `a9e9b83` ⑤ OG 이미지(`src/app/opengraph-image.tsx`, 빌드 때 Google Fonts 부분 글꼴), `/api/vcard`, 엔딩 7쪽(`Ending.tsx`)
- `d54a32a` ⑥ 테스트 — `npm test` 단위 46건, `npm run test:e2e` E2E 24건 모두 통과. 앱 버그는 나오지 않음

**결정 사항** (대화에서 정한 것 — 코드만 봐서는 이유를 모름)
- 관리자 화면 문구는 코드에 둔다(의견서 폼 라벨과 같은 취급). 방문자 화면 글만 `content/`.
- 엔딩 표제 「【존속기간 만료】」는 PRD 카피 덱에 없어 Claude가 정함 → `content/copy.json` `ending.heading`. 사용자 미확정.
- 창균님만 보기 글도 선정 가능(공개 목록엔 안 나옴). 선정된 글은 숨김 불가.
- E2E는 이 PC의 Chrome 사용(Playwright 브라우저 미설치). 전용 저장소 `.data/e2e-store.json`, 포트 3100.

**진행 중**: 없음. 작업 트리 깨끗, origin/main과 같음.

**다음에 할 일**
1. 배포 — Vercel 프로젝트 `farewell-ck` 생성, Upstash Redis 연결, 운영 `ADMIN_KEY` 넣기. 실제로 만들기 전에 단계별로 확인받을 것.
2. content 채우기 — `content/contact.json` 전화·이메일(자리표시자), `content/links.json` IdeaPrism 주소(example.com),
   `public/caricature.svg`(자리표시자), `[확인필요]` 10곳(편지·타임라인·표지 날짜). D일 미정.
3. 실기기 확인 — 아이폰·갤럭시, 카카오톡 인앱 브라우저에서 [연락처 저장](.vcf)·[심사장 입장] 새 창.
4. 베타 — D-5~D-3 가까운 동료 5명 (PRD 11).

**메모**
- 집 PC에만 `.env.local`(테스트용 ADMIN_KEY)이 있다. 회사 PC는 clone 후 따로 만들 것. 회사 PC 이름은 CLAUDE.md에 아직 미기재.
- GitHub MCP 커넥터는 인증 오류로 연결 실패 상태였고, 이 PC에 `gh` CLI 없음.
