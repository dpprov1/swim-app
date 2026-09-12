-- Give instructors a direct, safe roster view of students assigned to them.
drop view if exists public.instructor_students;

create view public.instructor_students as
select distinct
  students.id,
  students.full_name,
  students.swim_level,
  students.active
from public.students
join public.sessions
  on sessions.student_id = students.id
where sessions.instructor_id = auth.uid()
  and exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.active = true
  );

grant select on public.instructor_students to authenticated;