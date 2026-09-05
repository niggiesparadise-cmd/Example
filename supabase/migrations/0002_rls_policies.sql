-- Row Level Security.
--
-- The client bundle is public — it ships inside an APK — so every access rule
-- lives here, enforced by Postgres, not by the application. Each policy is
-- written against `auth.uid()`, which Supabase derives from the request's JWT.

alter table profiles        enable row level security;
alter table courses         enable row level security;
alter table topics          enable row level security;
alter table lectures        enable row level security;
alter table tasks           enable row level security;
alter table exams           enable row level security;
alter table notes           enable row level security;
alter table schedule_events enable row level security;
alter table study_sessions  enable row level security;

-- Forces RLS to apply to the table owner too, so a mistake elsewhere cannot
-- quietly bypass these rules.
alter table profiles        force row level security;
alter table courses         force row level security;
alter table topics          force row level security;
alter table lectures        force row level security;
alter table tasks           force row level security;
alter table exams           force row level security;
alter table notes           force row level security;
alter table schedule_events force row level security;
alter table study_sessions  force row level security;

-- profiles are keyed by the user's own id rather than a user_id column.
create policy "profiles are readable by their owner"
  on profiles for select using ((select auth.uid()) = id);
create policy "profiles are insertable by their owner"
  on profiles for insert with check ((select auth.uid()) = id);
create policy "profiles are updatable by their owner"
  on profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles are deletable by their owner"
  on profiles for delete using ((select auth.uid()) = id);

-- Every other table follows one shape. `with check` on insert/update is what
-- stops a user writing a row owned by somebody else.
do $$
declare t text;
begin
  foreach t in array array['courses','topics','lectures','tasks','exams','notes','schedule_events','study_sessions']
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
