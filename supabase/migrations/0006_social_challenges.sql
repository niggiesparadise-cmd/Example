-- Usernames, avatars and head-to-head challenges.
--
-- Applies after 0005. Existing migrations are untouched; `profiles` gains two
-- nullable columns, which is additive and safe on a populated table.
--
-- This is the file where authorisation stops being "your own rows" and starts
-- being "rows two people share", so every rule that decides who may see or
-- change what is written here, in the database. Nothing below trusts the client
-- to scope a query correctly.

-- ---------------------------------------------------------------- enums

create type challenge_status as enum ('pending', 'accepted', 'declined', 'active', 'completed', 'expired');

-- ---------------------------------------------------------------- profiles

/*
 * A username is the only handle another person can look you up by. Email and
 * the Supabase user id are never searchable and never returned by the lookup
 * below.
 */
alter table profiles add column username text
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

-- Case-insensitive uniqueness, so `Ada` and `ada` cannot both exist.
create unique index profiles_username_key on profiles (lower(username));

/*
 * Where the avatar lives in Storage — a path, never the image itself. Binaries
 * do not belong in a row, and a path keeps the bucket's own policies in charge
 * of who may fetch it.
 */
alter table profiles add column avatar_path text;

-- ---------------------------------------------------------------- challenges

create table challenges (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  quiz_id     uuid not null references quizzes (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  status      challenge_status not null default 'pending',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  completed_at timestamptz,
  -- Challenging yourself is not a competition.
  constraint challenge_needs_two_people check (creator_id <> opponent_id)
);

create table challenge_participants (
  id               uuid primary key default gen_random_uuid(),
  challenge_id     uuid not null references challenges (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  score            integer check (score >= 0),
  total_questions  integer check (total_questions > 0),
  duration_seconds integer check (duration_seconds >= 0),
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index challenges_creator_idx     on challenges (creator_id, created_at desc);
create index challenges_opponent_idx    on challenges (opponent_id, created_at desc);
create index challenges_quiz_idx        on challenges (quiz_id);
create index challenge_participants_idx on challenge_participants (user_id, challenge_id);

-- `set_updated_at` from 0003 writes this column, so it has to exist before the
-- trigger that calls it is allowed to fire.
alter table challenges add column updated_at timestamptz not null default now();

create trigger challenges_set_updated_at before update on challenges
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- membership

/*
 * The single question every policy below asks: is this user part of this
 * challenge? Kept as one `stable security definer` function so the answer
 * cannot drift between policies, and so a policy on challenge_participants can
 * ask it without recursing into challenge_participants' own policies.
 */
create or replace function is_challenge_member(challenge uuid, member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from challenges c
     where c.id = challenge
       and (c.creator_id = member or c.opponent_id = member)
  );
$$;

revoke all on function is_challenge_member(uuid, uuid) from public, anon;
grant execute on function is_challenge_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table challenges             enable row level security;
alter table challenge_participants enable row level security;
alter table challenges             force row level security;
alter table challenge_participants force row level security;

-- A challenge is visible to exactly the two people in it.
create policy "read challenges you are part of"
  on challenges for select
  using ((select auth.uid()) in (creator_id, opponent_id));

-- You may only create a challenge in your own name, and only around a quiz you
-- own — otherwise a quiz could be pulled into a challenge to make it readable.
create policy "create your own challenges"
  on challenges for insert
  with check (
    (select auth.uid()) = creator_id
    and exists (select 1 from quizzes q where q.id = quiz_id and q.user_id = (select auth.uid()))
  );

/*
 * Both people may update the challenge row, because both drive it forward: the
 * opponent accepts or declines, and whoever finishes last completes it. The
 * `with check` keeps either of them from reassigning the challenge to somebody
 * else while doing so.
 */
create policy "advance a challenge you are part of"
  on challenges for update
  using ((select auth.uid()) in (creator_id, opponent_id))
  with check ((select auth.uid()) in (creator_id, opponent_id));

-- Only the person who started it can call it off.
create policy "delete challenges you created"
  on challenges for delete
  using ((select auth.uid()) = creator_id);

-- Both people see both rows — that is the whole point of a scoreboard.
create policy "read participants of your challenges"
  on challenge_participants for select
  using (is_challenge_member(challenge_id, (select auth.uid())));

/*
 * The rule the rest of the feature rests on: a row may only ever be written for
 * yourself. `user_id = auth.uid()` on both insert and update means there is no
 * request shape that lets one person set another's score, duration or
 * completion — not a crafted PATCH, not a race, not a mistake in the client.
 */
create policy "join a challenge as yourself"
  on challenge_participants for insert
  with check (
    (select auth.uid()) = user_id
    and is_challenge_member(challenge_id, (select auth.uid()))
  );

create policy "record only your own result"
  on challenge_participants for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "withdraw only yourself"
  on challenge_participants for delete
  using ((select auth.uid()) = user_id);

/*
 * Reading a quiz somebody has challenged you to.
 *
 * These are additional SELECT policies. Postgres ORs permissive policies
 * together, so the owner-only rules from 0005 still stand and this only widens
 * reading to the specific quiz a challenge points at.
 */
create policy "read a quiz you have been challenged to"
  on quizzes for select
  using (exists (
    select 1 from challenges c
     where c.quiz_id = quizzes.id
       and (select auth.uid()) in (c.creator_id, c.opponent_id)
       and c.status in ('pending', 'accepted', 'active', 'completed')
  ));

create policy "read questions of a challenged quiz"
  on quiz_questions for select
  using (exists (
    select 1 from challenges c
     where c.quiz_id = quiz_questions.quiz_id
       and (select auth.uid()) in (c.creator_id, c.opponent_id)
       and c.status in ('pending', 'accepted', 'active', 'completed')
  ));

create policy "read options of a challenged question"
  on quiz_options for select
  using (exists (
    select 1 from quiz_questions qq
      join challenges c on c.quiz_id = qq.quiz_id
     where qq.id = quiz_options.question_id
       and (select auth.uid()) in (c.creator_id, c.opponent_id)
       and c.status in ('pending', 'accepted', 'active', 'completed')
  ));

-- ---------------------------------------------------------------- user lookup

/*
 * The controlled directory.
 *
 * `security definer` so it can see past the owner-only policy on profiles, and
 * deliberately narrow in what it gives back: a display name, a handle and an
 * avatar path. No email, no user id that was not already needed to address an
 * invitation, no programme or term. It refuses anonymous callers, requires a
 * real prefix rather than letting somebody page through the whole table, and
 * caps the result set.
 */
create or replace function search_profiles(query text)
returns table (id uuid, username text, full_name text, avatar_path text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.full_name, p.avatar_path
    from profiles p
   where (select auth.uid()) is not null
     and p.username is not null
     and p.id <> (select auth.uid())
     and length(trim(query)) >= 3
     and p.username like lower(trim(query)) || '%'
   order by p.username
   limit 10;
$$;

revoke all on function search_profiles(text) from public, anon;
grant execute on function search_profiles(text) to authenticated;

/*
 * The counterpart for people you are already sharing a challenge with: the same
 * narrow columns, for the users you are entitled to see, without opening
 * `profiles` itself.
 */
create or replace function challenge_profiles()
returns table (id uuid, username text, full_name text, avatar_path text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.username, p.full_name, p.avatar_path
    from profiles p
   where (select auth.uid()) is not null
     and (
       p.id = (select auth.uid())
       or exists (
         select 1 from challenges c
          where (select auth.uid()) in (c.creator_id, c.opponent_id)
            and p.id in (c.creator_id, c.opponent_id)
       )
     );
$$;

revoke all on function challenge_profiles() from public, anon;
grant execute on function challenge_profiles() to authenticated;

-- ---------------------------------------------------------------- challenge RPC

/*
 * Creating a challenge is one transaction, not four round trips.
 *
 * Doing it here means the challenge and both participant rows either all exist
 * or none do — a client that dies halfway cannot leave a challenge with one
 * participant. The function is `security definer` only so it can insert the
 * opponent's participant row (their `user_id`, which the insert policy would
 * otherwise refuse); every other check it performs is explicit.
 */
create or replace function create_challenge(quiz uuid, opponent_username text, challenge_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me         uuid := (select auth.uid());
  opponent   uuid;
  new_id     uuid;
begin
  if me is null then
    raise exception 'You must be signed in to start a challenge.' using errcode = '42501';
  end if;

  -- The quiz must be yours: you cannot challenge somebody with a quiz you were
  -- merely shown, and this is what keeps the widened read policies narrow.
  if not exists (select 1 from quizzes q where q.id = quiz and q.user_id = me) then
    raise exception 'That quiz does not exist, or it is not yours.' using errcode = '42501';
  end if;

  if not exists (select 1 from quiz_questions qq where qq.quiz_id = quiz) then
    raise exception 'Add at least one question before challenging somebody.' using errcode = '23514';
  end if;

  select p.id into opponent from profiles p where p.username = lower(trim(opponent_username));
  if opponent is null then
    raise exception 'No account with that username.' using errcode = 'P0002';
  end if;
  if opponent = me then
    raise exception 'You cannot challenge yourself.' using errcode = '23514';
  end if;

  insert into challenges (creator_id, opponent_id, quiz_id, title, status)
  values (me, opponent, quiz, challenge_title, 'pending')
  returning id into new_id;

  insert into challenge_participants (challenge_id, user_id) values (new_id, me), (new_id, opponent);

  return new_id;
end $$;

revoke all on function create_challenge(uuid, text, text) from public, anon;
grant execute on function create_challenge(uuid, text, text) to authenticated;

/*
 * Accepting or declining. Only the invited opponent may answer, and only while
 * the invitation is still pending — so an accept cannot be replayed to reopen a
 * finished challenge.
 */
create or replace function respond_to_challenge(challenge uuid, accept boolean)
returns challenge_status
language plpgsql
security definer
set search_path = public
as $$
declare
  me     uuid := (select auth.uid());
  result challenge_status;
begin
  if me is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  update challenges
     set status = case when accept then 'accepted'::challenge_status else 'declined'::challenge_status end,
         updated_at = now()
   where id = challenge
     and opponent_id = me
     and status = 'pending'
  returning status into result;

  if result is null then
    raise exception 'That invitation is not yours to answer, or it has already been answered.'
      using errcode = '42501';
  end if;

  return result;
end $$;

revoke all on function respond_to_challenge(uuid, boolean) from public, anon;
grant execute on function respond_to_challenge(uuid, boolean) to authenticated;

/*
 * Recording your own result.
 *
 * The `where user_id = me` is the load-bearing clause: whatever the caller
 * sends, the only row this can touch is their own. It also refuses to overwrite
 * a result already recorded, so a score cannot be improved by replaying the
 * call, and it flips the challenge to `completed` once both sides are in.
 */
create or replace function submit_challenge_result(
  challenge uuid,
  final_score integer,
  question_count integer,
  seconds_taken integer
)
returns challenge_status
language plpgsql
security definer
set search_path = public
as $$
declare
  me        uuid := (select auth.uid());
  touched   integer;
  finished  integer;
  result    challenge_status;
begin
  if me is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;
  if not is_challenge_member(challenge, me) then
    raise exception 'That challenge is not yours.' using errcode = '42501';
  end if;
  if final_score < 0 or question_count <= 0 or final_score > question_count then
    raise exception 'That score is not possible for this quiz.' using errcode = '23514';
  end if;

  update challenge_participants
     set score = final_score,
         total_questions = question_count,
         duration_seconds = greatest(0, seconds_taken),
         completed_at = now()
   where challenge_id = challenge
     and user_id = me
     and completed_at is null;

  get diagnostics touched = row_count;
  if touched = 0 then
    raise exception 'You have already finished this challenge.' using errcode = '23505';
  end if;

  -- Both in: the challenge is over. One in: it is under way.
  select count(*) into finished
    from challenge_participants
   where challenge_id = challenge and completed_at is not null;

  update challenges
     set status = case when finished >= 2 then 'completed'::challenge_status else 'active'::challenge_status end,
         completed_at = case when finished >= 2 then now() else null end,
         updated_at = now()
   where id = challenge
  returning status into result;

  return result;
end $$;

revoke all on function submit_challenge_result(uuid, integer, integer, integer) from public, anon;
grant execute on function submit_challenge_result(uuid, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------- grants

grant select, insert, update, delete on challenges, challenge_participants to authenticated;
revoke all on challenges, challenge_participants from anon;

-- ---------------------------------------------------------------- avatar storage

/*
 * Avatars live in Storage, not in a column.
 *
 * The bucket is private. Making it public would be one line less work and would
 * put every user's face on a guessable URL for anyone on the internet — so
 * instead the app asks for a short-lived signed URL, which only succeeds if the
 * policies below let that particular caller read that particular object.
 *
 * Layout is `avatars/<user id>/<file>`, and every policy keys off the first
 * path segment. `storage.foldername(name)` is Supabase's own helper for that.
 */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152, -- 2 MB, enforced by the storage service rather than by the client
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Writes: your own folder, nobody else's.
create policy "upload your own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "replace your own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "remove your own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

/*
 * Reads: yourself, plus the people you are actually playing against. A
 * challenge is the only thing that makes one user's avatar visible to another,
 * and it stops being visible if the challenge is deleted.
 */
create policy "read your own avatar or an opponent's"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from challenges c
         where (select auth.uid()) in (c.creator_id, c.opponent_id)
           and (storage.foldername(name))[1] in (c.creator_id::text, c.opponent_id::text)
      )
    )
  );
