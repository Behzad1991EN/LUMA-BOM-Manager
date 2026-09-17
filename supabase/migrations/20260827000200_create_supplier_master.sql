-- LUMA BOM Manager Supplier Master foundation.
-- Depends on private.is_admin() from 20260827000100_create_profiles_authorization.sql.

create table public.supplier_category_catalog (
  category text primary key,
  sort_order smallint not null unique,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint supplier_category_catalog_name_not_blank
    check (btrim(category) <> '')
);

insert into public.supplier_category_catalog (category, sort_order)
values
  ('Steel Structure', 10),
  ('Posts', 20),
  ('Bearings', 30),
  ('Slew Drive', 40),
  ('PV Module', 50),
  ('Electrical', 60),
  ('Fasteners', 70);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  supplier_name text not null,
  country text,
  city text,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  constraint suppliers_code_not_blank check (btrim(supplier_code) <> ''),
  constraint suppliers_name_not_blank check (btrim(supplier_name) <> '')
);

create table public.supplier_categories (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  category text not null references public.supplier_category_catalog (category),
  delivery_time_days integer,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint supplier_categories_supplier_category_unique
    unique (supplier_id, category),
  constraint supplier_categories_delivery_time_nonnegative
    check (delivery_time_days is null or delivery_time_days >= 0)
);

create index suppliers_name_search_idx
  on public.suppliers (lower(supplier_name));
create index suppliers_active_idx
  on public.suppliers (active);
create index supplier_categories_supplier_idx
  on public.supplier_categories (supplier_id);
create index supplier_categories_category_idx
  on public.supplier_categories (category);

comment on table public.suppliers is
  'Administrator-maintained supplier identity and contact master data.';
comment on table public.supplier_categories is
  'Supplier capabilities and delivery time in days for each supplier/category pair.';
comment on table public.supplier_category_catalog is
  'Controlled commercial category list. Category administration is intentionally not exposed yet.';

-- Normalize stable supplier codes and stamp audit identity inside PostgreSQL.
-- Client-supplied created_by/updated_by values are always replaced.
create or replace function private.set_supplier_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.supplier_code := upper(btrim(new.supplier_code));
  new.supplier_name := btrim(new.supplier_name);

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

revoke all on function private.set_supplier_audit_fields() from public, anon, authenticated;

create trigger set_supplier_audit_fields_before_write
before insert or update on public.suppliers
for each row execute function private.set_supplier_audit_fields();

create or replace function private.set_supplier_category_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.category := btrim(new.category);

  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
  else
    new.created_at := old.created_at;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.set_supplier_category_timestamps() from public, anon, authenticated;

create trigger set_supplier_category_timestamps_before_write
before insert or update on public.supplier_categories
for each row execute function private.set_supplier_category_timestamps();

alter table public.supplier_category_catalog enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_categories enable row level security;

revoke all on table public.supplier_category_catalog from anon, authenticated;
revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.supplier_categories from anon, authenticated;

grant select on table public.supplier_category_catalog to authenticated;
grant select, insert, update, delete on table public.suppliers to authenticated;
grant select, insert, update, delete on table public.supplier_categories to authenticated;

grant all on table public.supplier_category_catalog to service_role;
grant all on table public.suppliers to service_role;
grant all on table public.supplier_categories to service_role;

create policy "Authenticated users can read supplier categories catalog"
on public.supplier_category_catalog
for select
to authenticated
using (true);

create policy "Authenticated users can read suppliers"
on public.suppliers
for select
to authenticated
using (true);

create policy "Admins can create suppliers"
on public.suppliers
for insert
to authenticated
with check ((select private.is_admin()));

-- All authenticated users can already SELECT these rows. USING (true) lets
-- PostgreSQL reach WITH CHECK, which returns an explicit RLS error for a
-- non-admin update instead of silently reporting zero affected rows.
create policy "Admins can update suppliers"
on public.suppliers
for update
to authenticated
using (true)
with check ((select private.is_admin()));

create policy "Admins can delete suppliers"
on public.suppliers
for delete
to authenticated
using ((select private.is_admin()));

create policy "Authenticated users can read supplier categories"
on public.supplier_categories
for select
to authenticated
using (true);

create policy "Admins can create supplier categories"
on public.supplier_categories
for insert
to authenticated
with check ((select private.is_admin()));

-- Match supplier update behavior: non-admin attempts fail WITH CHECK.
create policy "Admins can update supplier categories"
on public.supplier_categories
for update
to authenticated
using (true)
with check ((select private.is_admin()));

create policy "Admins can delete supplier categories"
on public.supplier_categories
for delete
to authenticated
using ((select private.is_admin()));

-- Save supplier details and category assignments in one database transaction.
-- SECURITY INVOKER is intentional: the caller's grants and RLS policies apply.
create or replace function public.save_supplier(
  p_supplier jsonb,
  p_categories jsonb,
  p_supplier_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_supplier_id uuid;
  v_category jsonb;
begin
  if p_supplier_id is null then
    insert into public.suppliers (
      supplier_code, supplier_name, country, city, address,
      contact_name, contact_email, contact_phone, website, notes, active
    ) values (
      p_supplier ->> 'supplier_code',
      p_supplier ->> 'supplier_name',
      nullif(btrim(p_supplier ->> 'country'), ''),
      nullif(btrim(p_supplier ->> 'city'), ''),
      nullif(btrim(p_supplier ->> 'address'), ''),
      nullif(btrim(p_supplier ->> 'contact_name'), ''),
      nullif(btrim(p_supplier ->> 'contact_email'), ''),
      nullif(btrim(p_supplier ->> 'contact_phone'), ''),
      nullif(btrim(p_supplier ->> 'website'), ''),
      nullif(btrim(p_supplier ->> 'notes'), ''),
      coalesce((p_supplier ->> 'active')::boolean, true)
    )
    returning id into v_supplier_id;
  else
    update public.suppliers
    set
      supplier_code = p_supplier ->> 'supplier_code',
      supplier_name = p_supplier ->> 'supplier_name',
      country = nullif(btrim(p_supplier ->> 'country'), ''),
      city = nullif(btrim(p_supplier ->> 'city'), ''),
      address = nullif(btrim(p_supplier ->> 'address'), ''),
      contact_name = nullif(btrim(p_supplier ->> 'contact_name'), ''),
      contact_email = nullif(btrim(p_supplier ->> 'contact_email'), ''),
      contact_phone = nullif(btrim(p_supplier ->> 'contact_phone'), ''),
      website = nullif(btrim(p_supplier ->> 'website'), ''),
      notes = nullif(btrim(p_supplier ->> 'notes'), ''),
      active = coalesce((p_supplier ->> 'active')::boolean, true)
    where id = p_supplier_id
    returning id into v_supplier_id;

    if v_supplier_id is null then
      raise exception 'Supplier was not found.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.supplier_categories
  where supplier_id = v_supplier_id;

  for v_category in
    select value
    from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb))
  loop
    insert into public.supplier_categories (
      supplier_id, category, delivery_time_days, active
    ) values (
      v_supplier_id,
      v_category ->> 'category',
      (v_category ->> 'delivery_time_days')::integer,
      true
    );
  end loop;

  return v_supplier_id;
end;
$$;

revoke all on function public.save_supplier(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_supplier(jsonb, jsonb, uuid) to authenticated, service_role;

comment on function public.save_supplier(jsonb, jsonb, uuid) is
  'Atomically creates or updates a supplier and replaces its active category assignments under caller RLS.';
