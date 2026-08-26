-- Allows only head guards to remove a student and dependent notification history.
-- Run this in Supabase SQL Editor before using Remove student in the app.
create or replace function public.delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'head_guard'
  ) then
    raise exception 'Only head guards can delete students';
  end if;

  delete from public.notifications
  where session_id in (
    select id from public.sessions where student_id = p_student_id
  );

  delete from public.students where id = p_student_id;
end;
$$;

grant execute on function public.delete_student(uuid) to authenticated;

create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'head_guard'
  ) then
    raise exception 'Only head guards can revoke invites';
  end if;

  delete from public.invites
  where id = p_invite_id and used = false;
end;
$$;

grant execute on function public.revoke_invite(uuid) to authenticated;

-- Notification history points to sessions without ON DELETE CASCADE. Keep the
-- cleanup function authoritative so head-guard deletion is not blocked by it.
drop policy if exists "notifications_delete_policy" on public.notifications;
create policy "notifications_delete_policy" on public.notifications
  for delete using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard'
    )
  );

-- Keep instructor access limited to assigned students and their notes.
drop policy if exists "students_select_policy" on public.students;
create policy "students_select_policy" on public.students
  for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard'
    )
    or exists (
      select 1 from public.sessions
      where student_id = students.id and instructor_id = auth.uid()
    )
  );

drop policy if exists "notes_select_policy" on public.notes;
create policy "notes_select_policy" on public.notes
  for select using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'head_guard'
    )
    or exists (
      select 1 from public.sessions
      where student_id = notes.student_id and instructor_id = auth.uid()
    )
  );
