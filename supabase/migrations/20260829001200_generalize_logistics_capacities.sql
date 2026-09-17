-- Extend the existing Logistics route model for weight- and quantity-based cargo.
-- Existing Steel Structure rows are preserved and migrated to weight/kg capacity.

alter table public.logistics_rates
  add column capacity_type text,
  add column capacity_value numeric,
  add column capacity_unit text;

update public.logistics_rates
set capacity_type = 'weight',
    capacity_value = container_capacity_kg,
    capacity_unit = 'kg';

alter table public.logistics_rates
  alter column capacity_type set not null,
  alter column capacity_value set not null,
  alter column capacity_unit set not null,
  alter column container_capacity_kg drop not null;

alter table public.logistics_rates
  drop constraint logistics_rates_capacity_positive,
  add constraint logistics_rates_legacy_capacity_positive
    check (container_capacity_kg is null or container_capacity_kg > 0),
  add constraint logistics_rates_capacity_type_allowed
    check (capacity_type in ('weight', 'quantity')),
  add constraint logistics_rates_capacity_value_positive
    check (capacity_value > 0),
  add constraint logistics_rates_capacity_unit_allowed
    check (capacity_unit in ('kg', 'pcs')),
  add constraint logistics_rates_cargo_group_allowed
    check (cargo_group in ('Steel Structure', 'Slew Drive', 'Bearing')),
  add constraint logistics_rates_cargo_capacity_consistent
    check (
      (cargo_group = 'Steel Structure' and capacity_type = 'weight' and capacity_unit = 'kg')
      or
      (cargo_group in ('Slew Drive', 'Bearing') and capacity_type = 'quantity' and capacity_unit = 'pcs')
    );

comment on column public.logistics_rates.container_capacity_kg is
  'Legacy Steel Structure capacity retained for backward compatibility. New calculations use capacity_type, capacity_value, and capacity_unit.';
comment on column public.logistics_rates.capacity_type is
  'Calculation basis: weight for Steel Structure, quantity for Slew Drive and Bearing.';
comment on column public.logistics_rates.capacity_value is
  'Administrator-controlled positive capacity per container. No production capacity is seeded.';
comment on column public.logistics_rates.capacity_unit is
  'Capacity unit constrained to kg for weight or pcs for quantity.';
