-- Keep the authoritative Part Master note aligned with the tube-based
-- calculation of K001099 / PLUSS00173BZ00 in the browser engine.
update public.part_master
set calculation_note = 'Per module rail (Hat or Z): 3 plates on 100 × 100 Torque Tube, 2 on 110 × 110, 1 on 120 × 120; sum per tracker'
where lower(btrim(tag)) = 'k001099';
