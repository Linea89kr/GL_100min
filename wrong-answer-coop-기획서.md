# 무한의 오답 협동조합 (Wrong Answer Only: Wiki) — 기획서 & 아키텍처

**작성일:** 2026-11-07
**상태:** Draft (100분 해커톤 프로토타입 기준)
**용도:** 아이스브레이킹 + 개발 학습을 겹친 웹 게임. 100분 해커톤 템플릿/시연 프로젝트.

---

## 0. 요약

- 100분 해커톤에서 단일 HTML + Vercel + Supabase + LLM 판정으로 만드는 "오답만 제출하는" 아이스브레이킹 학습 게임.
- 핵심 메커닉은 **블러프 라운드**: 진짜 정답을 오답 사이에 섞어 투표시키고, 속인 사람이 점수를 가져간다. 가장 많이 속인 오답 = 가장 흔한 오개념 → 그 자리에서 해설.
- LLM은 **정답 여부만** 판정하고, **재미는 사람이** 판정한다.
- 라운드 결과는 "오답 위키"로 아카이브되어 커뮤니티 자산이 된다.

---

## 1. 해커톤 운영 설계

### 1.1 주제

1. **개발 공부·성장·학습** — 학습을 돕는 프로그램 / 성장 경험을 나누는 도구
2. **소통·친목·연결** — 서로를 연결하는 프로그램 / 커뮤니티·대화를 돕는 도구
3. **스터디 운영** — 반복 운영을 줄이는 프로그램 / 커뮤니티에 필요한 도구

본 기획은 1·2를 정면으로, 3을 부분적으로(스터디 단위 방, 반복 출제) 커버한다.

### 1.2 100분 타임라인

| 시간 | 구간 | 내용 |
|---|---|---|
| 0–5 | 킥오프 | 주제·규칙·제출 형식·심사 기준 1장 공개. 질문 없이 시작 |
| 5–15 | 아이디어 확정 | "우리 게임은 ___다" 한 문장 + 핵심 기능 1개. 15분 강제 마감 |
| 15–65 | 제작 1차 (50분) | 핵심 기능 하나만 돌아가게. 40분에 "지금 돌아가는 거 있어?" 체크인 |
| 65–80 | 제작 2차 (15분) | **새 기능 금지.** 버그 수정, 데모 흐름 정리 |
| 80–95 | 발표 | 팀당 2분 라이브 데모 + 1분 Q&A (5팀 기준) |
| 95–100 | 마무리 | 결과 발표 / 한 줄 피드백 / 사진 |

운영 원칙:
- 아이디어 시간은 10분을 넘기지 않는다. 주제 사전 공개로 더 줄일 수 있다.
- 65분에 "기능 추가 금지" 선언. 발표는 슬라이드 없이 라이브 시연만.
- 전면 타이머 + 15/40/65/80분 전체 공지.
- 8팀 이상이면 발표를 1분 데모로 줄이거나 제작 5분을 발표로 이동.

### 1.3 게임으로 풀 때 미리 막을 함정

- 실시간 멀티플레이는 가장 자주 터지는 지점 → 템플릿에서 DB·실시간을 미리 붙여 제공.
- "포인트·배지만 붙인 투두리스트"는 게임으로 인정하지 않는다고 킥오프에 명시. 선택과 긴장이 있어야 게임.
- 그래픽은 이모지와 색 블록으로. 외부 폰트·이미지 금지.

---

## 2. 레포 & 인프라 세팅 (주최자 사전 준비, 약 30분)

### 2.1 GitHub 레포 생성 화면

- **Description:** "100분 해커톤 스타터 — HTML/JS 단일 파일 + Supabase 리더보드"
- **Public** (Pages/Vercel 무료 배포)
- **Add README:** 체크
- **.gitignore:** Node 템플릿 선택 후 아래 추가
- **License:** MIT
- 생성 후 **Settings → General → Template repository** 체크 (참가자는 "Use this template")

```gitignore
node_modules/
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
.env
.env.local
.vercel
```

### 2.2 "Jumpstart your project with Copilot" 프롬프트

Copilot 코딩 에이전트가 드래프트 PR로 파일을 생성한다. 레포 설정(Pages, Template)은 건드리지 못하므로 직접 해야 한다. 붙여넣을 프롬프트:

