-- Keep invite and notification cleanup authoritative in the database.
create or replace function public.remove_invite(p_invite_id uuid)
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
    raise exception 'Only head guards can remove invites';
  end if;

  delete from public.invites where id = p_invite_id;
end;
$$;

grant execute on function public.remove_invite(uuid) to authenticated;

create or replace function public.clear_my_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications where recipient_id = auth.uid();
$$;

grant execute on function public.clear_my_notifications() to authenticated;
