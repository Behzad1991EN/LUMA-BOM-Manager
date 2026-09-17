-- Replace the combined Electrical commercial category with independently
-- selectable supplier and Price List categories. Historical combined Price
-- Lists are retained as inactive records so no entered price is deleted.

insert into public.supplier_category_catalog (category, sort_order, active)
values
  ('Cable Gland', 57, true),
  ('Safeguard', 58, true),
  ('Anemometer', 59, true),
  ('Power Supply', 61, true),
  ('Electrical Enclosure', 62, true)
on conflict (category) do update
set sort_order = excluded.sort_order,
    active = true;

-- Known LUMA electrical Part Master identities. This temporary mapping is also
-- used to split any existing combined Electrical Price List by stable TAG.
create temporary table luma_electrical_category_map (
  tag text primary key,
  category text not null
) on commit drop;

insert into luma_electrical_category_map (tag, category)
values
  ('k001393', 'Limit Switch'),
  ('k001534', 'SOLTRK'),
  ('k001549', 'SOLTRK'),
  ('k001404', 'Junction Box'),
  ('k001390', 'Cable Gland'),
  ('k001405', 'Safeguard'),
  ('k001406', 'Safeguard'),
  ('k001536', 'Anemometer'),
  ('k001596', 'Anemometer'),
  ('k001525', 'Power Supply'),
  ('k001552', 'Power Supply'),
  ('k001542', 'Electrical Enclosure');

update public.part_master as part
set category = mapped.category
from luma_electrical_category_map as mapped
where lower(btrim(part.tag)) = mapped.tag
  and lower(btrim(part.category)) = 'electrical';

-- Include any records that an administrator had already classified into one
-- of the new leaf categories before this migration was applied.
insert into luma_electrical_category_map (tag, category)
select lower(btrim(part.tag)), part.category
from public.part_master as part
where part.tag is not null
  and btrim(part.tag) <> ''
  and part.category in (
    'Limit Switch', 'SOLTRK', 'Junction Box', 'Cable Gland',
    'Safeguard', 'Anemometer', 'Power Supply', 'Electrical Enclosure'
  )
on conflict (tag) do update set category = excluded.category;

-- Do not guess the category of administrator-created legacy records. Keep
-- them intact and make the ambiguity available to an administrator for review.
insert into public.commercial_category_migration_ambiguities
  (source_table, source_id, legacy_category, proposed_category, reason)
select 'part_master', part.id, part.category, 'Electrical component category',
       'Legacy Electrical Part Master TAG is not in the controlled LUMA electrical mapping; manual classification is required.'
from public.part_master as part
where lower(btrim(part.category)) = 'electrical'
  and not exists (
    select 1
    from luma_electrical_category_map as mapped
    where mapped.tag = lower(btrim(part.tag))
  );

-- A former Electrical capability is copied to each independent component
-- category. Existing explicit assignments win, including an explicitly
-- inactive assignment.
insert into public.supplier_categories
  (supplier_id, category, delivery_time_days, active)
select legacy.supplier_id, split.category,
       legacy.delivery_time_days, legacy.active
from public.supplier_categories as legacy
cross join (
  values
    ('Limit Switch'),
    ('SOLTRK'),
    ('Junction Box'),
    ('Cable Gland'),
    ('Safeguard'),
    ('Anemometer'),
    ('Power Supply'),
    ('Electrical Enclosure')
) as split(category)
where legacy.category = 'Electrical'
on conflict (supplier_id, category) do nothing;

-- Record unmatched legacy Price List items before archiving the combined
-- document. The original document and all of its items remain in PostgreSQL.
insert into public.commercial_category_migration_ambiguities
  (source_table, source_id, legacy_category, proposed_category, reason)
select 'price_list_items', item.id, legacy.category,
       'Electrical component category',
       'Legacy Electrical Price List TAG is not in the controlled LUMA electrical mapping; the item remains in the archived source document.'
from public.price_list_items as item
join public.price_lists as legacy on legacy.id = item.price_list_id
where legacy.category = 'Electrical'
  and not exists (
    select 1
    from luma_electrical_category_map as mapped
    where mapped.tag = lower(btrim(item.tag))
  );

create temporary table luma_electrical_price_list_split (
  source_price_list_id uuid not null,
  target_price_list_id uuid not null,
  category text not null,
  primary key (source_price_list_id, category),
  unique (target_price_list_id)
) on commit drop;

-- Reuse an already existing supplier/category/document record when present;
-- otherwise prepare a new header for each represented component category.
insert into luma_electrical_price_list_split
  (source_price_list_id, target_price_list_id, category)
select legacy.id,
       coalesce(existing.id, gen_random_uuid()),
       represented.category
from public.price_lists as legacy
join (
  select distinct item.price_list_id, mapped.category
  from public.price_list_items as item
  join luma_electrical_category_map as mapped
    on mapped.tag = lower(btrim(item.tag))
) as represented on represented.price_list_id = legacy.id
left join public.price_lists as existing
  on existing.supplier_id = legacy.supplier_id
 and existing.category = represented.category
 and existing.revision = legacy.revision
where legacy.category = 'Electrical';

insert into public.price_lists
  (id, supplier_id, category, revision, currency,
   valid_from, valid_until, active, notes)
select split.target_price_list_id,
       legacy.supplier_id,
       split.category,
       legacy.revision,
       legacy.currency,
       legacy.valid_from,
       legacy.valid_until,
       legacy.active and not exists (
         select 1
         from public.price_lists as active_list
         where active_list.supplier_id = legacy.supplier_id
           and active_list.category = split.category
           and active_list.active
       ),
       legacy.notes
from luma_electrical_price_list_split as split
join public.price_lists as legacy on legacy.id = split.source_price_list_id
where not exists (
  select 1
  from public.price_lists as target
  where target.id = split.target_price_list_id
);

insert into public.price_list_items
  (price_list_id, tag, description, unit, unit_price)
select split.target_price_list_id,
       item.tag,
       item.description,
       item.unit,
       item.unit_price
from luma_electrical_price_list_split as split
join public.price_list_items as item
  on item.price_list_id = split.source_price_list_id
join luma_electrical_category_map as mapped
  on mapped.tag = lower(btrim(item.tag))
 and mapped.category = split.category
on conflict (price_list_id, tag) do nothing;

-- If a matching inactive target document already existed and the legacy
-- document was active, restore it only when that component has no other active
-- document. This retains the one-active-list database guarantee.
update public.price_lists as target
set active = true
from luma_electrical_price_list_split as split
join public.price_lists as legacy
  on legacy.id = split.source_price_list_id
where target.id = split.target_price_list_id
  and legacy.active
  and not target.active
  and not exists (
    select 1
    from public.price_lists as active_list
    where active_list.supplier_id = target.supplier_id
      and active_list.category = target.category
      and active_list.id <> target.id
      and active_list.active
  );

-- The generic records remain as inactive history but cannot be selected for
-- new supplier capabilities or Price Lists.
update public.price_lists
set active = false
where category = 'Electrical'
  and active;

delete from public.supplier_categories
where category = 'Electrical';

update public.supplier_category_catalog
set active = false
where category = 'Electrical';

comment on column public.price_lists.category is
  'Independent supplier capability category. Legacy Electrical headers are retained inactive; new electrical documents use component-level categories.';
