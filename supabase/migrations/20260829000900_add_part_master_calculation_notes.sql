-- Add the supplied calculation notes to the authoritative Part Master.
-- Most rows are matched by stable TAG. The three supplied rows without a TAG
-- are matched by their stable part number or unambiguous Part Master identity.

update public.part_master as part
set calculation_note = supplied.calculation_note
from (values
  ('k050346', 'Total Trackers QTY'),
  ('k001162', '2 × Main Post'),
  ('k060326', 'Calculated from bearing distance rules'),
  ('k001119', 'Bearing Post'),
  ('k001141', 'Long trackers only; 2 per tracker'),
  ('k081150', '2 per tracker'),
  ('k031180', 'Counted only when required length > 0; per tracker side; odd trackers may have different north/south C length'),
  ('k030870', 'Counted only when required length > 0; per tracker side; odd trackers may have different north/south C length'),
  ('k001147', 'Short trackers only; 2 per tracker'),
  ('k001098', 'PV Modules - 2 per tracker'),
  ('k001145', '4 per tracker'),
  ('k001101', 'Hat Rail + Z Rail + 1 per tracker'),
  ('k001099', 'Temporary formula for K001099 / PLUSS00173BZ00: (PV modules − 2) + (2 × Bearing 110) + (6 × Bearing 100), per tracker'),
  ('k001573', '2 × Bearing 100'),
  ('k001389', 'Main Post'),
  ('k001397', 'Main Post'),
  ('k001505', '1 × SOLTRK'),
  ('k001511', '1 × Junction Box'),
  ('k001538', 'Round up (Tracker / 48) per array configuration'),
  ('k001116', 'Calculated from bearing post positions on 120 beam zone'),
  ('k001135', 'Calculated from bearing post positions on 110 beam zone'),
  ('k001136', 'Calculated from bearing post positions on 100 beam zone'),
  ('k001144', 'Main Post'),
  ('k001393', '2 × Main Post'),
  ('k001534', 'Editable total; automatic default is round up (Main Post / 2)'),
  ('k001404', 'Editable total; automatic default is round down (Tracker / 2)'),
  ('k001390', '2 × Tracker'),
  ('k001405', 'Round up ((1/48) × Tracker)'),
  ('k001406', 'Round up ((1/48) × Tracker)'),
  ('k001525', 'Round up (0.01 × Tracker)'),
  ('k001552', 'Round up (0.01 × Tracker)'),
  ('k001542', 'Round up (0.01 × Tracker)'),
  ('k001536', 'Elevation ≥ 400 m ASL: round up ((1/48) × Tracker)'),
  ('k001596', 'Elevation < 400 m ASL: round up ((1/48) × Tracker)'),
  ('k001164', '8 × Main Post'),
  ('k001010', '8 × Main Post'),
  ('k001154', '16 × Main Post'),
  ('k001163', '8 × Main Post'),
  ('k001231', '4 × Main Post'),
  ('k001228', '4 × Main Post'),
  ('k001238', '4 × Main Post'),
  ('k001230', '4 × Main Post'),
  ('k001129', '2 × Bearing Adapter'),
  ('k001124', '4 × Bearing Adapter'),
  ('k001125', '4 × Bearing Adapter'),
  ('k001401', '4 × Main Post'),
  ('k001130', '4 × Bearing Adapter'),
  ('k001123', '4 × Bearing Adapter'),
  ('k001137', '2 × Bearing Adapter'),
  ('k001385', '16 × Main Post'),
  ('k001127', '22 × Tracker'),
  ('k001166', '16 × Main Post'),
  ('k001388', '8 × Main Tube B'),
  ('k001157', '16 × Main Tube B'),
  ('k001013', '= k001388 = 8 × Main Tube B'),
  ('k001151', '2 × Z Rail'),
  ('k001239', '4 × Tracker'),
  ('k001576', '2 × Hat rail'),
  ('k001235', '2 × Z rail'),
  ('k001074', '2 × Rail'),
  ('k001575', '2 × Hat Rail'),
  ('k001503', 'Round up ((2 × (SOLTRK Holder + Junction Box Holder Plate)) / 5) per array configuration'),
  ('k001502', '4 × (SOLTRK Holder + Junction Box Holder Plate)'),
  ('k001501', '2 × (SOLTRK Holder + Junction Box Holder Plate)'),
  ('k001504', '2 × (SOLTRK Holder + Junction Box Holder Plate)'),
  ('k001510', 'SOLTRK 2.0 only: 4 × SOLTRK'),
  ('k001402', '4 × SOLTRK + 2 × Limit Switch'),
  ('k001509', 'SOLTRK 2.0: 4 × SOLTRK; all versions: 2 × Limit Switch + 4 × Junction Box Holder Plate'),
  ('k001454', '4 × Junction Box + (SOLTRK 3.0: 4 × SOLTRK)'),
  ('k001513', '4 × Junction Box + (SOLTRK 3.0: 4 × SOLTRK 3.0 Holder Plate) + round up ((3/48) × Tracker) for Anemometer, per array configuration'),
  ('k001539', 'Anemometer Bracket × 3'),
  ('k001479', '2 × k001388')
) as supplied(tag, calculation_note)
where lower(part.tag) = supplied.tag;

update public.part_master as part
set calculation_note = supplied.calculation_note
from (values
  ('FNF8180000A000', '2 × Main Post'),
  ('FNE8180000A000', '2 × Main Post')
) as supplied(part_number, calculation_note)
where upper(part.part_number) = supplied.part_number;

update public.part_master
set calculation_note = 'PV Modules per Tracker × Number of Trackers'
where tag is null and lower(btrim(part)) = 'pv module';
