-- Sublectures under topics, and an in-app notification centre.
--
-- Applies after 0006. Nothing in 0001-0006 is altered: this file only creates,
-- and the one existing table it touches (`profiles`) is not touched at all.
--
-- Two unrelated features share a migration because they are one deployment.
-- Both follow the rules the earlier files established — `user_id` on every
-- user-owned row, RLS keyed on `auth.uid()`, explicit grants, nothing left to
-- the client to enforce.

-- ---------------------------------------------------------------- sublectures

/*
 * The third level of the course hierarchy: course -> topic -> sublecture.
 *
 * `user_id` is carried directly rather than reached through the topic. It is
 * denormalised, but it is what lets the RLS policy be a single column
 * comparison instead of a join on every row read — and the insert policy checks
 * the topic really is yours, so the two can never disagree.
 *
 * There is no `progress` column. A topic's percentage is `count(completed) /
 * count(*)` over these rows, computed where it is displayed; storing it would
 * be a second source of truth that only ever drifts.
 */
create table sublectures (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  topic_id       uuid not null references topics (id) on delete cascade,
  title          text not null check (length(trim(title)) > 0),
  description    text,
  scheduled_date date,
  -- Completion is a timestamp, not a boolean: "when" is strictly more
  -- information than "whether", and the UI only ever asks the second question.
  completed_at   timestamptz,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index sublectures_topic_idx on sublectures (user_id, topic_id, position);
create index sublectures_date_idx  on sublectures (user_id, scheduled_date);

create trigger sublectures_set_updated_at before update on sublectures
  for each row execute function set_updated_at();

alter table sublectures enable row level security;
alter table sublectures force row level security;

create policy "owner can read sublectures"
  on sublectures for select using ((select auth.uid()) = user_id);

/*
 * Insert checks two things: the row is yours, and the topic it points at is
 * yours too. Without the second clause a user could file a sublecture under
 * somebody else's topic — invisible to them, but it would appear in that
 * topic's progress the moment the schema was ever read differently.
 */
create policy "owner can insert sublectures"
  on sublectures for insert
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from topics t where t.id = topic_id and t.user_id = (select auth.uid()))
  );

create policy "owner can update sublectures"
  on sublectures for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from topics t where t.id = topic_id and t.user_id = (select auth.uid()))
  );

create policy "owner can delete sublectures"
  on sublectures for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- notifications

create type notification_kind as enum (
  'task-due',
  'exam-soon',
  'study-reminder',
  'flashcards-due',
  'challenge-invitation',
  'challenge-result'
);

/*
 * The notification centre.
 *
 * Two kinds of row end up here and they arrive by different routes:
 *
 *   - Things that happen *to* you while you are not looking — a challenge
 *     invitation, a challenge result. Somebody else's action creates these, so
 *     they are written by the triggers below, which are `security definer`
 *     because the insert policy quite rightly refuses to let one user write a
 *     row owned by another.
 *
 *   - Things that become true with the passage of time — a task due today, an
 *     exam on Friday, cards ready to review. Nothing happens at the moment
 *     they become true, so the app materialises them when it next loads.
 *
 * `dedupe_key` is what keeps the second kind from multiplying: opening the app
 * five times on the day a task is due must produce one notification, not five.
 * It is unique per user, and every insert is `on conflict do nothing`.
 */
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       notification_kind not null,
  title      text not null check (length(trim(title)) > 0),
  body       text,
  /* Where tapping it should go, plus whatever the row needs to describe itself.
     Never anything private about another user. */
  data       jsonb not null default '{}'::jsonb,
  /* Stable identity for a fact that can be re-derived. Null for one-off events
     that genuinely happened once. */
  dedupe_key text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create unique index notifications_dedupe_key
  on notifications (user_id, dedupe_key) where dedupe_key is not null;

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;
alter table notifications force row level security;

create policy "owner can read notifications"
  on notifications for select using ((select auth.uid()) = user_id);

-- Only ever for yourself. The triggers below sidestep this deliberately and
-- explicitly; nothing else can.
create policy "owner can insert notifications"
  on notifications for insert with check ((select auth.uid()) = user_id);

create policy "owner can update notifications"
  on notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "owner can delete notifications"
  on notifications for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- event triggers

/*
 * A challenge invitation notifies the person invited.
 *
 * `security definer` for exactly one reason: the row belongs to the opponent,
 * and the insert policy above will not let the creator write it. Everything the
 * function inserts is derived from the challenge row that was just written, so
 * there is nothing a caller can steer.
 */
create or replace function notify_challenge_invitation() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
begin
  select coalesce(nullif(trim(p.full_name), ''), p.username, 'A classmate')
    into from_name
    from profiles p
   where p.id = new.creator_id;

  insert into notifications (user_id, kind, title, body, data, dedupe_key)
  values (
    new.opponent_id,
    'challenge-invitation',
    'Challenge invitation',
    from_name || ' invited you to ' || new.title,
    jsonb_build_object('href', '/challenges/', 'challenge_id', new.id),
    'challenge-invite:' || new.id
  )
  on conflict do nothing;

  return new;
end $$;

create trigger challenges_notify_invitation
  after insert on challenges
  for each row execute function notify_challenge_invitation();

/*
 * When a challenge completes, both people are told once.
 *
 * Fires only on the transition into `completed`, so an unrelated update to the
 * row cannot produce a second announcement.
 */
create or replace function notify_challenge_result() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and coalesce(old.status, 'pending') <> 'completed' then
    insert into notifications (user_id, kind, title, body, data, dedupe_key)
    select
      p.user_id,
      'challenge-result',
      'Challenge finished',
      new.title || ' is done — see how it went.',
      jsonb_build_object('href', '/challenges/', 'challenge_id', new.id),
      'challenge-result:' || new.id || ':' || p.user_id
    from challenge_participants p
    where p.challenge_id = new.id
    on conflict do nothing;
  end if;

  return new;
end $$;

create trigger challenges_notify_result
  after update on challenges
  for each row execute function notify_challenge_result();

-- ---------------------------------------------------------------- grants

grant select, insert, update, delete on sublectures, notifications to authenticated;
revoke all on sublectures, notifications from anon;
