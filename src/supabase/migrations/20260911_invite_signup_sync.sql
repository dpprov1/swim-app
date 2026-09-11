-- Ensures invites can be redeemed and newly created auth users get a matching row in public.users.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('head_guard', 'instructor')),
  code text not null unique,
  used boolean not null default false,
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create or replace function public.generate_invite_code()
returns text
language sql
stable
as $$
  select upper(substr(md5(random()::text), 1, 6));
$$;

create or replace function public.set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or trim(new.code) = '' then
    new.code = public.generate_invite_code();
  end if;

  while exists (select 1 from public.invites where code = new.code and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)) loop
    new.code = public.generate_invite_code();
  end loop;

  return new;
end;
$$;

drop trigger if exists invites_generate_code on public.invites;
create trigger invites_generate_code
before insert or update of code on public.invites
for each row
execute function public.set_invite_code();

create or replace function public.redeem_invite(p_email text, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  if p_email is null or trim(p_email) = '' then
    raise exception 'Email is required';
  end if;

  if p_code is null or trim(p_code) = '' then
    raise exception 'Invite code is required';
  end if;

  select *
    into v_invite
  from public.invites
  where lower(email) = lower(trim(p_email))
    and upper(code) = upper(trim(p_code))
    and used = false
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  update public.invites
  set used = true,
      used_at = now()
  where id = v_invite.id;

  return v_invite.role;
end;
$$;

grant execute on function public.redeem_invite(text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'instructor'),
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    role = coalesce(excluded.role, public.users.role),
    active = coalesce(public.users.active, true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users
  add column if not exists full_name text,
  add column if not exists role text default 'instructor',
  add column if not exists active boolean not null default true;

alter table public.users
  alter column role set default 'instructor';

alter table public.users
  alter column active set default true;
