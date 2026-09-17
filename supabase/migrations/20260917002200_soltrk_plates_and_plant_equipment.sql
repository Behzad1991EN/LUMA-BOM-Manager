-- Add the two new SOLTRK 3.0 plates. TAGs remain the permanent identity;
-- existing part numbers, material, weight, and supplier prices are untouched.
insert into public.part_master (part, tag, description, category, unit, calculation_note, active)
select supplied.part, supplied.tag, supplied.part, 'Steel Structure / Substructure',
       'pcs', '1 × SOLTRK 3.0', true
from (values
  ('k001579', 'SOLTRK 3.0 Internal Plate'),
  ('k001569', 'SOLTRK 3.0 Logo Plate')
) as supplied(tag, part)
where not exists (
  select 1 from public.part_master as existing
  where lower(btrim(existing.tag)) = supplied.tag
);

-- k001568 already exists: update that record instead of adding another one.
-- Do not replace its existing material, weight, or part number.
update public.part_master as master
set part = supplied.part,
    description = supplied.part,
    category = 'Steel Structure / Substructure',
    calculation_note = '1 × SOLTRK 3.0'
from (values
  ('k001579', 'SOLTRK 3.0 Internal Plate'),
  ('k001568', 'SOLTRK 3.0 External Plate'),
  ('k001569', 'SOLTRK 3.0 Logo Plate')
) as supplied(tag, part)
where lower(btrim(master.tag)) = supplied.tag;

-- Keep any saved price-list descriptions aligned without changing prices.
update public.price_list_items as item
set description = supplied.part
from (values
  ('k001579', 'SOLTRK 3.0 Internal Plate'),
  ('k001568', 'SOLTRK 3.0 External Plate'),
  ('k001569', 'SOLTRK 3.0 Logo Plate')
) as supplied(tag, part)
where lower(btrim(item.tag)) = supplied.tag;

-- Document the project-level formulas next to the authoritative parts.
update public.part_master as master
set calculation_note = supplied.note
from (values
  ('k001388', '4 × each active tube joint: inner joint on each side, plus each B–C joint'),
  ('k001157', '2 × k001388'),
  ('k001013', '1 × k001388'),
  ('k001479', '2 × k001388'),
  ('k001405', 'One per 48 trackers across the whole plant; project total may be overridden'),
  ('k001406', 'One per 48 trackers across the whole plant; project total may be overridden'),
  ('k001542', 'One per 48 trackers across the whole plant; project total may be overridden'),
  ('k001596', 'Elevation < 400 m ASL: one per 48 trackers across the whole plant; project total may be overridden'),
  ('k001536', 'Elevation ≥ 400 m ASL: one per 48 trackers across the whole plant; project total may be overridden'),
  ('k001552', 'One per 100 trackers across the whole plant; project total may be overridden'),
  ('k001525', 'One per 100 trackers across the whole plant; project total may be overridden'),
  ('k001538', '1 × selected Anemometer for the whole plant'),
  ('k001539', '3 × selected Anemometer'),
  ('k001513', '4 × Junction Box + (SOLTRK 3.0: 4 × SOLTRK 3.0 External Plate) + 3 × selected Anemometer')
) as supplied(tag, note)
where lower(btrim(master.tag)) = supplied.tag;
