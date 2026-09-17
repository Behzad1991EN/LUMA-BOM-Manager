-- LUMA BOM Manager Supplier Price Lists.
-- Depends on Supplier Master and private.is_admin().

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  category text not null references public.supplier_category_catalog (category),
  revision text not null,
  currency text not null,
  valid_from date,
  valid_until date,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  constraint price_lists_revision_not_blank check (btrim(revision) <> ''),
  constraint price_lists_currency_allowed check (currency in ('EUR', 'USD', 'GBP', 'CNY')),
  constraint price_lists_valid_date_order check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  ),
  constraint price_lists_supplier_category_revision_unique
    unique (supplier_id, category, revision)
);

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  tag text not null,
  description text,
  unit text,
  unit_price numeric,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  constraint price_list_items_tag_not_blank check (btrim(tag) <> ''),
  constraint price_list_items_unit_price_nonnegative check (unit_price is null or unit_price >= 0),
  constraint price_list_items_price_list_tag_unique unique (price_list_id, tag)
);

-- Database-level guarantee: one active revision for each supplier/category.
create unique index price_lists_one_active_per_supplier_category
  on public.price_lists (supplier_id, category)
  where active;

create index price_lists_supplier_category_idx
  on public.price_lists (supplier_id, category);
create index price_lists_active_idx
  on public.price_lists (active);
create index price_lists_validity_idx
  on public.price_lists (valid_from, valid_until);
create index price_list_items_price_list_idx
  on public.price_list_items (price_list_id);
create index price_list_items_tag_idx
  on public.price_list_items (tag);

comment on table public.price_lists is
  'Versioned supplier/category commercial price-list headers. Revisions remain independent.';
comment on table public.price_list_items is
  'Commercial unit prices keyed by Part Master TAG within a specific price-list revision.';
comment on column public.price_list_items.unit_price is
  'Exact PostgreSQL numeric value. NULL means missing price; zero is an entered zero price.';

create or replace function private.set_price_list_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.category := btrim(new.category);
  new.revision := upper(btrim(new.revision));
  new.currency := upper(btrim(new.currency));

  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    -- Revision identity is immutable after creation. Create/duplicate a new
    -- revision instead of rewriting historical identity.
    new.supplier_id := old.supplier_id;
    new.category := old.category;
    new.revision := old.revision;
    new.currency := old.currency;
  end if;

  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function private.set_price_list_audit_fields() from public, anon, authenticated;

create trigger set_price_list_audit_fields_before_write
before insert or update on public.price_lists
for each row execute function private.set_price_list_audit_fields();

create or replace function private.set_price_list_item_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tag := lower(btrim(new.tag));
  new.description := nullif(btrim(new.description), '');
  new.unit := nullif(btrim(new.unit), '');

  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.price_list_id := old.price_list_id;
    new.tag := old.tag;
  end if;

  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function private.set_price_list_item_audit_fields() from public, anon, authenticated;

create trigger set_price_list_item_audit_fields_before_write
before insert or update on public.price_list_items
for each row execute function private.set_price_list_item_audit_fields();

alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;

revoke all on table public.price_lists from anon, authenticated;
revoke all on table public.price_list_items from anon, authenticated;

grant select, insert, update, delete on table public.price_lists to authenticated;
grant select, insert, update, delete on table public.price_list_items to authenticated;
grant all on table public.price_lists to service_role;
grant all on table public.price_list_items to service_role;

create policy "Authenticated users can read price lists"
on public.price_lists
for select
to authenticated
using (true);

create policy "Admins can create price lists"
on public.price_lists
for insert
to authenticated
with check ((select private.is_admin()));

-- USING (true) reaches WITH CHECK for readable rows, producing an explicit
-- RLS rejection for non-admin updates instead of a silent zero-row update.
create policy "Admins can update price lists"
on public.price_lists
for update
to authenticated
using (true)
with check ((select private.is_admin()));

create policy "Admins can delete price lists"
on public.price_lists
for delete
to authenticated
using ((select private.is_admin()));

