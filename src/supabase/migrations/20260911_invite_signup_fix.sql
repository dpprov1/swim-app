-- Validate invite codes before signup without consuming them. The auth trigger
-- redeems the matching invite when the account is actually created.
alter table public.users
  add column if not exists full_name text,
  add column if not exists role text default 'instructor',
  add column if not exists active boolean not null default true;

alter table public.users
  alter column role set default 'instructor',
  alter column active set default true;

create or replace function public.check_invite(p_email text, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_role text;
begin
  if p_email is null or trim(p_email) = '' or p_code is null or trim(p_code) = '' then
    return null;
  end if;

  select role
    into invite_role
  from public.invites
  where lower(email) = lower(trim(p_email))
    and upper(code) = upper(trim(p_code))
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  return invite_role;
end;
$$;

grant execute on function public.check_invite(text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_role text;
  invite_id uuid;
begin
  select id, role
    into invite_id, invite_role
  from public.invites
  where lower(email) = lower(trim(new.email))
    and upper(code) = upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')))
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  insert into public.users (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', invite_role, 'instructor'),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    role = coalesce(excluded.role, public.users.role),
    active = coalesce(public.users.active, true);

  if invite_id is not null then
    update public.invites
    set used = true,
        used_at = now()
    where id = invite_id;
  end if;

  return new;
end;
$$;

-- The trigger function runs as the database owner and does not need a client grant.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