```
100분 해커톤용 템플릿 레포를 만들어줘. 참가자들이 "Use this template"으로 복사해서
단일 HTML 파일로 작은 웹 게임을 만들고 Vercel로 제출하는 용도야.

파일 구성 (폴더 없음):
1. index.html — 빌드 도구 없이 바로 열리는 단일 파일. HTML/CSS/JS 모두 포함.
   - 상단에 게임 제목(h1)과 "한 문장 규칙"을 적는 자리
   - 60초 카운트다운 타이머 (시작/정지)
   - 점수판, 클릭하면 점수가 오르는 버튼 하나 (참가자가 교체할 자리라는 주석)
   - Supabase JS CDN 로드, submitScore(name, intro, score)와 loadLeaderboard(game) 함수.
     SUPABASE_URL/ANON_KEY 상수가 비어 있으면 localStorage 더미 모드로 동작
   - 모바일 세로 기준 반응형, 외부 폰트·이미지 금지
   - 각 섹션에 "여기를 바꾸세요" 한국어 주석
2. README.md (한국어)
   - 해커톤 주제 3개, 규칙(단일 index.html, 서버 코드 금지, CDN script만 허용, 이모지/색 블록 그래픽)
   - 타임라인: 0–5 킥오프 / 5–15 아이디어 / 15–65 제작 / 65–80 마감 / 80–95 발표 / 95–100 마무리
   - 제출: Vercel 배포 주소 1개. Vercel import 3단계 + 막힐 때 GitHub Pages 플랜 B
   - 팀 작성란: 팀명, 게임 한 문장, 핵심 메커닉 1개, 배포 주소
3. .gitignore — node_modules/, .DS_Store, Thumbs.db, .vscode/, .idea/, *.log, .env*
4. vercel.json — 정적 배포용 최소 설정

package.json, 빌드 설정, 테스트, 프레임워크는 추가하지 마.
```

PR 머지 전 `index.html`을 브라우저에서 직접 열어 타이머·localStorage 동작을 확인한다.

### 2.3 Vercel

- 템플릿 레포를 한 번 import하여 배포 확인. push마다 자동 배포.
- `api/` 폴더에 함수를 두면 서버리스로 확장 가능 (LLM 키 보관 위치).
- 참가자에게 **Vercel 가입·GitHub 연동을 사전 공지.** 막히면 GitHub Pages 플랜 B.

### 2.4 Supabase

- 프로젝트 1개를 **전 팀이 공유.** `game`(또는 `room`) 컬럼으로 팀 구분.
- RLS: 누구나 insert·select, update·delete 불가.
- anon key가 공개 레포에 올라가는 것은 설계상 정상(RLS가 방어선). **해커톤 종료 후 키 재발급 또는 프로젝트 삭제.**

---

## 3. 게임 아이디어 풀 (후보 20개)

단일 HTML, 한 판 1분 이내, 리더보드 붙이기 쉬운 것 기준.

### 3.1 아이스브레이킹 10

| # | 이름 | 한 문장 규칙 | 메모 |
|---|---|---|---|
| 1 | 타이밍 게이지 | 움직이는 바가 구간에 들어올 때 누르면 점수 | JS 20줄, 운+반응 |
| 2 | 스크래치 복권 | 9칸 중 4칸 열고 합이 가장 큰 줄 선택 | 숨은 정보 추리, 초보도 1등 |
| 3 | 누가 썼을까 | 익명 답의 주인을 맞힌다 | 아이스브레이킹 정석 |
| 4 | 공통점 빙고 | 대화로 빙고칸을 채운다 | 돌아다니게 만드는 유일한 게임 |
| 5 | 소수 선택 승리 | 가장 사람이 적은 깃발을 고르면 승 | 전원 동시 참여 |
| 6 | 거짓말 하나 찾기 | 자기소개 3개 중 거짓 1개 찍기 | 자기소개의 게임화 |
| 7 | 이모지 이력서 | 커리어를 이모지 5개로, 남이 해석 | 둘 다 점수 |
| 8 | 릴레이 타이핑 | 문장을 가장 빨리 치면 승 | 개발자 자존심 게임 |
| 9 | 첫인상 투표 | 가벼운 질문에 투표, 결과 공개 | 대화 소재 생성 |
| 10 | 공동 목표 클리커 | 전원이 100초 안에 10,000점 달성 | 협력형 |

