-- LUMA BOM Manager user-profile fields and safe self-service updates.
-- Passwords remain exclusively in Supabase Auth and are never stored here.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists job_title text,
  add column if not exists company text,
  add column if not exists phone text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

comment on column public.profiles.full_name is 'User-editable display name.';
comment on column public.profiles.job_title is 'User-editable job title.';
comment on column public.profiles.company is 'User-editable company name.';
comment on column public.profiles.phone is 'User-editable phone number.';

-- Existing profiles RLS already limits SELECT to auth.uid() = id. Add the same
-- row boundary for updates. Column grants below are the field-level boundary.
drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke update on table public.profiles from authenticated;
grant update (full_name, job_title, company, phone) on public.profiles to authenticated;

-- Defense in depth: an authenticated API request cannot change the identity or
-- role even if broader table grants are introduced later. Dashboard SQL and
-- trusted server-side administration have auth.uid() = null and remain able to
-- promote a user deliberately.
create or replace function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.id is distinct from old.id or new.role is distinct from old.role)
     and (select auth.uid()) is not null then
    raise exception 'Profile identity and role cannot be changed by the authenticated user'
      using errcode = '42501';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.protect_profile_security_fields() from public;
revoke all on function private.protect_profile_security_fields() from anon;
revoke all on function private.protect_profile_security_fields() from authenticated;

drop trigger if exists protect_luma_profile_security_fields on public.profiles;
create trigger protect_luma_profile_security_fields
before update on public.profiles
for each row execute function private.protect_profile_security_fields();
