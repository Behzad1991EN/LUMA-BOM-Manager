-- LUMA BOM Manager authorization foundation.
-- Supabase Auth remains the sole source of passwords and sessions.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user'
    constraint profiles_role_allowed check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is
  'Application authorization profile for each Supabase Auth user.';
comment on column public.profiles.role is
  'Database-authoritative LUMA role. Allowed values: user, admin.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- This function deliberately lives outside the exposed public schema. As a
-- SECURITY DEFINER it reads profiles without invoking profiles RLS again,
-- which prevents recursive-policy failures. Future administrative tables can
-- use: (select private.is_admin())
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

comment on function private.is_admin() is
  'Returns true only when the authenticated user has role=admin in public.profiles.';

-- Existing Auth users receive the least-privileged role when this migration
-- is first installed.
insert into public.profiles (id, role)
select id, 'user'
from auth.users
on conflict (id) do nothing;

-- Every future Auth user receives a profile automatically. No email or
-- client-supplied metadata can assign the admin role.
create or replace function private.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_user_profile() from public;
revoke all on function private.create_user_profile() from anon;
revoke all on function private.create_user_profile() from authenticated;

create trigger create_luma_profile_after_auth_user
after insert on auth.users
for each row execute function private.create_user_profile();
