-- Reversible staff access control. Historical sessions and notes remain intact.
alter table public.users
  add column if not exists active boolean not null default true;

create or replace function public.set_staff_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and role = 'head_guard' and active = true
  ) then
    raise exception 'Only active head guards can manage staff access';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'A head guard cannot deactivate their own account';
  end if;

  update public.users
  set active = p_active
  where id = p_user_id;
end;
$$;

grant execute on function public.set_staff_active(uuid, boolean) to authenticated;

-- Enforce active status at the data boundary for instructor access.
drop policy if exists "sessions_select_policy" on public.sessions;
create policy "sessions_select_policy" on public.sessions
  for select using (
    (
      instructor_id = auth.uid()
      and exists (select 1 from public.users where id = auth.uid() and active = true)
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "notes_select_policy" on public.notes;
create policy "notes_select_policy" on public.notes
  for select using (
    (
      author_id = auth.uid()
      and exists (select 1 from public.users where id = auth.uid() and active = true)
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
    or exists (
      select 1 from public.sessions
      where student_id = notes.student_id
        and instructor_id = auth.uid()
        and exists (select 1 from public.users where id = auth.uid() and active = true)
    )
  );

-- Inactive accounts cannot read student records through the API.
drop policy if exists "students_select_policy" on public.students;
create policy "students_select_policy" on public.students
  for select using (
    exists (select 1 from public.users where id = auth.uid() and active = true)
    and (
      exists (select 1 from public.users where id = auth.uid() and role = 'head_guard')
      or exists (select 1 from public.sessions where student_id = students.id and instructor_id = auth.uid())
    )
  );

drop policy if exists "sessions_insert_policy" on public.sessions;
create policy "sessions_insert_policy" on public.sessions
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "sessions_update_policy" on public.sessions;
create policy "sessions_update_policy" on public.sessions
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "sessions_delete_policy" on public.sessions;
create policy "sessions_delete_policy" on public.sessions
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "students_write_policy" on public.students;
create policy "students_write_policy" on public.students
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "students_update_policy" on public.students;
create policy "students_update_policy" on public.students
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );

drop policy if exists "students_delete_policy" on public.students;
create policy "students_delete_policy" on public.students
  for delete using (
    exists (select 1 from public.users where id = auth.uid() and role = 'head_guard' and active = true)
  );
