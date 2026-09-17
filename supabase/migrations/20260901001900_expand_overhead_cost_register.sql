-- Expand the existing Overhead commercial setting into an itemized yearly EUR
-- register. It inherits authenticated read access, admin-only writes, audit
-- identity, and RLS from public.commercial_settings.

alter table public.commercial_settings
  drop constraint if exists commercial_settings_overhead_values_valid;

alter table public.commercial_settings
  add constraint commercial_settings_overhead_values_valid
  check (
    area <> 'overhead'
    or setting_key <> 'defaults'
    or (
      setting_value ->> 'currency' = 'EUR'
      and jsonb_typeof(setting_value -> 'items') = 'array'
      and jsonb_array_length(setting_value -> 'items') > 0
      and jsonb_typeof(setting_value -> 'ksi_annual_overhead_eur') = 'number'
      and (setting_value ->> 'ksi_annual_overhead_eur')::numeric >= 0
      and jsonb_typeof(setting_value -> 'ksi_annual_project_capacity_mwp') = 'number'
      and (setting_value ->> 'ksi_annual_project_capacity_mwp')::numeric > 0
      and jsonb_typeof(setting_value -> 'valid_from') = 'string'
      and jsonb_typeof(setting_value -> 'valid_until') = 'string'
      and (
        setting_value ->> 'valid_from' = ''
        or setting_value ->> 'valid_until' = ''
        or setting_value ->> 'valid_until' >= setting_value ->> 'valid_from'
      )
    )
  ) not valid;

insert into public.commercial_settings as current_setting (area, setting_key, setting_value)
values (
  'overhead',
  'defaults',
  $json${
    "currency":"EUR",
    "valid_from":"",
    "valid_until":"",
    "ksi_annual_project_capacity_mwp":120,
    "ksi_annual_overhead_eur":297852.58,
    "items":[
      {"code":"OH-001","description":"Other purchases","yearly_cost_eur":54.45},
      {"code":"OH-002","description":"IT equipment/materials (CE)","yearly_cost_eur":961.34},
      {"code":"OH-003","description":"Stationery and printed materials","yearly_cost_eur":1494.63},
      {"code":"OH-004","description":"Assets/goods below one million","yearly_cost_eur":8273.80},
      {"code":"OH-005","description":"Fuel for administrator's car","yearly_cost_eur":395.69},
      {"code":"OH-006","description":"Fuel and lubricant for AMM Kant car","yearly_cost_eur":7436.08},
      {"code":"OH-007","description":"Technical consulting","yearly_cost_eur":84558.36},
      {"code":"OH-008","description":"Maintenance and repairs on owned assets","yearly_cost_eur":182.00},
      {"code":"OH-009","description":"Travel expenses","yearly_cost_eur":18574.51},
      {"code":"OH-010","description":"Maintenance on third-party assets","yearly_cost_eur":3617.50},
      {"code":"OH-011","description":"Car maintenance and repairs","yearly_cost_eur":1649.14},
      {"code":"OH-012","description":"Motorway tolls","yearly_cost_eur":1700.38},
      {"code":"OH-013","description":"Car insurance","yearly_cost_eur":5150.62},
      {"code":"OH-014","description":"Car parking","yearly_cost_eur":821.96},
      {"code":"OH-015","description":"Management costs for mixed-use vehicles","yearly_cost_eur":713.61},
      {"code":"OH-016","description":"Advertising","yearly_cost_eur":11269.03},
      {"code":"OH-017","description":"Postal expenses","yearly_cost_eur":160.97},
      {"code":"OH-018","description":"Entertainment / representation expenses","yearly_cost_eur":31.74},
      {"code":"OH-019","description":"Representation service expenses","yearly_cost_eur":19340.95},
      {"code":"OH-020","description":"Various staff costs","yearly_cost_eur":26.00},
      {"code":"OH-021","description":"Staff training","yearly_cost_eur":218.00},
      {"code":"OH-022","description":"Mileage reimbursement for employees using their own car","yearly_cost_eur":0.00},
      {"code":"OH-023","description":"Consulting fees / charges","yearly_cost_eur":12160.90},
      {"code":"OH-024","description":"Business trips / travel assignments","yearly_cost_eur":2130.00},
      {"code":"OH-025","description":"Software/program subscription fees","yearly_cost_eur":19303.29},
      {"code":"OH-026","description":"Software support","yearly_cost_eur":406.60},
      {"code":"OH-027","description":"Insurance","yearly_cost_eur":20537.01},
      {"code":"OH-028","description":"Other services","yearly_cost_eur":21140.78},
      {"code":"OH-029","description":"Cleaning expenses","yearly_cost_eur":4794.00},
      {"code":"OH-030","description":"Employee liability insurance","yearly_cost_eur":183.13},
      {"code":"OH-031","description":"Rent expenses","yearly_cost_eur":8586.00},
      {"code":"OH-032","description":"Leasing fees","yearly_cost_eur":9383.33},
      {"code":"OH-033","description":"Car rental","yearly_cost_eur":9278.81},
      {"code":"OH-034","description":"Truck rental","yearly_cost_eur":75.00},
      {"code":"OH-035","description":"Expense reimbursement for third-party services","yearly_cost_eur":63.65},
      {"code":"OH-036","description":"Restaurants and hotels","yearly_cost_eur":7902.96},
      {"code":"OH-037","description":"Trade fairs and promotions","yearly_cost_eur":4997.91},
      {"code":"OH-038","description":"Membership fees","yearly_cost_eur":3649.37},
      {"code":"OH-039","description":"Stamp duties","yearly_cost_eur":24.00},
      {"code":"OH-040","description":"Vehicle tax for mixed-use vehicles","yearly_cost_eur":280.08},
      {"code":"OH-041","description":"Condominium/building service charges","yearly_cost_eur":6325.00}
    ]
  }$json$::jsonb
)
on conflict (area, setting_key) do update
set setting_value = excluded.setting_value || jsonb_build_object(
  'ksi_annual_project_capacity_mwp',
  coalesce(
    nullif(current_setting.setting_value ->> 'ksi_annual_project_capacity_mwp', '')::numeric,
    120
  )
);

alter table public.commercial_settings
  validate constraint commercial_settings_overhead_values_valid;

comment on constraint commercial_settings_overhead_values_valid on public.commercial_settings is
  'Overhead defaults contain an itemized yearly EUR register, a positive annual project capacity, and an ordered optional validity period.';
