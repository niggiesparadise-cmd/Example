-- Flashcards and quizzes.
--
-- Applies after 0004. Nothing here alters an existing table, policy or grant:
-- the earlier migrations are left exactly as they are and this file only adds.
--
-- Same rules as the original schema. Every user-owned table carries `user_id`
-- and is protected by Row Level Security keyed on `auth.uid()`. The two tables
-- that do not carry one — quiz_questions and quiz_options — are owned through
-- their parent quiz, and their policies say so explicitly rather than relying
-- on the client to join correctly.

-- ---------------------------------------------------------------- enums

create type flashcard_rating as enum ('again', 'hard', 'good', 'easy');
create type quiz_question_kind as enum ('multiple-choice', 'true-false');

-- ---------------------------------------------------------------- flashcards

create table flashcards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  uuid references courses (id) on delete set null,
  topic_id   uuid references topics (id) on delete set null,
  front      text not null check (length(trim(front)) > 0),
  back       text not null check (length(trim(back)) > 0),

  -- Lightweight spaced repetition, maintained by the trigger below rather than
  -- by the client, so "due" means the same thing however a review was recorded.
  due_at          timestamptz not null default now(),
  interval_days   numeric(6,2) not null default 0 check (interval_days >= 0),
  ease            numeric(4,2) not null default 2.5 check (ease between 1.3 and 3.5),
  review_count    integer not null default 0 check (review_count >= 0),
  last_rating     flashcard_rating,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table flashcard_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references flashcards (id) on delete cascade,
  rating       flashcard_rating not null,
  -- How long the card was on screen. Null when it was not measured.
  duration_ms  integer check (duration_ms >= 0),
  reviewed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- quizzes

create table quizzes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  course_id   uuid references courses (id) on delete set null,
  topic_id    uuid references topics (id) on delete set null,
  title       text not null check (length(trim(title)) > 0),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes (id) on delete cascade,
  question    text not null check (length(trim(question)) > 0),
  kind        quiz_question_kind not null default 'multiple-choice',
  explanation text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table quiz_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions (id) on delete cascade,
  option_text text not null check (length(trim(option_text)) > 0),
  is_correct  boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  quiz_id          uuid not null references quizzes (id) on delete cascade,
  score            integer not null check (score >= 0),
  total_questions  integer not null check (total_questions > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  -- The questions that were answered wrongly, so "review mistakes" needs no
  -- second table and no second round trip.
  incorrect_question_ids uuid[] not null default '{}',
  completed_at     timestamptz not null default now(),
  constraint score_within_total check (score <= total_questions)
);

-- ---------------------------------------------------------------- indexes

create index flashcards_user_due_idx      on flashcards (user_id, due_at);
create index flashcards_course_idx        on flashcards (user_id, course_id);
create index flashcard_reviews_card_idx   on flashcard_reviews (user_id, flashcard_id, reviewed_at desc);
create index flashcard_reviews_when_idx   on flashcard_reviews (user_id, reviewed_at desc);
create index quizzes_user_idx             on quizzes (user_id, created_at desc);
create index quiz_questions_quiz_idx      on quiz_questions (quiz_id, position);
create index quiz_options_question_idx    on quiz_options (question_id, position);
create index quiz_attempts_user_idx       on quiz_attempts (user_id, completed_at desc);
create index quiz_attempts_quiz_idx       on quiz_attempts (quiz_id, completed_at desc);

-- ---------------------------------------------------------------- triggers