### 3.2 교육용(개발 학습) 10

| # | 이름 | 한 문장 규칙 | 메모 |
|---|---|---|---|
| 1 | 버그 찍기 | 10줄 코드에서 버그 줄 클릭 | 문제 5개 하드코딩 |
| 2 | 빅오 스피드 퀴즈 | 코드 보고 O(n)/O(n²)/O(log n) 선택 | 리더보드 궁합 최고 |
| 3 | Git 명령어 상황극 | 상황에 맞는 명령어 선택 | 틀리면 참사 연출 |
| 4 | 정규식 딱 하나 | 정답만 매칭하는 정규식 입력 | 실시간 하이라이트 |
| 5 | HTTP 상태코드 소개팅 | 상황과 코드 매칭 | 401/403/404 |
| 6 | 커밋 메시지 평가단 | 가장 나쁜 커밋 메시지 다수결 | 토론형 |
| 7 | TIL 레벨업 | 배운 것 한 줄 → 경험치 | 성장 공유 |
| 8 | 코드 리뷰 순간판단 | 3초 안에 Approve/Request Changes | 판단 기준 차이 체감 |
| 9 | 네이밍 번역기 | 기능 설명 → 함수 이름 제출, 다수 득표 승 | 네이밍=소통 |
| 10 | 스택 추리 | 에러 메시지로 언어/프레임워크 맞히기 | 중독성 |

두 목적이 가장 잘 겹치는 구조는 **"다른 사람의 답을 보게 되는" 것**(아이스브레이킹 3·6·9, 교육 6·8·9). 본 기획은 이 교차점에서 출발한다.

---

## 4. 선정 기획: 무한의 오답 협동조합

### 4.1 한 문장

> 문제를 보고 가장 그럴듯한 오답을 써라. 남들이 네 오답에 속으면 네 점수, 네가 남의 오답에 속으면 그 사람 점수.

### 4.2 왜 이 메커닉인가

- "오답만"이라는 제약은 정답을 모르는 사람도 참여시킨다 (아이스브레이킹).
- 그럴듯한 오답을 만들려면 정답 근처를 알아야 한다 (학습).
- 가장 많이 속인 오답 = 그 개념의 가장 흔한 오개념 → 해설 포인트가 자동으로 뽑힌다.
- 원안(오답 올리고 좋아요)은 SNS 타래와 구분이 없다. 긴장과 반전(블러프 라운드)이 들어가야 게임이 된다.

### 4.3 라운드 흐름

1. **출제** — 호스트가 문제 + 정답 + 허용 동치 표현 등록 (하드코딩 가능)
2. **제출 (60~90초)** — 참가자가 오답 제출. 즉시 피드에 노출, "검증 중" 뱃지
3. **LLM 게이트 (비동기)** — 정답/동치 여부 판정. 정답이면 🎯 "실수로 정답" 배지
4. **반응** — 피드의 오답에 이모지 4종 반응 (😂 웃김 / 🤔 그럴듯 / 💀 대참사 / 📚 배웠다)
5. **마감 → 블러프 라운드** — 정답 1개 + `closeness` 높은 오답 N개를 익명 섞어 노출. 전원이 "정답"을 1개 고른다
6. **결과** — 두 트랙 시상: 😂 최다(가장 웃긴 오답) / 블러프 최다 득표(가장 많이 속인 오답)
7. **해설** — LLM이 정답 + 상위 오답 3개를 받아 "왜 틀렸고 어디서 헷갈렸는지" 각 2줄. 호스트가 보완
8. **아카이브** — 문제·정답·해설·상위 오답이 "개념 페이지"로 위키에 저장

### 4.4 재미 요소

| 요소 | 설명 | 노리는 것 |
|---|---|---|
| 블러프 라운드 | 정답을 오답 사이에 숨기고 투표 | 긴장·반전, Balderdash/Fibbage 검증 구조 |
| 두 개의 트랙 | 웃긴 오답 / 속인 오답 따로 시상 | 드립파와 공부파 모두 승리 경로 |
| 🎯 실수로 정답 | LLM이 정답 판정 시 벌점 대신 배지 | 가장 웃긴 순간 + 본인이 설명 → 학습 |
| 이모지 어휘 4종 | 좋아요 대신 분류형 반응 | 반응이 데이터가 됨, 위키 필터 |
| 오답 위키 | 라운드 결과를 개념 페이지로 축적 | "흔히 틀리는 방식" 모음 = 교재에 없는 자산 |

