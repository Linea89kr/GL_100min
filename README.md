# GL_100min — 무한의 오답 협동조합

100분 해커톤용 실시간 오답 게임 프로토타입입니다. 참가자는 문제의 정답이 아닌, 가장 그럴듯한 오답을 제출합니다. 다른 참가자가 그 오답을 정답으로 고르면 제출자가 점수를 얻습니다.

> 문제를 보고 가장 그럴듯한 오답을 써라. 남들이 네 오답에 속으면 네 점수.

## 핵심 구조

이 프로젝트는 별도 프론트엔드 빌드 없이 `index.html` 하나를 정적 클라이언트로 사용합니다.

```text
브라우저
  └─ index.html
       ├─ Supabase anon key로 데이터 읽기/쓰기
       ├─ Supabase Realtime으로 방 상태 동기화
       └─ /api/judge, /api/explain, /api/override 호출

Vercel
  ├─ 정적 호스팅: index.html
  └─ Serverless Functions
       ├─ /api/config   공개 Supabase 설정 전달
       ├─ /api/judge    Gemini 판정 후 answers 갱신
       ├─ /api/explain  Gemini 해설 생성 후 questions 갱신
       └─ /api/override 호스트 판정 덮어쓰기

Supabase
  ├─ Postgres: rooms, questions, answers, reactions, votes
  ├─ answer_scores 집계 뷰
  ├─ RLS 정책
  └─ Realtime publication
```

브라우저에는 공개 가능한 `anon` key만 전달합니다. `service_role` key와 Gemini key는 Vercel 서버리스 함수에서만 사용하며, answers 판정처럼 권한이 필요한 갱신은 서버에서 수행합니다.

## 레포 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 참가자·호스트·큰 화면·위키를 URL 파라미터로 제공하는 단일 페이지 앱 |
| `api/_lib.js` | 환경변수 별칭, Supabase 관리자 클라이언트, Gemini REST 호출, 공용 유틸 |
| `api/config.js` | 브라우저에 Supabase URL과 anon key 전달 |
| `api/judge.js` | 제출 답변의 정답 여부·유사도·오개념·신고 여부 판정 |
| `api/explain.js` | 가장 많이 속인 오답을 바탕으로 LLM 해설 생성 |
| `api/override.js` | 호스트의 수동 판정 처리 |
| `supabase/schema.sql` | 테이블, 인덱스, 집계 뷰, RLS, Realtime 설정 |
| `docs/architecture.html` | 시스템 구성도, 데이터 모델, 상태 전이, 환경변수 설명 |
| `wrong-answer-coop-기획서.md` | 기획·ADR·스키마 원본 |
| `code_artifact.html` | 초기 로컬 UI 목업 |
| `template/` | 참가자 배포용 단일 HTML 해커톤 템플릿 |
| `.env.example` | Vercel 환경변수 예시 |

## 라운드 흐름

```text
OPEN → CLOSED → BLUFF → REVEALED → ARCHIVED
```

1. 호스트가 문제·정답·허용 동치 표현을 입력해 새 라운드를 시작합니다.
2. `OPEN` 상태에서 참가자는 최대 80자의 오답을 제출합니다. 기본 제한 시간은 60초입니다.
3. 제출 직후 답변은 `pending`으로 보이고, `/api/judge`가 Gemini로 비동기 판정합니다.
4. `CLOSED`에서 호스트가 답변을 검토하거나 판정을 수동으로 뒤집습니다.
5. `BLUFF` 전환 시 진짜 정답(`0`)과 그럴듯한 오답 최대 3개의 순서를 `bluff_answer_ids`에 저장합니다. 모든 기기가 동일한 선택지를 봅니다.
6. 참가자는 정답이라고 생각하는 선택지에 1표를 행사합니다. 자기 오답은 선택할 수 없습니다.
7. `REVEALED`에서 속인 횟수와 😂 반응을 기준으로 시상하고, 호스트가 `/api/explain`을 호출해 해설을 생성합니다.

`questions.phase` 변경은 Realtime으로 전파됩니다. Realtime이 끊겨도 클라이언트가 4초마다 상태를 다시 읽어 화면이 멈추지 않도록 보완합니다.

## 데이터 모델과 권한

- `rooms`: 방 코드와 방 이름
- `questions`: 문제, 정답, 허용 동치 표현, 현재 단계, 종료 시각, 블러프 선택지 순서, 해설
- `answers`: 참가자 답변과 `pending/wrong/correct/flagged` 판정
- `reactions`: 답변별 이모지 반응. `(answer_id, device_id, emoji)` 복합 키로 중복 방지
- `votes`: 블러프 투표. `(question_id, device_id)` 복합 키로 1인 1표
- `answer_scores`: 반응 수와 속인 횟수를 계산하는 보안 적용 뷰

