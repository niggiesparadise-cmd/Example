-- Housekeeping the database owns, so the client cannot forget it.

-- updated_at is maintained server-side; a client clock is not trustworthy.
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','courses','topics','lectures','tasks','exams','notes','schedule_events']
  loop
    execute format(
      'create trigger %1$s_set_updated_at before update on %1$I
         for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- Every new auth user gets a profile row, so the app never has to cope with a
-- signed-in user that has no profile.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep `completed_at` consistent with `status` without trusting the client to
-- send both. The CHECK constraint enforces agreement; this fills it in.
create or replace function sync_task_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and new.completed_at is null then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

create trigger tasks_sync_completion
  before insert or update on tasks
  for each row execute function sync_task_completion();