### 4.5 커뮤니티 설계

- **방(room)** — 스터디/팀 단위. 같은 DB를 공유하되 room으로 분리.
- **위키** — 지난 라운드 다시 보기, 개념별 오답 모음, 명예의 전당. 재방문 고리.
- **출제 순환** — 스터디원이 돌아가며 출제. 출제자가 가장 많이 배운다는 효과.
- **익명 → 공개** — 제출은 익명, 결과 공개 시 작성자 표시. 속인 사람을 알게 되는 순간이 대화를 만든다.
- **로그인 벽 없음** — 닉네임 + 디바이스 ID만.

### 4.6 LLM 판정 설계

원칙: **LLM은 맞다/틀리다만, 재밌다는 사람이.**

LLM 역할 3가지:
1. **게이트** — 제출이 정답 또는 동치인지. 출력 `{is_correct, closeness: 0~3, misconception: "한 줄", flag: bool}`
2. **해설** — 정답 + 상위 오답 3개 → 각 오답이 틀린 이유와 헷갈린 지점 2줄씩
3. **안전망** — 욕설·인신공격 플래그만. 삭제는 호스트.

운영 디테일:
- 판정은 비동기. 제출 즉시 노출 → 2~3초 후 뱃지 갱신. 동기 처리 시 체감 지연으로 분위기 저하.
- 모델은 작고 빠른 것. 문제당 30건 판정이면 비용 무시 수준.
- 호스트 화면에 **판정 뒤집기 버튼** 필수. LLM 오판은 호스트가 즉시 수정.
- 출제 시 "허용 동치 표현"을 함께 받으면 정확도 상승.
- LLM 장애 시 폴백: 전 제출 "검증 보류" 처리, 호스트가 수동 판정.

---

## 5. 아키텍처 결정 기록 (ADR)

### ADR-001: 100분 프로토타입의 기술 스택

**Status:** Proposed
**Date:** 2026-11-07
**Deciders:** 주최자(템플릿 작성자)

#### Context

- 제작 가용 시간 50~65분. 백엔드 코드를 작성할 여유가 없다.
- 실시간 피드·반응 카운트·투표가 필수. 참가자 전원(최대 30명)이 폰으로 동시 접속.
- LLM 호출이 필요하며, API 키를 브라우저에 노출할 수 없다.
- 공개 레포, 템플릿으로 배포. 참가자 기술 수준 편차 있음.
- 해커톤 이후 "오답 위키"로 확장 가능성을 남겨야 한다.

#### Options Considered

**Option A: 단일 HTML + Supabase(직접 호출) + Vercel Functions(LLM만)**

| Dimension | Assessment |
|---|---|
| Complexity | Low — 프론트 1파일, 서버리스 함수 2개 |
| Cost | 무료 티어 내 |
| Scalability | 30명 규모 충분. Realtime 채널 1~2개 |
| Team familiarity | 높음 — 바닐라 JS + SQL |

**Pros:** 빌드 없음, 템플릿화 쉬움, 참가자가 게임 로직만 교체, Realtime·RLS 내장
**Cons:** 파일이 커지면 관리 어려움, anon key 공개(RLS로 방어)

**Option B: Next.js + Supabase + Vercel**

| Dimension | Assessment |
|---|---|
| Complexity | Medium — 라우팅, 빌드, 환경변수 |
| Cost | 무료 티어 내 |
| Scalability | 높음, 이후 확장에 유리 |
| Team familiarity | 중간 — React 경험 필요 |

**Pros:** 위키·방 분리 등 장기 확장에 적합, 서버 컴포넌트로 키 관리 자연스러움
**Cons:** 100분 안에 세팅·빌드 오류로 시간 소모 위험, 비React 참가자 배제

**Option C: 단일 HTML + Firebase Realtime DB + Cloud Functions**

| Dimension | Assessment |
|---|---|
| Complexity | Low~Medium |
| Cost | 무료 티어 내 (Functions는 Blaze 요금제 필요) |
| Scalability | 실시간 특화, 충분 |
| Team familiarity | 중간 |