RLS 기준:

- 방과 문제는 MVP에서 anon 읽기/생성/수정을 허용합니다.
- 답변은 `OPEN` 상태에서 `pending`으로만 생성할 수 있습니다.
- 답변 판정 컬럼 갱신은 anon에게 허용하지 않고 서버리스 함수의 `service_role`로 처리합니다.
- 반응은 읽기·생성, 투표는 `BLUFF` 상태에서 읽기·생성만 허용합니다.

## 배포 및 최초 설정

### 1. Supabase 스키마 생성

Supabase Dashboard의 **SQL Editor**에서 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 실행합니다. 테이블 5개, `answer_scores` 뷰, RLS 정책, Realtime publication, 데모 방 `ABC1`이 생성됩니다.

### 2. Vercel 환경변수 등록

Vercel 프로젝트의 **Settings → Environment Variables**에 다음 값을 등록하고 Redeploy합니다.

| 변수 | 용도 | 노출 |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 URL | `/api/config`를 통해 공개 |
| `SUPABASE_ANON_KEY` | 브라우저용 공개 키 | `/api/config`를 통해 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 갱신 권한 | 절대 공개 금지 |
| `GEMINI_API_KEY` | 판정·해설 생성 | 절대 공개 금지 |
| `GEMINI_MODEL_JUDGE` | 판정 모델, 선택 사항 | 서버 전용 |
| `GEMINI_MODEL_EXPLAIN` | 해설 모델, 선택 사항 | 서버 전용 |

`api/_lib.js`는 Vercel/Supabase 연동에서 사용하는 대체 이름도 인식합니다. 자세한 목록은 [`docs/architecture.html`](./docs/architecture.html)의 환경변수 표를 참고하세요.

Gemini key가 없으면 제출은 동작하지만 LLM 판정은 기본 `wrong`으로 처리되고, 해설은 생성되지 않습니다. 호스트가 수동 판정하거나 직접 해설을 입력할 수 있습니다.

### 3. 실행

```bash
npm install
```

이 프로젝트는 별도 빌드 스크립트가 없는 정적 HTML + Vercel Functions 구조입니다. Vercel에 저장소를 연결해 배포하는 것이 기본 실행 방법입니다. 배포 후 기본 방은 다음 주소로 열 수 있습니다.

```text
참가자: https://<배포주소>/?room=ABC1
호스트: https://<배포주소>/?room=ABC1&host=1
큰 화면: https://<배포주소>/?room=ABC1&board=1
```

호스트 화면을 처음 열고 현재 라운드가 없으면 기본 프리셋 1번으로 라운드가 자동 생성됩니다.

## API

모든 POST API는 JSON 요청을 받습니다.

| 엔드포인트 | 요청 | 동작 |
| --- | --- | --- |
| `GET /api/config` | 없음 | 브라우저용 Supabase URL·anon key와 설정 진단 정보 반환 |
| `POST /api/judge` | `{ "answer_id": 1, "force": false }` | 답변을 판정하고 `verdict`, `closeness`, `misconception` 갱신 |
| `POST /api/explain` | `{ "question_id": 1 }` | 상위 오답 3개로 해설 생성 후 저장 |
| `POST /api/override` | `{ "answer_id": 1, "verdict": "wrong" }` | 호스트 판정 저장. 허용값: `pending`, `wrong`, `correct`, `flagged` |

`/api/judge`는 먼저 정답·동치 표현과 문자열이 같은지 검사한 뒤, 다르면 Gemini를 호출합니다. LLM 장애 시 답변을 임의의 성공 상태로 바꾸지 않고 `502`를 반환해 호스트가 수동 판정할 수 있게 합니다.

## 보안 및 MVP 한계

- 호스트 인증이 없습니다. URL에 `&host=1`을 붙인 사용자는 호스트 화면을 열 수 있습니다.
- `questions.answer`를 anon이 읽을 수 있어 브라우저 개발자 도구에서 정답을 확인할 수 있습니다.
- 방 코드는 사실상 접근 비밀번호처럼 사용됩니다.
- LLM 장애나 안전 필터 차단 시 답변이 `pending` 또는 검토 상태로 남을 수 있습니다.
- 정답 컬럼 분리와 공개 시점 RPC, 호스트 토큰 인증은 다음 단계입니다.

전체 구성도와 상태·권한 상세는 [`docs/architecture.html`](./docs/architecture.html)에서 확인할 수 있습니다.
