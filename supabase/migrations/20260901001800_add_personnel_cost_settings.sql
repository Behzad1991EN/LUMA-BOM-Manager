-- Company-wide Personnel monthly costs use the existing commercial_settings
-- table and therefore inherit authenticated read access, admin-only writes,
-- audit identity, and Row Level Security.

alter table public.commercial_settings
  drop constraint if exists commercial_settings_area_check;

alter table public.commercial_settings
  add constraint commercial_settings_area_check
  check (area in ('quotation', 'shipment', 'cat', 'custom_costs', 'overhead', 'personnel'));

alter table public.commercial_settings
  add constraint commercial_settings_personnel_values_valid
  check (
    area <> 'personnel'
    or setting_key <> 'defaults'
    or (
      setting_value ? 'currency'
      and setting_value ? 'engineering_monthly_cost'
      and setting_value ? 'test_commissioning_monthly_cost'
      and setting_value ? 'project_management_monthly_cost'
      and setting_value ? 'admin_management_monthly_cost'
      and setting_value ->> 'currency' = 'EUR'
      and jsonb_typeof(setting_value -> 'engineering_monthly_cost') = 'number'
      and jsonb_typeof(setting_value -> 'test_commissioning_monthly_cost') = 'number'
      and jsonb_typeof(setting_value -> 'project_management_monthly_cost') = 'number'
      and jsonb_typeof(setting_value -> 'admin_management_monthly_cost') = 'number'
      and (setting_value ->> 'engineering_monthly_cost')::numeric >= 0
      and (setting_value ->> 'test_commissioning_monthly_cost')::numeric >= 0
      and (setting_value ->> 'project_management_monthly_cost')::numeric >= 0
      and (setting_value ->> 'admin_management_monthly_cost')::numeric >= 0
    )
  );

insert into public.commercial_settings (area, setting_key, setting_value)
values (
  'personnel',
  'defaults',
  '{"currency":"EUR","engineering_monthly_cost":7824.85,"test_commissioning_monthly_cost":14455.92,"project_management_monthly_cost":9823.90,"admin_management_monthly_cost":38970.00}'::jsonb
)
on conflict (area, setting_key) do nothing;

comment on constraint commercial_settings_personnel_values_valid on public.commercial_settings is
  'Personnel defaults are non-negative monthly EUR costs. Annual and per-MW values are derived at runtime.';