**Pros:** 실시간 구독이 가장 간단, 오프라인 캐시
**Cons:** 집계·정렬 쿼리가 약함(블러프 득표 집계), Functions에 결제 등록 필요, 공개 레포에 설정값 노출

#### Decision

**Option A**를 채택한다. 해커톤 이후 위키로 키울 때 Option B로 이전한다.

#### Trade-off Analysis

- 속도 vs 확장성: 100분이라는 제약이 압도적. 확장은 데이터 스키마만 잘 잡아두면 프론트 교체로 해결된다.
- 실시간 편의(Firebase) vs 집계 편의(Postgres): 블러프 득표·반응 카운트·위키 필터 모두 집계 쿼리라 Postgres가 유리. Supabase Realtime으로 실시간도 충분.
- 보안: anon key 공개는 RLS로 방어. LLM 키만 서버리스에 격리.

#### Consequences

- 쉬워지는 것: 참가자 온보딩(템플릿 복사 → Vercel import → 게임 로직), 전 팀 리더보드 공유
- 어려워지는 것: 단일 파일 비대화, 복잡한 상태 관리
- 재검토 시점: 위키·방 기능 본격 개발 시 Next.js 이전, 사용자 100명 이상 시 Realtime 채널 설계 재검토

---

## 6. 시스템 설계

### 6.1 구성도

```
[참가자 폰] ──┐
[호스트 화면] ─┼─ index.html (Vercel 정적) ── Supabase JS SDK ──> Postgres + Realtime
[큰 화면]   ──┘         │
                        └── fetch ──> Vercel Functions
                                        ├─ /api/judge   ──> LLM (게이트 판정)
                                        └─ /api/explain ──> LLM (해설 생성)
                                              │
                                              └── service_role로 answers.verdict 갱신
```

### 6.2 화면(뷰) 3개 — 한 파일, URL 파라미터로 분기

| 뷰 | URL | 역할 |
|---|---|---|
| 참가자 | `/?room=X` | 닉네임 입력 → 오답 제출 → 피드 반응 → 블러프 투표 → 내 결과 |
| 호스트 | `/?room=X&host=1` | 문제 등록, 마감, 판정 뒤집기, 블러프 시작, 결과 공개, 해설 요청 |
| 큰 화면 | `/?room=X&board=1` | 실시간 피드(큰 글씨), 타이머, 블러프 선택지, 결과·시상 |

### 6.3 DB 스키마 (Supabase / Postgres)

```sql
create table rooms (
  id text primary key,                 -- 짧은 코드, 예: 'abc1'
  name text,
  created_at timestamptz default now()
);

create table questions (
  id bigserial primary key,
  room_id text references rooms(id),
  prompt text not null,
  answer text not null,
  accepted_variants text[] default '{}', -- 허용 동치 표현
  phase text not null default 'draft',   -- draft|open|closed|bluff|revealed|archived
  explanation text,                      -- LLM/호스트 해설
  created_at timestamptz default now()
);

create table answers (
  id bigserial primary key,
  question_id bigint references questions(id),
  device_id text not null,
  nickname text not null,
  body text not null,
  verdict text default 'pending',        -- pending|wrong|correct|flagged
  closeness smallint,                    -- 0~3
  misconception text,
  host_override boolean default false,
  created_at timestamptz default now()
);

create table reactions (
  answer_id bigint references answers(id),
  device_id text not null,
  emoji text not null check (emoji in ('😂','🤔','💀','📚')),
  created_at timestamptz default now(),
  primary key (answer_id, device_id, emoji)
);

create table votes (                     -- 블러프 라운드
  question_id bigint references questions(id),
  device_id text not null,
  picked_answer_id bigint,               -- null이면 진짜 정답을 고른 것
  created_at timestamptz default now(),
  primary key (question_id, device_id)
);

-- 집계 뷰
create view answer_scores as
select a.id, a.question_id, a.nickname, a.body, a.verdict,
       count(distinct r.device_id) filter (where r.emoji='😂') as laughs,
       count(distinct r.device_id)                            as reactions,
       count(distinct v.device_id)                            as fooled
from answers a
left join reactions r on r.answer_id = a.id
left join votes v     on v.picked_answer_id = a.id
group by a.id;
```

