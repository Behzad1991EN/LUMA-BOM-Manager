-- Add reusable route methods, city endpoints, and itemized per-container costs.
-- Existing rows remain valid through the legacy route method. Example prices are
-- supplied only by the Administration form and are not seeded into the database.

alter table public.logistics_rates
  add column origin_city text not null default '',
  add column transit_port_city text not null default '',
  add column warehouse_city text not null default '',
  add column destination_city text not null default '',
  add column route_method text not null default 'legacy',
  add column direct_transport_per_container numeric,
  add column origin_to_port_per_container numeric,
  add column port_to_site_per_container numeric,
  add column port_to_warehouse_per_container numeric,
  add column warehouse_unloading_per_container numeric,
  add column warehouse_truck_loading_per_container numeric,
  add column warehouse_storage_per_period numeric,
  add column warehouse_storage_period_days numeric,
  add column warehouse_storage_days numeric,
  add column warehouse_to_site_per_container numeric,
  add column insurance_per_container numeric;

alter table public.logistics_rates
  add constraint logistics_rates_route_method_allowed check (route_method in (
    'legacy', 'direct', 'fob_port_site', 'port_warehouse_site', 'fob_port_warehouse_site'
  )),
  add constraint logistics_rates_direct_nonnegative check (direct_transport_per_container is null or direct_transport_per_container >= 0),
  add constraint logistics_rates_origin_port_nonnegative check (origin_to_port_per_container is null or origin_to_port_per_container >= 0),
  add constraint logistics_rates_port_site_nonnegative check (port_to_site_per_container is null or port_to_site_per_container >= 0),
  add constraint logistics_rates_port_warehouse_nonnegative check (port_to_warehouse_per_container is null or port_to_warehouse_per_container >= 0),
  add constraint logistics_rates_unloading_nonnegative check (warehouse_unloading_per_container is null or warehouse_unloading_per_container >= 0),
  add constraint logistics_rates_truck_loading_nonnegative check (warehouse_truck_loading_per_container is null or warehouse_truck_loading_per_container >= 0),
  add constraint logistics_rates_storage_nonnegative check (warehouse_storage_per_period is null or warehouse_storage_per_period >= 0),
  add constraint logistics_rates_storage_period_positive check (warehouse_storage_period_days is null or warehouse_storage_period_days > 0),
  add constraint logistics_rates_storage_days_nonnegative check (warehouse_storage_days is null or warehouse_storage_days >= 0),
  add constraint logistics_rates_warehouse_site_nonnegative check (warehouse_to_site_per_container is null or warehouse_to_site_per_container >= 0),
  add constraint logistics_rates_insurance_nonnegative check (insurance_per_container is null or insurance_per_container >= 0);

create index logistics_rates_city_route_idx
  on public.logistics_rates (origin_country, origin_city, transit_port_city, warehouse_city, destination_country, destination_city, route_method);

alter table public.logistics_rates
  drop constraint logistics_rates_route_revision_unique,
  add constraint logistics_rates_city_route_revision_unique unique (
    origin_country, origin_city, transit_port_city, warehouse_city, destination_country, destination_city, cargo_group, route_method, revision
  );

drop index public.logistics_rates_one_active_route;
create unique index logistics_rates_one_active_route
  on public.logistics_rates (
    origin_country, origin_city, transit_port_city, warehouse_city,
    destination_country, destination_city, cargo_group, route_method
  ) where active;

comment on column public.logistics_rates.route_method is
  'Administrator-selected route structure. Legacy preserves records created before itemized route costs.';
comment on column public.logistics_rates.warehouse_unloading_per_container is
  'Cost to unload one container at the warehouse.';
comment on column public.logistics_rates.warehouse_truck_loading_per_container is
  'Cost to load one container shipment from the warehouse onto a site-bound truck.';
comment on column public.logistics_rates.warehouse_storage_per_period is
  'Warehouse keeping cost per container for one configured storage period.';

create or replace function private.set_logistics_rate_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.origin_country := btrim(new.origin_country);
  new.origin_city := btrim(new.origin_city);
  new.transit_port_city := btrim(new.transit_port_city);
  new.warehouse_city := btrim(new.warehouse_city);
  new.destination_country := btrim(new.destination_country);
  new.destination_city := btrim(new.destination_city);
  new.cargo_group := btrim(new.cargo_group);
  new.route_method := btrim(new.route_method);
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