create policy "Authenticated users can read price list items"
on public.price_list_items
for select
to authenticated
using (true);

create policy "Admins can create price list items"
on public.price_list_items
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admins can update price list items"
on public.price_list_items
for update
to authenticated
using (true)
with check ((select private.is_admin()));

create policy "Admins can delete price list items"
on public.price_list_items
for delete
to authenticated
using ((select private.is_admin()));

-- Atomically save a header and its item snapshot. SECURITY INVOKER preserves
-- the caller's table grants and RLS policies.
create or replace function public.save_price_list(
  p_price_list jsonb,
  p_items jsonb,
  p_price_list_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_price_list_id uuid;
  v_supplier_id uuid;
  v_category text;
  v_revision text;
  v_currency text;
  v_valid_from date;
  v_valid_until date;
  v_active boolean;
  v_item jsonb;
begin
  v_active := coalesce((p_price_list ->> 'active')::boolean, false);
  v_valid_from := nullif(p_price_list ->> 'valid_from', '')::date;
  v_valid_until := nullif(p_price_list ->> 'valid_until', '')::date;

  if v_valid_from is not null and v_valid_until is not null and v_valid_until < v_valid_from then
    raise exception 'Valid Until cannot be before Valid From.' using errcode = 'P2002';
  end if;

  if p_price_list_id is null then
    v_supplier_id := (p_price_list ->> 'supplier_id')::uuid;
    v_category := btrim(p_price_list ->> 'category');
    v_revision := upper(btrim(p_price_list ->> 'revision'));
    v_currency := upper(btrim(p_price_list ->> 'currency'));

    if not exists (
      select 1
      from public.supplier_categories
      where supplier_id = v_supplier_id
        and category = v_category
        and active
    ) then
      raise exception 'Supplier category is not active.' using errcode = 'P2001';
    end if;

    if v_active then
      update public.price_lists
      set active = false
      where supplier_id = v_supplier_id
        and category = v_category
        and active;
    end if;

    insert into public.price_lists (
      supplier_id, category, revision, currency,
      valid_from, valid_until, active, notes
    ) values (
      v_supplier_id,
      v_category,
      v_revision,
      v_currency,
      v_valid_from,
      v_valid_until,
      v_active,
      nullif(btrim(p_price_list ->> 'notes'), '')
    )
    returning id into v_price_list_id;
  else
    select supplier_id, category, revision, currency
    into v_supplier_id, v_category, v_revision, v_currency
    from public.price_lists
    where id = p_price_list_id;

    if v_supplier_id is null then
      raise exception 'Price List was not found.' using errcode = 'P0002';
    end if;

    if v_active and not exists (
      select 1
      from public.supplier_categories
      where supplier_id = v_supplier_id
        and category = v_category
        and active
    ) then
      raise exception 'Supplier category is not active.' using errcode = 'P2001';
    end if;

    if v_active then
      update public.price_lists
      set active = false
      where supplier_id = v_supplier_id
        and category = v_category
        and id <> p_price_list_id
        and active;
    end if;

    update public.price_lists
    set
      valid_from = v_valid_from,
      valid_until = v_valid_until,
      active = v_active,
      notes = nullif(btrim(p_price_list ->> 'notes'), '')
    where id = p_price_list_id
    returning id into v_price_list_id;
  end if;

  delete from public.price_list_items
  where price_list_id = v_price_list_id;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.price_list_items (
      price_list_id, tag, description, unit, unit_price
    ) values (
      v_price_list_id,
      v_item ->> 'tag',
      nullif(btrim(v_item ->> 'description'), ''),
      nullif(btrim(v_item ->> 'unit'), ''),
      nullif(v_item ->> 'unit_price', '')::numeric
    );
  end loop;

  return v_price_list_id;
end;
$$;

revoke all on function public.save_price_list(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_price_list(jsonb, jsonb, uuid) to authenticated, service_role;

comment on function public.save_price_list(jsonb, jsonb, uuid) is
  'Atomically saves one immutable revision identity and its item prices; activating it deactivates its prior supplier/category revision.';