RLS 요지:
- `answers`, `reactions`, `votes`: anon insert·select 허용, update·delete 금지
- `questions`: anon select 허용. 호스트 쓰기는 100분 MVP에서는 anon 허용(room 코드가 사실상 비밀), 이후 host token으로 제한
- `answers.verdict/closeness/misconception`: service_role(서버리스)만 update

### 6.4 실시간 이벤트 흐름

| 이벤트 | 발생 | 구독자 반응 |
|---|---|---|
| `answers` INSERT | 참가자 제출 | 피드에 카드 추가("검증 중"), 서버리스 `/api/judge` 트리거(클라이언트가 호출) |
| `answers` UPDATE (verdict) | judge 완료 | 카드 뱃지 갱신 (✅/🎯/⚠️) |
| `reactions` INSERT | 반응 | 카드 카운트 +1 |
| `questions` UPDATE (phase) | 호스트 조작 | 전원 화면 전환: open→closed→bluff→revealed |
| `votes` INSERT | 블러프 투표 | 큰 화면 투표 수 집계(선택지 내용은 공개 전까지 숨김) |

phase 전환은 `questions.phase` 한 컬럼으로 통일해 모든 뷰가 같은 상태를 바라보게 한다.

### 6.5 LLM 프롬프트

**/api/judge** (모델: 소형·고속)

```
당신은 퀴즈 판정관입니다. 참가자는 "오답"을 제출해야 합니다.
문제: {prompt}
정답: {answer}
허용 동치 표현: {accepted_variants}
제출: {body}

JSON만 출력:
{
  "is_correct": true|false,      // 제출이 정답 또는 동치면 true
  "closeness": 0|1|2|3,          // 0=무관/드립, 1=관련 개념, 2=흔한 오개념, 3=거의 정답
  "misconception": "한 줄 (20자 이내, 없으면 빈 문자열)",
  "flag": true|false             // 욕설·인신공격
}
```

**/api/explain**

```
문제: {prompt}
정답: {answer}
상위 오답:
1. {body1} (속인 수 {fooled1}, 😂 {laughs1})
2. ...
3. ...

출력(한국어, 마크다운 없음):
- 정답 핵심 개념 2줄
- 각 오답마다: "왜 틀렸는지 + 어디서 헷갈렸는지" 2줄
- 마지막 한 줄: 이 개념을 기억하는 한 문장 팁
```

### 6.6 100분 MVP 범위

**포함**
- 문제 1개 하드코딩(또는 호스트 입력 1개)
- 오답 제출 → 실시간 피드 → 이모지 4종
- `/api/judge` 비동기 판정 + 🎯 배지
- 호스트 마감 → 블러프 투표 → 결과(두 트랙 1위)
- `/api/explain` 해설 표시

**제외 (로드맵)**
- 방 생성 UI, 위키 아카이브 화면, 명예의 전당
- 출제 순환, 호스트 인증
- 블러프 라운드가 시간상 위험하면 MVP에서 제외하고 발표에서 "다음 단계"로 언급

**제작 순서 (65분 기준)**
1. (10분) Supabase 테이블·RLS, Vercel 함수 뼈대
2. (15분) 참가자 뷰: 제출 + 피드 Realtime
3. (10분) 반응 + 호스트 마감
4. (15분) 블러프 투표 + 결과 화면
5. (10분) judge/explain 연결, 큰 화면 뷰
6. (5분) 폰 2대 실접속 테스트

---

## 7. Action Items

### 주최자 (해커톤 전)
1. [ ] GitHub 템플릿 레포 생성 (2.1), Copilot 프롬프트 투입 (2.2), PR 검수·머지
2. [ ] Supabase 프로젝트 + 스키마(6.3) + RLS 적용
3. [ ] Vercel import 및 배포 확인, `api/judge`·`api/explain` 뼈대 + LLM 키 환경변수
4. [ ] README에 Vercel 가입 사전 안내, GitHub Pages 플랜 B
5. [ ] 폰 2~3대로 Realtime 실접속 테스트

### 프로토타입 (해커톤 당일)
6. [ ] 6.6 제작 순서대로 MVP 구현
7. [ ] 발표: 라이브 데모 — 전원 제출 → 큰 화면 피드 → 블러프 → 해설까지 3분 안에

### 해커톤 후
8. [ ] Supabase anon key 재발급 또는 프로젝트 정리
9. [ ] 위키 아카이브·방 UI 설계 → Next.js 이전 검토 (ADR-002)
