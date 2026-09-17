'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const legacyPath = path.join(root, 'legacy', 'part-master-hardcoded-backup.js');
const migrationPath = path.join(root, 'supabase', 'migrations', '20260827000500_create_part_master.sql');

function loadLegacyRecords() {
  const context = {globalThis:{}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(legacyPath, 'utf8'), context);
  return context.globalThis.INTERNAL_PART_MASTER_RAW;
}

const sqlString = value => value === null || value === undefined || value === ''
  ? 'null'
  : `'${String(value).replaceAll("'", "''")}'`;
const sqlNumber = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ? 'null'
  : String(Number(value));
const sqlBoolean = value => value === false ? 'false' : 'true';

function buildSeedBlock(records) {
  const rows = records.map(record => `  (${[
    sqlString(record.Part), sqlString(record.TAG), sqlString(record.Description), sqlString(record['Part Number']),
    sqlString(record.Category), sqlString(record.Unit), sqlString(record.Material), sqlNumber(record.Weight),
    sqlString(record['Calculation Note']), sqlBoolean(record.Active), sqlString(record['Post Kind']),
    sqlString(record['Foundation Method']), sqlNumber(record['Foundation Depth mm']), sqlString(record['Profile Type']),
    sqlNumber(record['Overall Length mm'])
  ].join(', ')})`);
  return `insert into public.part_master
  (part, tag, description, part_number, category, unit, material, weight,
   calculation_note, active, post_kind, foundation_method,
   foundation_depth_mm, profile_type, overall_length_mm)
values\n${rows.join(',\n')}\non conflict do nothing;`;
}

function seedFromMigration(migration) {
  return migration.match(/-- GENERATED_SEED_START\r?\n([\s\S]*?)\r?\n-- GENERATED_SEED_END/)?.[1] || '';
}

function verifyParity(records, migration) {
  const generated = buildSeedBlock(records);
  const stored = seedFromMigration(migration);
  const legacyTags = records.map(record => String(record.TAG || '').toLowerCase()).filter(Boolean);
  if (generated.replaceAll('\r\n', '\n') !== stored.replaceAll('\r\n', '\n')) {
    throw new Error('Generated seed SQL does not match the legacy Part Master archive.');
  }
  if (new Set(legacyTags).size !== legacyTags.length) throw new Error('The legacy Part Master contains duplicate TAGs.');
  return {recordCount:records.length, assignedTagCount:legacyTags.length, tags:new Set(legacyTags)};
}

if (require.main === module) {
  const records = loadLegacyRecords();
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const result = verifyParity(records, migration);
  console.log(`Part Master parity verified: ${result.recordCount} records, ${result.assignedTagCount} assigned TAGs.`);
}

module.exports = {loadLegacyRecords, buildSeedBlock, seedFromMigration, verifyParity};
