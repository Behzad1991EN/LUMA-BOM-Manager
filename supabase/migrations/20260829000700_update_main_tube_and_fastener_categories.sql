-- Terminology and connection-category update requested for LUMA Part Master.
-- Existing migration history is left immutable; this migration produces the
-- required final state for both existing and newly provisioned databases.

update public.part_master
set
  part = regexp_replace(part, 'Main[[:space:]]+Beam', 'Main Tube', 'gi'),
  description = regexp_replace(description, 'Main[[:space:]]+Beam', 'Main Tube', 'gi'),
  category = regexp_replace(category, 'Main[[:space:]]+Beam', 'Main Tube', 'gi'),
  material = case when material is null then null else regexp_replace(material, 'Main[[:space:]]+Beam', 'Main Tube', 'gi') end,
  calculation_note = case when calculation_note is null then null else regexp_replace(calculation_note, 'Main[[:space:]]+Beam', 'Main Tube', 'gi') end,
  profile_type = case when profile_type is null then null else regexp_replace(profile_type, 'Main[[:space:]]+Beam', 'Main Tube', 'gi') end,
  profile_details = case when profile_details is null then null else regexp_replace(profile_details, 'Main[[:space:]]+Beam', 'Main Tube', 'gi') end
where concat_ws(' ', part, description, category, material, calculation_note, profile_type, profile_details)
  ~* 'Main[[:space:]]+Beam';

update public.part_master
set category = case upper(part_number)
  when 'FBB8205555A000' then 'Fasteners / Slew Drive Seat - Main Post'
  when 'FNC8200000A000' then 'Fasteners / Slew Drive Seat - Main Post'
  when 'FOAD203700A000' then 'Fasteners / Slew Drive Seat - Main Post'
  when 'FOCF200000B000' then 'Fasteners / Slew Drive Seat - Main Post'
  when 'FBB8188080A000' then 'Fasteners / Slew Drive Seat - Slew Drive'
  when 'FODC184400A000' then 'Fasteners / Slew Drive Seat - Slew Drive'
  when 'FOCF180000B000' then 'Fasteners / Slew Drive Seat - Slew Drive'
  when 'FNF8180000A000' then 'Fasteners / Slew Drive Seat - Slew Drive'
  when 'FNE8180000A000' then 'Fasteners / Slew Drive Seat - Slew Drive'
  else category
end
where upper(part_number) in (
  'FBB8205555A000', 'FNC8200000A000', 'FOAD203700A000', 'FOCF200000B000',
  'FBB8188080A000', 'FODC184400A000', 'FOCF180000B000', 'FNF8180000A000',
  'FNE8180000A000'
);

-- Normalize the exact requested dimension wherever it occurs in Part Master
-- descriptive fields: 13x43, 13 x 43, and 13×43 all become 13 × 43.
update public.part_master
set
  part = regexp_replace(part, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi'),
  description = regexp_replace(description, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi'),
  category = regexp_replace(category, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi'),
  material = case when material is null then null else regexp_replace(material, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi') end,
  calculation_note = case when calculation_note is null then null else regexp_replace(calculation_note, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi') end,
  profile_type = case when profile_type is null then null else regexp_replace(profile_type, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi') end,
  profile_details = case when profile_details is null then null else regexp_replace(profile_details, '13[[:space:]]*[x×][[:space:]]*43', '13 × 43', 'gi') end
where concat_ws(' ', part, description, category, material, calculation_note, profile_type, profile_details)
  ~* '13[[:space:]]*[x×][[:space:]]*43';
