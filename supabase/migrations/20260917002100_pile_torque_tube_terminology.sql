-- Update authoritative Part Master terminology without changing TAGs, prices,
-- quantities, or the historical engineering calculation fields.

create function private.luma_rename_pile_and_tube(value text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(value, 'Main[[:space:]]+Post', 'Drive Pile', 'gi'),
      'Bearing[[:space:]]+Post', 'Bearing Pile', 'gi'),
    'Main[[:space:]]+(Beam|Tube)', 'Torque Tube', 'gi');
$$;

alter table public.part_master drop constraint if exists part_master_post_kind_check;

update public.part_master
set part = private.luma_rename_pile_and_tube(part),
    description = private.luma_rename_pile_and_tube(description),
    category = private.luma_rename_pile_and_tube(category),
    material = private.luma_rename_pile_and_tube(material),
    calculation_note = private.luma_rename_pile_and_tube(calculation_note),
    post_kind = private.luma_rename_pile_and_tube(post_kind),
    profile_type = private.luma_rename_pile_and_tube(profile_type),
    profile_details = private.luma_rename_pile_and_tube(profile_details)
where concat_ws(' ', part, description, category, material, calculation_note,
                post_kind, profile_type, profile_details)
  ~* '(Main[[:space:]]+Post|Bearing[[:space:]]+Post|Main[[:space:]]+(Beam|Tube))';

alter table public.part_master add constraint part_master_post_kind_check
  check (post_kind is null or post_kind in ('Drive Pile', 'Bearing Pile'));

-- Correct only the old default, leaving a deliberately customized part number alone.
update public.part_master
set part_number = 'ELPZFR55100000'
where lower(btrim(tag)) = 'k001393'
  and (part_number is null or part_number = 'EAPZFR55100000');

-- Price-list item descriptions are saved snapshots; update nomenclature only.
-- Prices, TAGs, revision identity, and validity remain unchanged.
update public.price_list_items
set description = private.luma_rename_pile_and_tube(description)
where description ~* '(Main[[:space:]]+Post|Bearing[[:space:]]+Post|Main[[:space:]]+(Beam|Tube))';

drop function private.luma_rename_pile_and_tube(text);
