-- LUMA commercial category expansion and clearly labelled demonstration data.
-- Ambiguous legacy assignments are recorded and deliberately left unchanged.

create table public.commercial_category_migration_ambiguities (
  id bigint generated always as identity primary key,
  source_table text not null,
  source_id uuid not null,
  legacy_category text not null,
  proposed_category text not null,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.commercial_category_migration_ambiguities enable row level security;
revoke all on table public.commercial_category_migration_ambiguities from anon, authenticated;
grant select on table public.commercial_category_migration_ambiguities to authenticated;
grant all on table public.commercial_category_migration_ambiguities to service_role;

create policy "Admins can read category migration ambiguities"
on public.commercial_category_migration_ambiguities for select to authenticated
using ((select private.is_admin()));

insert into public.supplier_category_catalog (category, sort_order)
values
  ('Substructure', 15),
  ('Bearing', 31),
  ('Limit Switch', 52),
  ('SOLTRK', 54),
  ('Junction Box', 56)
on conflict (category) do update set active = true;

-- A legacy Steel Structure record can mean Posts or Substructure. Existing
-- explicit Posts records make that meaning ambiguous, so retain and report it.
insert into public.commercial_category_migration_ambiguities
  (source_table, source_id, legacy_category, proposed_category, reason)
select 'supplier_categories', sc.id, sc.category, 'Substructure',
       'Supplier already has an explicit Posts or Substructure capability.'
from public.supplier_categories sc
where sc.category = 'Steel Structure'
  and exists (
    select 1 from public.supplier_categories sibling
    where sibling.supplier_id = sc.supplier_id
      and sibling.category in ('Posts', 'Substructure')
  );

update public.price_lists pl
set category = 'Substructure'
where pl.category = 'Steel Structure'
  and not exists (
    select 1 from public.supplier_categories sc
    where sc.supplier_id = pl.supplier_id
      and sc.category in ('Posts', 'Substructure')
  );

update public.supplier_categories sc
set category = 'Substructure'
where sc.category = 'Steel Structure'
  and not exists (
    select 1 from public.supplier_categories sibling
    where sibling.supplier_id = sc.supplier_id
      and sibling.category in ('Posts', 'Substructure')
  );

insert into public.commercial_category_migration_ambiguities
  (source_table, source_id, legacy_category, proposed_category, reason)
select 'supplier_categories', sc.id, sc.category, 'Bearing',
       'Supplier already has an explicit Bearing capability.'
from public.supplier_categories sc
where sc.category = 'Bearings'
  and exists (
    select 1 from public.supplier_categories sibling
    where sibling.supplier_id = sc.supplier_id and sibling.category = 'Bearing'
  );

update public.price_lists pl
set category = 'Bearing'
where pl.category = 'Bearings'
  and not exists (
    select 1 from public.supplier_categories sc
    where sc.supplier_id = pl.supplier_id and sc.category = 'Bearing'
  );

update public.supplier_categories sc
set category = 'Bearing'
where sc.category = 'Bearings'
  and not exists (
    select 1 from public.supplier_categories sibling
    where sibling.supplier_id = sc.supplier_id and sibling.category = 'Bearing'
  );

update public.supplier_category_catalog set active = false
where category in ('Steel Structure', 'Bearings');

-- These records are intentionally unmistakable demonstration data. They can
-- be deactivated or deleted by an administrator before production use.
insert into public.suppliers
  (id, supplier_code, supplier_name, country, city, address, notes, active)
values
  ('de000001-0000-4000-8000-000000000001', 'DEMO-SUP-001', 'DEMO — Italian Steel Supplier', 'Italy', 'Milan', 'DEMO address — Milan', 'DEMO / SAMPLE DATA — not a commercial quotation.', true),
  ('de000002-0000-4000-8000-000000000002', 'DEMO-SUP-002', 'DEMO — European Components Supplier', 'Germany', 'Munich', 'DEMO address — Munich', 'DEMO / SAMPLE DATA — not a commercial quotation.', true),
  ('de000003-0000-4000-8000-000000000003', 'DEMO-SUP-003', 'DEMO — Electrical Supplier', 'Italy', 'Turin', 'DEMO address — Turin', 'DEMO / SAMPLE DATA — not a commercial quotation.', true)
on conflict (supplier_code) do nothing;

insert into public.supplier_categories (supplier_id, category, delivery_time_days, active)
values
  ('de000001-0000-4000-8000-000000000001', 'Posts', 42, true),
  ('de000001-0000-4000-8000-000000000001', 'Substructure', 35, true),
  ('de000002-0000-4000-8000-000000000002', 'Bearing', 28, true),
  ('de000002-0000-4000-8000-000000000002', 'Slew Drive', 42, true),
  ('de000002-0000-4000-8000-000000000002', 'Fasteners', 21, true),
  ('de000003-0000-4000-8000-000000000003', 'PV Module', 56, true),
  ('de000003-0000-4000-8000-000000000003', 'Limit Switch', 28, true),
  ('de000003-0000-4000-8000-000000000003', 'SOLTRK', 35, true),
  ('de000003-0000-4000-8000-000000000003', 'Junction Box', 28, true)
on conflict (supplier_id, category) do nothing;

insert into public.price_lists
  (id, supplier_id, category, revision, currency, valid_from, active, notes)
values
  ('de100001-0000-4000-8000-000000000001', 'de000001-0000-4000-8000-000000000001', 'Posts', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100002-0000-4000-8000-000000000002', 'de000001-0000-4000-8000-000000000001', 'Substructure', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100003-0000-4000-8000-000000000003', 'de000002-0000-4000-8000-000000000002', 'Bearing', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100004-0000-4000-8000-000000000004', 'de000002-0000-4000-8000-000000000002', 'Slew Drive', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100005-0000-4000-8000-000000000005', 'de000002-0000-4000-8000-000000000002', 'Fasteners', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100006-0000-4000-8000-000000000006', 'de000003-0000-4000-8000-000000000003', 'PV Module', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100007-0000-4000-8000-000000000007', 'de000003-0000-4000-8000-000000000003', 'Limit Switch', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100008-0000-4000-8000-000000000008', 'de000003-0000-4000-8000-000000000003', 'SOLTRK', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY'),
  ('de100009-0000-4000-8000-000000000009', 'de000003-0000-4000-8000-000000000003', 'Junction Box', 'DEMO-2026-R01', 'EUR', date '2026-01-01', true, 'DEMO / SAMPLE PRICES ONLY')
on conflict (supplier_id, category, revision) do nothing;

insert into public.price_list_items (price_list_id, tag, description, unit, unit_price)
values
  ('de100001-0000-4000-8000-000000000001', 'k001152', 'DEMO sample price', 'pcs', 103.65),
  ('de100001-0000-4000-8000-000000000001', 'k050376', 'DEMO sample price', 'pcs', 112.64),
  ('de100003-0000-4000-8000-000000000003', 'k001120', 'DEMO sample price', 'pcs', 33.61),
  ('de100003-0000-4000-8000-000000000003', 'k060356', 'DEMO sample price', 'pcs', 36.70),
  ('de100004-0000-4000-8000-000000000004', 'k001144', 'DEMO sample price migrated from application development defaults', 'pcs', 183.26),
  ('de100005-0000-4000-8000-000000000005', 'k001164', 'DEMO sample price', 'pcs', 0.50),
  ('de100007-0000-4000-8000-000000000007', 'k001393', 'DEMO sample price migrated from application development defaults', 'pcs', 7.00),
  ('de100009-0000-4000-8000-000000000009', 'k001404', 'DEMO sample price migrated from application development defaults', 'pcs', 35.00)
on conflict (price_list_id, tag) do nothing;
