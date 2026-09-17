-- Versioned, administrator-controlled Logistics rates.
-- No production prices are seeded by this migration.

create table public.logistics_rates (
  id uuid primary key default gen_random_uuid(),
  origin_country text not null,
  destination_country text not null,
  cargo_group text not null,
  container_capacity_kg numeric not null,
  currency text not null,
  fob_per_container numeric,
  cif_per_container numeric,
  customs_clearance_per_container numeric,
  internal_site_per_container numeric,
  internal_warehouse_per_container numeric,
  revision text not null,
  valid_from date,
  valid_until date,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  constraint logistics_rates_origin_allowed check (origin_country in ('Italy', 'Egypt', 'Turkey', 'China')),
  constraint logistics_rates_destination_not_blank check (btrim(destination_country) <> ''),
  constraint logistics_rates_cargo_group_not_blank check (btrim(cargo_group) <> ''),
  constraint logistics_rates_capacity_positive check (container_capacity_kg > 0),
  constraint logistics_rates_currency_allowed check (currency in ('EUR', 'USD', 'GBP', 'CNY')),
  constraint logistics_rates_revision_not_blank check (btrim(revision) <> ''),
  constraint logistics_rates_fob_nonnegative check (fob_per_container is null or fob_per_container >= 0),
  constraint logistics_rates_cif_nonnegative check (cif_per_container is null or cif_per_container >= 0),
  constraint logistics_rates_customs_nonnegative check (customs_clearance_per_container is null or customs_clearance_per_container >= 0),
  constraint logistics_rates_site_nonnegative check (internal_site_per_container is null or internal_site_per_container >= 0),
  constraint logistics_rates_warehouse_nonnegative check (internal_warehouse_per_container is null or internal_warehouse_per_container >= 0),
  constraint logistics_rates_valid_date_order check (valid_from is null or valid_until is null or valid_until >= valid_from),
  constraint logistics_rates_route_revision_unique unique (origin_country, destination_country, cargo_group, revision)
);

create unique index logistics_rates_one_active_route
  on public.logistics_rates (origin_country, destination_country, cargo_group)
  where active;
create index logistics_rates_route_idx on public.logistics_rates (origin_country, destination_country, cargo_group);
create index logistics_rates_validity_idx on public.logistics_rates (valid_from, valid_until);
create index logistics_rates_active_idx on public.logistics_rates (active);

comment on table public.logistics_rates is
  'Versioned per-container Logistics configuration. NULL cost means missing; numeric zero is an intentional zero cost.';
comment on column public.logistics_rates.container_capacity_kg is
  'Administrator-controlled shipment capacity in kilograms; no capacity is hard-coded in engineering calculations.';

create or replace function private.set_logistics_rate_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.origin_country := btrim(new.origin_country);
  new.destination_country := btrim(new.destination_country);
  new.cargo_group := btrim(new.cargo_group);
  new.currency := upper(btrim(new.currency));
  new.revision := upper(btrim(new.revision));
  new.notes := nullif(btrim(new.notes), '');
  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function private.set_logistics_rate_audit_fields() from public, anon, authenticated;
create trigger set_logistics_rate_audit_fields_before_write
before insert or update on public.logistics_rates
for each row execute function private.set_logistics_rate_audit_fields();

alter table public.logistics_rates enable row level security;
revoke all on table public.logistics_rates from anon, authenticated;
grant select, insert, update, delete on table public.logistics_rates to authenticated;
grant all on table public.logistics_rates to service_role;

create policy "Authenticated users can read Logistics rates"
on public.logistics_rates for select to authenticated using (true);
create policy "Admins can create Logistics rates"
on public.logistics_rates for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update Logistics rates"
on public.logistics_rates for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy "Admins can delete Logistics rates"
on public.logistics_rates for delete to authenticated using ((select private.is_admin()));
