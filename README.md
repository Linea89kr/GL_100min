# GL_100min — 무한의 오답 협동조합

100분 해커톤(growthlog, 2026-11-07)용 프로토타입. 기획·아키텍처는 [`wrong-answer-coop-기획서.md`](./wrong-answer-coop-기획서.md).

> 문제를 보고 가장 그럴듯한 오답을 써라. 남들이 네 오답에 속으면 네 점수.

## 구조 (기획서 ADR-001 Option A)

```
index.html          단일 페이지. 참가자/호스트/큰 화면/위키 4개 뷰 (Supabase JS 직접 호출 + Realtime)
api/config.js       GET  브라우저에 Supabase URL·anon key 전달 (환경변수에서)
api/judge.js        POST {answer_id}            오답이 실수로 정답인지 LLM 판정 → answers 갱신
api/explain.js      POST {question_id}          상위 오답 3개 해설 생성 → questions.explanation
api/override.js     POST {answer_id, verdict}   호스트 판정 뒤집기
supabase/schema.sql 테이블 5개 + answer_scores 뷰 + RLS + Realtime publication
code_artifact.html  초기 UI 목업 (로컬 상태 버전, 참고용)
template/           참가자 배포용 해커톤 템플릿 (Copilot 생성, 60초 클릭 게임)
```

## 세팅 (최초 1회)

1. **Supabase** → SQL Editor 에 `supabase/schema.sql` 전체 붙여넣고 Run.
2. **Vercel** → Project → Settings → Environment Variables 에 `.env.example` 의 4개 값 입력 → Redeploy.
3. 접속
   - 참가자: `https://gl100min.vercel.app/?room=ABC1`
   - 호스트: `https://gl100min.vercel.app/?room=ABC1&host=1`
   - 큰 화면: `https://gl100min.vercel.app/?room=ABC1&board=1`

호스트 화면을 처음 열면 프리셋 1번 문제로 라운드가 자동 생성된다.

## 라운드 진행 (호스트)

1. 문제 입력(또는 프리셋) → **이 문제로 새 라운드 시작** — OPEN, 60초 타이머
2. 시간이 끝나면 자동으로 **접수 마감**(CLOSED). 필요하면 판정 뒤집기
3. **블러프 투표 시작** — 정답 + 그럴듯한 오답(closeness 순) 3개를 섞어 전원에게 같은 순서로 노출
4. **결과 공개 & 해설** — 두 트랙 시상(최다 속임 / 최다 😂) + LLM 해설 자동 생성

## 기획서 대비 바뀐 점

- `questions.bluff_answer_ids bigint[]` 추가: 블러프 선택지 순서를 DB에 한 번 저장 (원소 `0` = 진짜 정답). 기기마다 다르게 섞이는 문제 방지.
- `questions.ends_at` 추가: 타이머를 모든 화면에서 동기화.
- `/api/override` 추가: answers 는 anon update 금지라 판정 뒤집기를 서버리스로 처리.
- 참가자는 라운드당 여러 개 제출 가능, 블러프에서 자기 오답은 고를 수 없음.

## 알려진 MVP 한계

- 호스트 인증 없음: `&host=1` 만 붙이면 호스트. room 코드가 사실상 비밀.
- `questions.answer` 를 anon 이 읽을 수 있음(개발자도구로 정답 확인 가능). 이후 정답 컬럼 분리 + 공개 시점 RPC로 개선.
