-- Table privileges.
--
-- Supabase's bootstrap grants broadly to both `anon` and `authenticated`. This
-- schema does not: nothing here is public data, so the anonymous role is granted
-- nothing at all. RLS decides *which rows* a user sees; these grants decide
-- whether the role may touch the table in the first place. Both layers matter —
-- RLS on a table the anon role cannot reach is defence in depth.

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  profiles, courses, topics, lectures, tasks, exams, notes, schedule_events, study_sessions
  to authenticated;

-- Explicitly leave `anon` with no access to user data.
revoke all on
  profiles, courses, topics, lectures, tasks, exams, notes, schedule_events, study_sessions
  from anon;
