-- 무한의 오답 협동조합 — Supabase 스키마 (기획서 6.3 기준)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 if not exists / drop policy if exists 사용.

-- ───────────────────────── 테이블 ─────────────────────────
create table if not exists rooms (
  id         text primary key,               -- 짧은 코드, 예: 'ABC1'
  name       text,
  created_at timestamptz default now()
);

create table if not exists questions (
  id                bigserial primary key,
  room_id           text references rooms(id) on delete cascade,
  prompt            text not null,
  answer            text not null,
  accepted_variants text[] default '{}',      -- 허용 동치 표현
  phase             text not null default 'open'
                    check (phase in ('draft','open','closed','bluff','revealed','archived')),
  explanation       text,                     -- LLM/호스트 해설
  -- [기획서 대비 추가] 블러프 선택지를 모든 기기가 같은 순서로 보도록 호스트가 한 번 섞어서 저장.
  -- 원소는 answers.id, 0 은 "진짜 정답" 자리.
  bluff_answer_ids  bigint[] default '{}',
  -- [기획서 대비 추가] 타이머 동기화용 마감 시각.
  ends_at           timestamptz,
  created_at        timestamptz default now()
);
create index if not exists questions_room_idx on questions(room_id, id desc);

create table if not exists answers (
  id            bigserial primary key,
  question_id   bigint references questions(id) on delete cascade,
  device_id     text not null,
  nickname      text not null check (char_length(nickname) <= 20),
  body          text not null check (char_length(body) between 1 and 80),
  verdict       text not null default 'pending'
                check (verdict in ('pending','wrong','correct','flagged')),
  closeness     smallint,                     -- 0~3
  misconception text,
  host_override boolean default false,
  created_at    timestamptz default now()
);
create index if not exists answers_question_idx on answers(question_id);

create table if not exists reactions (
  answer_id  bigint references answers(id) on delete cascade,
  device_id  text not null,
  emoji      text not null check (emoji in ('😂','🤔','💀','📚')),
  created_at timestamptz default now(),
  primary key (answer_id, device_id, emoji)
);

create table if not exists votes (            -- 블러프 라운드
  question_id      bigint references questions(id) on delete cascade,
  device_id        text not null,
  picked_answer_id bigint,                    -- null 이면 진짜 정답을 고른 것
  created_at       timestamptz default now(),
  primary key (question_id, device_id)
);

-- 집계 뷰 (위키·결과용). security_invoker 로 호출자 RLS 를 그대로 따른다.
create or replace view answer_scores with (security_invoker = true) as
select a.id, a.question_id, a.nickname, a.body, a.verdict, a.misconception,
       (select count(*) from reactions r where r.answer_id = a.id and r.emoji = '😂') as laughs,
       (select count(*) from reactions r where r.answer_id = a.id)                    as reactions,
       (select count(*) from votes v     where v.picked_answer_id = a.id)            as fooled
from answers a;

-- ───────────────────────── RLS ─────────────────────────
alter table rooms     enable row level security;
alter table questions enable row level security;
alter table answers   enable row level security;
alter table reactions enable row level security;
alter table votes     enable row level security;

-- rooms: 누구나 읽기/생성
drop policy if exists rooms_select on rooms;
drop policy if exists rooms_insert on rooms;
create policy rooms_select on rooms for select using (true);
create policy rooms_insert on rooms for insert with check (true);

-- questions: 100분 MVP 에서는 호스트 쓰기도 anon 허용 (room 코드가 사실상 비밀).
-- 이후 host token 으로 제한할 것.
drop policy if exists questions_select on questions;
drop policy if exists questions_insert on questions;
drop policy if exists questions_update on questions;
create policy questions_select on questions for select using (true);
create policy questions_insert on questions for insert with check (true);
create policy questions_update on questions for update using (true) with check (true);

-- answers: 제출(insert)은 접수 중(open)인 문제에만, 판정 컬럼은 pending 으로만 들어올 수 있음.
-- update/delete 정책 없음 → anon 불가. 판정·뒤집기는 서버리스(service_role)만.
drop policy if exists answers_select on answers;
drop policy if exists answers_insert on answers;
create policy answers_select on answers for select using (true);
create policy answers_insert on answers for insert with check (
  verdict = 'pending' and closeness is null and host_override = false
  and exists (select 1 from questions q where q.id = question_id and q.phase = 'open')
);

-- reactions: insert/select 만
drop policy if exists reactions_select on reactions;
drop policy if exists reactions_insert on reactions;
create policy reactions_select on reactions for select using (true);
create policy reactions_insert on reactions for insert with check (true);

-- votes: 블러프 단계일 때만 insert
drop policy if exists votes_select on votes;
drop policy if exists votes_insert on votes;
create policy votes_select on votes for select using (true);
create policy votes_insert on votes for insert with check (
  exists (select 1 from questions q where q.id = question_id and q.phase = 'bluff')
);

-- ───────────────────────── Realtime ─────────────────────────
-- 피드·반응·투표·phase 전환을 실시간 구독하기 위해 publication 에 추가.
do $$
declare t text;
begin
  foreach t in array array['questions','answers','reactions','votes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 데모용 기본 방
insert into rooms (id, name) values ('ABC1', '데모 방') on conflict do nothing;
