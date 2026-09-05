-- Study Dashboard — initial schema
--
-- Every user-owned table carries `user_id` and is protected by Row Level
-- Security keyed on `auth.uid()`. RLS is the only thing standing between one
-- user's data and another's: the client bundle is public (static export shipped
-- inside an APK), so no security may depend on client code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type task_status   as enum ('todo', 'in-progress', 'done');
create type task_priority as enum ('low', 'medium', 'high');
create type task_kind     as enum ('assignment', 'reading', 'problem-set', 'project', 'lab-report', 'revision');
create type exam_kind     as enum ('midterm', 'final', 'quiz', 'practical', 'oral');
create type session_kind  as enum ('lecture', 'lab', 'seminar', 'tutorial', 'study', 'exam');

-- ---------------------------------------------------------------- profiles

create table profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  program            text,
  academic_year      text,
  term               text,
  -- Drives the goal line on the study-activity chart.
  daily_goal_minutes integer not null default 180 check (daily_goal_minutes between 0 and 1440),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- courses

create table courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  code        text not null check (length(trim(code)) > 0),
  title       text not null check (length(trim(title)) > 0),
  instructor  text,
  credits     integer check (credits between 0 and 60),
  location    text,
  -- Index into the validated 5-slot categorical chart palette.
  color_slot  smallint not null default 1 check (color_slot between 1 and 5),
  grade       numeric(5,2) check (grade between 0 and 100),
  attendance  integer check (attendance between 0 and 100),
  summary     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, code)
);

-- ---------------------------------------------------------------- topics
-- Course progress is DERIVED from these, never stored as a free-floating number.

create table topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_id   uuid not null references courses (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  position    integer not null default 0,
  is_complete boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- lectures

create table lectures (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  course_id    uuid not null references courses (id) on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  lecture_date date,
  position     integer not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- tasks

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  -- Nullable: a task need not belong to a course, and deleting a course should
  -- orphan its tasks rather than destroy them.
  course_id        uuid references courses (id) on delete set null,
  title            text not null check (length(trim(title)) > 0),
  kind             task_kind not null default 'assignment',
  status           task_status not null default 'todo',
  priority         task_priority not null default 'medium',
  due_date         date,
  estimate_minutes integer check (estimate_minutes between 0 and 10080),
  checklist_done   integer not null default 0 check (checklist_done >= 0),
  checklist_total  integer not null default 0 check (checklist_total >= 0),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint checklist_done_within_total check (checklist_done <= checklist_total),
  -- Keeps `status` and `completed_at` from disagreeing.
  constraint completed_at_matches_status check (
    (status = 'done' and completed_at is not null) or
    (status <> 'done' and completed_at is null)
  )
);

-- ---------------------------------------------------------------- exams

create table exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_id   uuid references courses (id) on delete set null,
  title       text not null check (length(trim(title)) > 0),
  kind        exam_kind not null default 'midterm',
  exam_date   date not null,
  start_time  time,
  end_time    time,
  location    text,
  weight      numeric(5,2) check (weight between 0 and 100),
  preparation integer not null default 0 check (preparation between 0 and 100),
  topics      text[] not null default '{}',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint exam_ends_after_it_starts check (end_time is null or start_time is null or end_time > start_time)
);

-- ---------------------------------------------------------------- notes

create table notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  uuid references courses (id) on delete set null,
  topic_id   uuid references topics (id) on delete set null,
  title      text not null check (length(trim(title)) > 0),
  content    text not null default '',
  tags       text[] not null default '{}',
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full-text search over title + body, maintained by Postgres rather than the client.
alter table notes add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored;

-- ---------------------------------------------------------------- schedule

create table schedule_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  uuid references courses (id) on delete set null,
  title      text not null check (length(trim(title)) > 0),
  kind       session_kind not null default 'lecture',
  event_date date not null,
  start_time time not null,
  end_time   time not null,
  location   text,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ends_after_it_starts check (end_time > start_time)
);

-- ---------------------------------------------------------------- study sessions

create table study_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  uuid references courses (id) on delete set null,
  started_at timestamptz not null default now(),
  -- NULL means the timer is still running; at most one such row per user.
  ended_at   timestamptz,
  focus      integer check (focus between 0 and 100),
  note       text,
  created_at timestamptz not null default now(),
  constraint session_ends_after_it_starts check (ended_at is null or ended_at > started_at)
);

-- Duration is derived, so a stopped session can never disagree with its clock.
alter table study_sessions add column duration_minutes integer
  generated always as (
    case when ended_at is null then null
         else greatest(0, (extract(epoch from (ended_at - started_at)) / 60)::integer)
    end
  ) stored;

-- A user may only ever have one timer running.
create unique index one_running_session_per_user
  on study_sessions (user_id) where ended_at is null;

-- ---------------------------------------------------------------- indexes

create index courses_user_idx          on courses (user_id);
create index topics_course_idx         on topics (user_id, course_id, position);
create index lectures_course_idx       on lectures (user_id, course_id, position);
create index tasks_user_due_idx        on tasks (user_id, due_date);
create index tasks_user_status_idx     on tasks (user_id, status);
create index exams_user_date_idx       on exams (user_id, exam_date);
create index notes_user_updated_idx    on notes (user_id, updated_at desc);
create index notes_search_idx          on notes using gin (search_vector);
create index schedule_user_date_idx    on schedule_events (user_id, event_date, start_time);
create index sessions_user_start_idx   on study_sessions (user_id, started_at desc);
