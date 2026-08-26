-- Instructor-safe roster access.
-- RLS controls rows, not individual columns, so expose only safe fields through
-- this view for instructor roster queries.
create or replace view public.instructor_students
with (security_invoker = true)
as
select id, full_name, swim_level, active
from public.students;

grant select on public.instructor_students to authenticated;

drop policy if exists "notes_insert_policy" on public.notes;
create policy "notes_insert_policy" on public.notes
  for insert with check (
    (
      author_id = auth.uid()
      and exists (
        select 1 from public.users
        where id = auth.uid() and active = true
      )
      and exists (
        select 1 from public.sessions
        where student_id = notes.student_id and instructor_id = auth.uid()
      )
    )
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard' and active = true
    )
  );

drop policy if exists "notes_update_policy" on public.notes;
create policy "notes_update_policy" on public.notes
  for update using (
    (
      author_id = auth.uid()
      and exists (
        select 1 from public.users
        where id = auth.uid() and active = true
      )
      and exists (
        select 1 from public.sessions
        where student_id = notes.student_id and instructor_id = auth.uid()
      )
    )
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard' and active = true
    )
  );

drop policy if exists "notes_delete_policy" on public.notes;
create policy "notes_delete_policy" on public.notes
  for delete using (
    (
      author_id = auth.uid()
      and exists (
        select 1 from public.users
        where id = auth.uid() and active = true
      )
      and exists (
        select 1 from public.sessions
        where student_id = notes.student_id and instructor_id = auth.uid()
      )
    )
    or exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard' and active = true
    )
  );
