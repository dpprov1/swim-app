-- Keep session notifications assigned to the session's instructor only,
-- while including the student's name in every message.
create or replace function public.notify_on_session_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
begin
  select full_name into student_name
  from public.students
  where id = new.student_id;

  if new.status is distinct from old.status
     and new.status in ('cancelled', 'rescheduled') then
    insert into public.notifications (recipient_id, type, message, session_id)
    values (
      new.instructor_id,
      new.status,
      coalesce(student_name, 'Your student') || ' session on ' || new.scheduled_date || ' was ' || new.status || '.',
      new.id
    );
  end if;

  if new.student_checked_in_at is not null and old.student_checked_in_at is null then
    insert into public.notifications (recipient_id, type, message, session_id)
    values (
      new.instructor_id,
      'checked_in',
      coalesce(student_name, 'Your student') || ' has checked in.',
      new.id
    );
  end if;

  return new;
end;
$$;
