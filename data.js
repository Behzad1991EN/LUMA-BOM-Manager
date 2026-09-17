'use strict';

// Part Master records are loaded from Supabase through part-master-service.js.
// Historical pre-Supabase records are preserved for verification only in:
// legacy/part-master-hardcoded-backup.js
globalThis.PART_MASTER_COLUMNS = Object.freeze([
  'Part', 'TAG', 'Description', 'Part Number', 'Category', 'Unit',
  'Material', 'Weight', 'Calculation Note', 'Active', 'Post Kind',
  'Foundation Method', 'Foundation Depth mm', 'Profile Type',
  'Profile Details', 'Overall Length mm',
]);
