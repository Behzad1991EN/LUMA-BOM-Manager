-- Quotation settings and immutable-at-creation commercial snapshots.

create table public.commercial_settings (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('quotation', 'shipment', 'cat', 'custom_costs')),
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  unique (area, setting_key),
  constraint commercial_settings_key_not_blank check (btrim(setting_key) <> '')
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null,
  revision text not null default '00',
  project_id text,
  project_code text,
  project_name text,
  customer_company text,
  currency text not null default 'EUR',
  total_amount numeric,
  status text not null default 'draft' check (status in ('draft', 'issued', 'superseded')),
  snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  unique (quotation_number, revision),
  constraint quotations_number_not_blank check (btrim(quotation_number) <> '')
);

create index quotations_created_by_idx on public.quotations (created_by);
create index quotations_project_id_idx on public.quotations (project_id);

create or replace function private.set_commercial_settings_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.area := lower(btrim(new.area));
  new.setting_key := lower(btrim(new.setting_key));
  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create or replace function private.set_quotation_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

revoke all on function private.set_commercial_settings_audit_fields() from public, anon, authenticated;
revoke all on function private.set_quotation_audit_fields() from public, anon, authenticated;
create trigger set_commercial_settings_audit_fields_before_write before insert or update on public.commercial_settings
for each row execute function private.set_commercial_settings_audit_fields();
create trigger set_quotation_audit_fields_before_write before insert or update on public.quotations
for each row execute function private.set_quotation_audit_fields();

alter table public.commercial_settings enable row level security;
alter table public.quotations enable row level security;
revoke all on table public.commercial_settings, public.quotations from anon, authenticated;
grant select, insert, update, delete on table public.commercial_settings, public.quotations to authenticated;
grant all on table public.commercial_settings, public.quotations to service_role;

create policy "Authenticated users can read commercial settings" on public.commercial_settings
for select to authenticated using (active or (select private.is_admin()));
create policy "Admins can create commercial settings" on public.commercial_settings
for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update commercial settings" on public.commercial_settings
for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete commercial settings" on public.commercial_settings
for delete to authenticated using ((select private.is_admin()));

create policy "Users can read their quotations and admins can read all" on public.quotations
for select to authenticated using (created_by = (select auth.uid()) or (select private.is_admin()));
create policy "Users can create their own quotation snapshots" on public.quotations
for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Users can update their quotations and admins can update all" on public.quotations
for update to authenticated
using (created_by = (select auth.uid()) or (select private.is_admin()))
with check (created_by = (select auth.uid()) or (select private.is_admin()));
create policy "Admins can delete quotation snapshots" on public.quotations
for delete to authenticated using ((select private.is_admin()));

insert into public.commercial_settings (area, setting_key, setting_value)
values
  ('quotation', 'defaults', '{"currency":"EUR","revision":"00","validity_days":7,"delivery_time_weeks":20,"safeguard_price":2500,"monitoring_price":1800,"engineering_services_price":3500,"commissioning_price":null,"technician_days":null,"pile_supplement_per_mwp":550,"manworks_installation_per_day":500,"manworks_extended_per_day":600,"source":"DEMO / SAMPLE DEFAULTS TRANSCRIBED FROM LUMA_ENG.docx"}'::jsonb),
  ('shipment', 'defaults', '{"status":"data-ready","source":"DEMO / SAMPLE DEFAULTS"}'::jsonb),
  ('cat', 'defaults', '{"status":"data-ready","source":"DEMO / SAMPLE DEFAULTS"}'::jsonb),
  ('custom_costs', 'defaults', '{"status":"data-ready","source":"DEMO / SAMPLE DEFAULTS"}'::jsonb)
on conflict (area, setting_key) do nothing;
