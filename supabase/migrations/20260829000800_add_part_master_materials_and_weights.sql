-- Add the supplied steel/material designations and per-piece weights to the
-- authoritative Part Master. Values are matched by stable TAG so renamed part
-- labels do not affect the update.

update public.part_master as part
set
  material = supplied.material,
  weight = supplied.weight
from (values
  ('k050346', '1.0045 (S355JR)', 84.16::numeric),
  ('k001162', '1.0045 (S355JR)', 9.62::numeric),
  ('k060326', '1.8902 (S420JR)', 25.26::numeric),
  ('k001119', '1.0045 (S355JR)', 5.39::numeric),
  ('k001141', '1.8902 (S420GD)', 138.63::numeric),
  ('k081150', '1.8902 (S420GD)', 130.85::numeric),
  ('k031180', '1.8902 (S420GD)', 122.40::numeric),
  ('k030870', '1.8902 (S420GD)', 89.51::numeric),
  ('k001147', '1.0529 (S350GD)', 7.10::numeric),
  ('k001098', '1.8902 (S420GD)', 2.19::numeric),
  ('k001145', '1.8902 (S420GD)', 1.84::numeric),
  ('k001101', '1.0529 (S350GD)', 0.19::numeric),
  ('k001099', '1.0045 (S355JR)', 0.24::numeric),
  ('k001573', '1.0038 (S235JR)', 0.23::numeric),
  ('k001389', 'DX51D', 0.55::numeric),
  ('k001397', 'DX51D', 0.36::numeric),
  ('k001505', 'DX51D', 1.12::numeric),
  ('k001568', 'DX51D', 1.12::numeric),
  ('k001511', 'DX51D', 0.21::numeric),
  ('k001538', 'DX51D', 0.22::numeric)
) as supplied(tag, material, weight)
where lower(part.tag) = supplied.tag;
