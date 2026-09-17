-- Central Part Master. Supabase is authoritative; browser storage is not an
-- authorization boundary. Existing internal records are seeded below.

create table public.part_master (
  id uuid primary key default gen_random_uuid(),
  part text not null,
  -- Three preserved legacy records have no assigned TAG. New application
  -- records are validated to require one, while this nullable column avoids
  -- inventing engineering identities during the one-time migration.
  tag text,
  description text not null,
  part_number text,
  category text not null,
  unit text,
  material text,
  weight numeric,
  calculation_note text,
  active boolean not null default true,
  post_kind text check (post_kind is null or post_kind in ('Main Post', 'Bearing Post')),
  foundation_method text check (foundation_method is null or foundation_method in ('Ramming', 'Foundation')),
  foundation_depth_mm integer check (foundation_depth_mm is null or foundation_depth_mm > 0),
  profile_type text,
  profile_details text,
  overall_length_mm integer check (overall_length_mm is null or overall_length_mm > 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  constraint part_master_part_not_blank check (btrim(part) <> ''),
  constraint part_master_description_not_blank check (btrim(description) <> ''),
  constraint part_master_category_not_blank check (btrim(category) <> ''),
  constraint part_master_post_attributes_complete check (
    post_kind is null or
    (foundation_method is not null and foundation_depth_mm is not null and
     nullif(btrim(profile_type), '') is not null and overall_length_mm is not null)
  )
);

create unique index part_master_post_configuration_unique
on public.part_master (post_kind, foundation_method, foundation_depth_mm, lower(btrim(profile_type)))
where active and post_kind is not null;
create unique index part_master_tag_unique
on public.part_master (lower(tag)) where tag is not null and btrim(tag) <> '';
create index part_master_category_idx on public.part_master (category);
create index part_master_active_idx on public.part_master (active);

create or replace function private.set_part_master_audit_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.tag := nullif(lower(btrim(new.tag)), '');
  new.part := btrim(new.part);
  new.description := btrim(new.description);
  new.category := btrim(new.category);
  if tg_op = 'INSERT' and auth.uid() is not null and new.tag is null then
    raise exception using errcode = '23502', message = 'New Part Master records require a TAG.';
  end if;
  new.updated_at := timezone('utc', now());
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.created_at := timezone('utc', now());
    new.created_by := (select auth.uid());
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

revoke all on function private.set_part_master_audit_fields() from public, anon, authenticated;
create trigger set_part_master_audit_fields_before_write
before insert or update on public.part_master
for each row execute function private.set_part_master_audit_fields();

alter table public.part_master enable row level security;
revoke all on table public.part_master from anon, authenticated;
grant select, insert, update, delete on table public.part_master to authenticated;
grant all on table public.part_master to service_role;

create policy "Authenticated users can read Part Master records"
on public.part_master for select to authenticated using (true);
create policy "Admins can create Part Master records"
on public.part_master for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update Part Master records"
on public.part_master for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete Part Master records"
on public.part_master for delete to authenticated using ((select private.is_admin()));

-- Seed block is generated from the legacy verification archive by
-- tools/generate-part-master-seed.js. It runs once with this migration and is
-- never executed by the browser application.
-- GENERATED_SEED_START
insert into public.part_master
  (part, tag, description, part_number, category, unit, material, weight,
   calculation_note, active, post_kind, foundation_method,
   foundation_depth_mm, profile_type, overall_length_mm)
values
  ('Main Post', 'k001152', 'Luma drive pile HEA 140 × 3460mm', null, 'Steel Structure', 'pcs', null, null, null, true, 'Main Post', 'Ramming', 2000, 'HEA 140', 3460),
  ('Main Post', 'k050376', 'Luma drive pile HEA 140 × 3760mm', null, 'Steel Structure', 'pcs', null, null, null, true, 'Main Post', 'Ramming', 2300, 'HEA 140', 3760),
  ('Bearing Post', 'k001120', 'Luma lateral pile C 160 × 75 × 3 × 3260mm', null, 'Steel Structure', 'pcs', null, null, null, true, 'Bearing Post', 'Ramming', 2000, 'C', 3260),
  ('Bearing Post', 'k060356', 'Luma lateral pile C 160 × 75 × 3 × 3560mm', null, 'Steel Structure', 'pcs', null, null, null, true, 'Bearing Post', 'Ramming', 2300, 'C', 3560),
  ('Main Post', 'k050346', 'Luma drive pile HEA 140x3460mm', 'PLUPH03460BH00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Slew Drive Seat', 'k001162', 'Luma slew drive seat', 'PLUAS00304BH00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Bearing Post', 'k060326', 'Luma lateral pile C 160x75x3x3260mm', 'PLUPO03260BH00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Bearing Adapter', 'k001119', 'Luma lateral pile head', 'PLUAB00360BH00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Main Beam A', 'k001141', 'torque tube 120x120x4x9.80m', 'PLUMS09800CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Main Beam B', 'k081150', 'torque tube 110x110x3.5x 11.50m', 'PLUMS11300CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Main Beam C - Long', 'k031180', 'torque tube 100x100x3.5x 1180cm', 'PLUMS11800CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Main Beam C - Short', 'k030870', 'torque tube 100x100x3.5x 870cm', 'PLUMS08700CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Slew Drive Connection', 'k001147', 'torque tube 120x120x4x0.5m', 'PLUMS00500CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Hat rail', 'k001098', 'pv rail 790x75x1.5 mm', 'PLURR00850CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Z rail', 'k001145', 'end pv rail 790x27x2.2mm', 'PLURZ00850CZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Module Rail Fixing Part', 'k001101', 'pv rail lower clamp', 'PLUFS00192FZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Module Rail Support Plate', 'k001099', 'pv rail upper clamp', 'PLUSS00173BZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Module Rail Elevation Plate', 'k001573', 'pv rail raiser', 'PLUSS00159AH00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Limit Switch Holder', 'k001389', 'Limit switch holder', 'PLUHL00192GZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Limit Switch Trigger', 'k001397', 'Limit switch trigger', 'PLUTS00211GZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('SOLTRK 2.0 Holder', 'k001505', 'SOLTRK 2.0 Holder', 'PLUHS00330GZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('SOLTRK 3.0 Holder', 'k001568', 'SOLTRK 3.0 Holder', null, 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Junction Box Holder', 'k001511', 'Junction box holder', 'PLUHJ00191GZ00', 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Anemometer Holder Plate', 'k001538', 'Anemometer Bracket', null, 'Steel Structure', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Bearing 120', 'k001116', 'csb gsqb-120.dwg', 'BAB120S0000000', 'Bearings', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Bearing 110', 'k001135', 'csb gsqb-110.dwg', 'BAB110S0000000', 'Bearings', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Bearing 100', 'k001136', 'csb gsqb-100.dwg', 'BAB100S0000000', 'Bearings', 'pcs', null, null, null, true, null, null, null, null, null),
  ('PV Module', null, 'PV module', null, 'PV Module', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Slew Drive', 'k001144', 'slewing drive coie vh7.dwg', 'SA0VH704500000', 'Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Limit Switch', 'k001393', 'Limit switch', 'EAPZFR55100000', 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('SOLTRK 2.0', 'k001534', 'SOLTRK 2.0', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('SOLTRK 3.0', 'k001549', 'SOLTRK 3.0', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Junction Box', 'k001404', 'junction box', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Cable Gland', 'k001390', 'cable gland pg13.5', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Safeguard M', 'k001405', 'Safeguard-M48V-8-13_rev03', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Safeguard S', 'k001406', 'Safeguard-S48V-8-13_rev03', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Power Supply', 'k001525', 'Higeco GWC V4 4DIN', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Power Supply', 'k001552', 'Scada Power supply HDR-30-24', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Electrical Enclosure', 'k001542', 'Scada enclosure GW40028', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Anemometer for Cold Weather (above 400)', 'k001536', 'anemometer nuovaceva 0103011303', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Anemometer for Normal Weather', 'k001596', 'anemometer nuovaceva 0103010805', null, 'Electrical', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001164', 'k001164', 'DIN 933 ISO 4017 - M20 × 55', 'FBB8205555A000', 'Fasteners / Slew Drive Seat', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001010', 'k001010', 'DIN 934 ISO 4032 - M20', 'FNC8200000A000', 'Fasteners / Slew Drive Seat', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001154', 'k001154', 'DIN 125 ISO 7089 - A21 (M20)', 'FOAD203700A000', 'Fasteners / Slew Drive Seat', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001163', 'k001163', 'DIN 127B - A20', 'FOCF200000B000', 'Fasteners / Slew Drive Seat', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001231', 'k001231', 'DIN 933 ISO 4017 - M18 × 80', 'FBB8188080A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001228', 'k001228', 'DIN 934 ISO 4032 - M18', 'FBB8163030A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001238', 'k001238', 'DIN 7349 ISO 8738 - A19 (M18)', 'FODC184400A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001230', 'k001230', 'DIN 127B - A18', 'FOCF180000B000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('DIN 7967 - M18', null, 'DIN 7967 - M18', 'FNF8180000A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('DIN 936 ISO 4035 - M18', null, 'DIN 936 ISO 4035 - M18', 'FNE8180000A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001129', 'k001129', 'DIN 912 ISO 4762 - M14 × 180 - 40', 'FBL814I040A000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001124', 'k001124', 'DIN 934 ISO 4032 - M14', 'FNC8140000A000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001125', 'k001125', 'DIN 933 ISO 4017 - M14 × 35', 'FBB8143535A000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001401', 'k001401', 'DIN 7985 ISO 7045 - M4 × 40', 'FBD8044040A000', 'Fasteners / Limit Switch', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001130', 'k001130', 'DIN 9021 ISO 7093 - 16 (M14)', 'FOBC144200A000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001123', 'k001123', 'DIN 6796 ISO 10683 - A15 (M14)', 'FOGF143500B000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001137', 'k001137', 'Din 982 ISO 7040 - M14', 'FNB8140000A000', 'Fasteners / Bearing', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001385', 'k001385', 'DIN 933 ISO 4017 - M16 × 30', 'FBB8163030A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001127', 'k001127', 'DIN 125 ISO 7089 - A17 (M16)', 'FOAD163000A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001166', 'k001166', 'DIN 127B - A16', 'FOCF162700A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001388', 'k001388', 'DIN 93x Special Thread - M12 × 150 - 46', 'FBZ812F046A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001157', 'k001157', 'DIN 9021 ISO 7093 - 13 (M12)', 'FOBC123700A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001013', 'k001013', 'DIN 982 ISO 7040 - M12', 'FNB8120000A000', 'Fasteners / Main Beams', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001151', 'k001151', 'DIN 93x Special Thread - M8 × 150 - 50', 'FBZ808F050A000', 'Fasteners / Z Rails', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001239', 'k001239', 'DIN 522 - 19 × 39 × 3 (M18)', 'FOFC183900A000', 'Fasteners / Slew Drive', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Square Washer', 'k001576', 'Square Washer 38×38×9.5×6 mm', 'FOFG083800H000', 'Fasteners / Hat rail', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001235', 'k001235', 'DIN 522 - 8.5 × 18 × 3 (M8)', 'FOFC081800A000', 'Fasteners / Module Rails', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001074', 'k001074', 'DIN 982 ISO 7040 - M8', 'FNB8080000A000', 'Fasteners / Module Rails', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001575', 'k001575', 'DIN 603 ISO 8678 - M8', 'FBO808F0F0A000', 'Fasteners / Hat Rails', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001503', 'k001503', 'DIN 976-1 - M6 × 1000', 'FBJ806G0G0A000', 'Fasteners / SOLTRK Holder', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001502', 'k001502', 'DIN 9021 ISO 7093 - A6', 'FOBC061800A000', 'Fasteners / SOLTRK Holder', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001501', 'k001501', 'DIN 986 - M6', 'FOBC061800A000', 'Fasteners / SOLTRK Holder', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001504', 'k001504', 'DIN 982 ISO 7040 - M6 - A2K', 'FNB8060000A000', 'Fasteners / SOLTRK Holder', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001510', 'k001510', 'DIN 912 ISO 4762 - M4 × 25', 'FBF8042525A000', 'Fasteners / SOLTRK', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001402', 'k001402', 'DIN 982 ISO 7040 - M4', 'FNB8040000A000', 'Fasteners / SOLTRK + Limit Switch', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001509', 'k001509', 'DIN 9021 ISO 7093 - A 4.3 (M4)', 'FOBC041200A000', 'Fasteners / Junction Box + Limit Switch', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001454', 'k001454', 'DIN 7985 ISO 7045 - M5 × 16', 'FBD8051616A000', 'Fasteners / Junction Box', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001513', 'k001513', 'DIN 982 ISO 7040 - M5', 'FNB8050000A000', 'Fasteners / SOLTRK Holder Plate + Anemometer', 'pcs', null, null, null, true, null, null, null, null, null),
  ('k001539', 'k001539', 'DIN 7985 ISO 7045 - M5 × 20', 'FBD8052020A000', 'Fasteners / Anemometer', 'pcs', null, null, null, true, null, null, null, null, null),
  ('Tube Spacer', 'k001479', 'tube spacer for LUMA m12×16×12.7×13.3', null, 'Fastener / Main Beam', 'pcs', null, null, null, true, null, null, null, null, null)
on conflict do nothing;
-- GENERATED_SEED_END

-- Known engineering attributes supplied for the two C-profile bearing posts.
update public.part_master
set profile_details = 'C 160 × 75 × 3'
where tag in ('k001120', 'k060356');
