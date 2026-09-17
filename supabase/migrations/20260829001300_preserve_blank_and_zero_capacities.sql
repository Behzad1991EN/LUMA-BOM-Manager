-- Preserve the commercial blank-versus-zero distinction for capacity values.
-- Both remain incomplete for container division, but NULL means not configured
-- while zero remains an intentional stored value and receives a distinct warning.

alter table public.logistics_rates
  alter column capacity_value drop not null,
  drop constraint logistics_rates_capacity_value_positive,
  drop constraint logistics_rates_legacy_capacity_positive,
  add constraint logistics_rates_capacity_value_nonnegative
    check (capacity_value is null or capacity_value >= 0),
  add constraint logistics_rates_legacy_capacity_nonnegative
    check (container_capacity_kg is null or container_capacity_kg >= 0);

comment on column public.logistics_rates.capacity_value is
  'Administrator-controlled capacity per container. NULL means missing; zero is preserved but is invalid for division and produces an incomplete result.';