-- `updated_at` on the new tables, using the function 0003 already defined.
do $$
declare t text;
begin
  foreach t in array array['flashcards','quizzes','quiz_questions']
  loop
    execute format(
      'create trigger %1$s_set_updated_at before update on %1$I
         for each row execute function set_updated_at()', t);
  end loop;
end $$;

/*
 * Scheduling lives here, not in the client.
 *
 * A pared-back SM-2: `again` sends the card back into the same session, the
 * other three multiply the interval by the card's ease, and the ease itself
 * drifts with how hard the card is proving. Doing it in a trigger means the
 * schedule cannot disagree with the reviews that produced it, and a second
 * device cannot overwrite it with a stale calculation.
 */
create or replace function apply_flashcard_review() returns trigger
language plpgsql as $$
declare
  card        flashcards%rowtype;
  next_ease   numeric(4,2);
  next_days   numeric(6,2);
begin
  select * into card from flashcards where id = new.flashcard_id;
  if not found then
    return new;
  end if;

  next_ease := case new.rating
    when 'again' then greatest(1.3, card.ease - 0.20)
    when 'hard'  then greatest(1.3, card.ease - 0.05)
    when 'easy'  then least(3.5, card.ease + 0.10)
    else card.ease
  end;

  next_days := case new.rating
    -- Ten minutes, expressed in days, so the card returns within the session.
    when 'again' then 0.007
    when 'hard'  then greatest(0.5, card.interval_days * 1.2)
    when 'good'  then case when card.interval_days < 1 then 1 else card.interval_days * next_ease end
    when 'easy'  then case when card.interval_days < 1 then 3 else card.interval_days * next_ease * 1.3 end
  end;

  -- A year is far enough out; beyond that the number stops meaning anything.
  next_days := least(next_days, 365);

  update flashcards
     set ease          = next_ease,
         interval_days = next_days,
         due_at        = now() + make_interval(secs => (next_days * 86400)::double precision),
         review_count  = card.review_count + 1,
         last_rating   = new.rating,
         updated_at    = now()
   where id = card.id;

  return new;
end $$;

create trigger flashcard_reviews_apply
  after insert on flashcard_reviews
  for each row execute function apply_flashcard_review();

-- ---------------------------------------------------------------- RLS

alter table flashcards        enable row level security;
alter table flashcard_reviews enable row level security;
alter table quizzes           enable row level security;
alter table quiz_questions    enable row level security;
alter table quiz_options      enable row level security;
alter table quiz_attempts     enable row level security;

alter table flashcards        force row level security;
alter table flashcard_reviews force row level security;
alter table quizzes           force row level security;
alter table quiz_questions    force row level security;
alter table quiz_options      force row level security;
alter table quiz_attempts     force row level security;

-- The four tables that carry `user_id` follow the same shape as the originals.
do $$
declare t text;
begin
  foreach t in array array['flashcards','flashcard_reviews','quizzes','quiz_attempts']
  loop
    execute format($f$
      create policy "owner can read %1$s"
        on %1$I for select using ((select auth.uid()) = user_id);
      create policy "owner can insert %1$s"
        on %1$I for insert with check ((select auth.uid()) = user_id);
      create policy "owner can update %1$s"
        on %1$I for update using ((select auth.uid()) = user_id)
                            with check ((select auth.uid()) = user_id);
      create policy "owner can delete %1$s"
        on %1$I for delete using ((select auth.uid()) = user_id);
    $f$, t);
  end loop;
end $$;

/*
 * Questions and options have no `user_id`: they belong to a quiz, and the quiz
 * belongs to a user. Every policy therefore reaches through the parent. The
 * read policies are widened by 0006 so that somebody invited to a challenge can
 * see the questions they have been asked to answer — writes never are.
 */
create policy "read questions of a readable quiz"
  on quiz_questions for select
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid())));
create policy "insert questions into your own quiz"
  on quiz_questions for insert
  with check (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid())));
create policy "update questions of your own quiz"
  on quiz_questions for update
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid())))
  with check (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid())));
create policy "delete questions of your own quiz"
  on quiz_questions for delete
  using (exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid())));

create policy "read options of a readable question"
  on quiz_options for select
  using (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and q.user_id = (select auth.uid())));
create policy "insert options into your own question"
  on quiz_options for insert
  with check (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and q.user_id = (select auth.uid())));
create policy "update options of your own question"
  on quiz_options for update
  using (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and q.user_id = (select auth.uid())))
  with check (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and q.user_id = (select auth.uid())));
create policy "delete options of your own question"
  on quiz_options for delete
  using (exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
     where qq.id = question_id and q.user_id = (select auth.uid())));

-- ---------------------------------------------------------------- grants

grant select, insert, update, delete on
  flashcards, flashcard_reviews, quizzes, quiz_questions, quiz_options, quiz_attempts
  to authenticated;

revoke all on
  flashcards, flashcard_reviews, quizzes, quiz_questions, quiz_options, quiz_attempts
  from anon;
