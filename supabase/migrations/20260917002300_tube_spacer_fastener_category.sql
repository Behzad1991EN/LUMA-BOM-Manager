-- Tube Spacer follows the fastener pricing and BOM category. Preserve its
-- stable TAG, part number, material, weight, and any registered unit prices.
update public.part_master
set part = 'Tube Spacer',
    description = 'M12 × 16 × 12.7 × 13.3',
    category = 'Fasteners / Main Tube - Main Tube',
    calculation_note = '2 × k001388'
where lower(btrim(tag)) = 'k001479';

-- Existing price-list items are document snapshots. Refresh only the text;
-- leave their supplier, category, revision, and price unchanged.
update public.price_list_items
set description = 'M12 × 16 × 12.7 × 13.3'
where lower(btrim(tag)) = 'k001479';
