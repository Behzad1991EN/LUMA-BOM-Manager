-- Company-wide overhead constants use the existing commercial_settings table.

alter table public.commercial_settings
  drop constraint if exists commercial_settings_area_check;

alter table public.commercial_settings
  add constraint commercial_settings_area_check
  check (area in ('quotation', 'shipment', 'cat', 'custom_costs', 'overhead'));

alter table public.commercial_settings
  add constraint commercial_settings_overhead_values_valid
  check (
    area <> 'overhead'
    or setting_key <> 'defaults'
    or (
      setting_value ? 'ksi_annual_overhead_eur'
      and setting_value ? 'ksi_annual_project_capacity_mwp'
      and jsonb_typeof(setting_value -> 'ksi_annual_overhead_eur') = 'number'
      and jsonb_typeof(setting_value -> 'ksi_annual_project_capacity_mwp') = 'number'
      and (setting_value ->> 'ksi_annual_overhead_eur')::numeric >= 0
      and (setting_value ->> 'ksi_annual_project_capacity_mwp')::numeric > 0
    )
  );

insert into public.commercial_settings (area, setting_key, setting_value)
values (
  'overhead',
  'defaults',
  '{"ksi_annual_overhead_eur":1000000,"ksi_annual_project_capacity_mwp":120}'::jsonb
)
on conflict (area, setting_key) do nothing;

comment on constraint commercial_settings_overhead_values_valid on public.commercial_settings is
  'KSI annual overhead must be non-negative and annual project capacity must be greater than zero.';
