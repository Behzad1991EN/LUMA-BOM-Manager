-- Present price-list revision as an editable supplier Document No. / Invoice No.
-- The legacy column name remains revision to preserve existing API consumers.

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
    -- Supplier and category stay fixed. Document No. and currency are editable.
    new.supplier_id := old.supplier_id;
    new.category := old.category;
  end if;

  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function private.set_price_list_audit_fields() from public, anon, authenticated;

comment on column public.price_lists.revision is
  'Supplier Document No. / Invoice No. Legacy column name retained for API compatibility; editable by admins.';

update public.part_master
set category = 'Steel Structure / Substructure'
where lower(tag) in ('k001479', 'k001576');

-- Keep the proven atomic item-snapshot implementation as an internal legacy
-- step, then update the two newly editable document fields in the same database
-- transaction. Any constraint failure rolls the complete operation back.
alter function public.save_price_list(jsonb, jsonb, uuid)
  rename to save_price_list_legacy;

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
  v_revision text;
  v_currency text;
begin
  v_revision := upper(btrim(p_price_list ->> 'revision'));
  v_currency := upper(btrim(p_price_list ->> 'currency'));

  v_price_list_id := public.save_price_list_legacy(
    p_price_list,
    p_items,
    p_price_list_id
  );

  if p_price_list_id is not null then
    update public.price_lists
    set revision = v_revision,
        currency = v_currency
    where id = v_price_list_id;
  end if;

  return v_price_list_id;
end;
$$;

revoke all on function public.save_price_list(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_price_list(jsonb, jsonb, uuid) to authenticated, service_role;

comment on function public.save_price_list(jsonb, jsonb, uuid) is
  'Atomically saves editable Document No., currency, dates, status, notes, and the complete item-price snapshot.';
comment on function public.save_price_list_legacy(jsonb, jsonb, uuid) is
  'Internal compatibility step used by save_price_list. Do not call from frontend code.';
