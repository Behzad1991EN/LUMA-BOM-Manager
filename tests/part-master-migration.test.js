'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const seed = require('../tools/generate-part-master-seed.js');

test('legacy Part Master and generated migration seed have exact record and TAG parity', () => {
  const records = seed.loadLegacyRecords();
  const migration = read('supabase/migrations/20260827000500_create_part_master.sql');
  const result = seed.verifyParity(records, migration);
  assert.equal(result.recordCount, 81);
  assert.equal(result.assignedTagCount, 78);
  assert.equal(result.tags.size, 78);
  assert.equal(records.filter(record => !record.TAG).length, 3);
  assert.equal(records.filter(record => record.TAG === 'k001152').length, 1);
  assert.equal(records.filter(record => record.TAG === 'k060356').length, 1);
});

test('runtime does not import the legacy archive or retain a hard-coded fallback', () => {
  const html = read('index.html');
  const app = read('app.js');
  const data = read('data.js');
  assert.doesNotMatch(html, /legacy\/part-master-hardcoded-backup\.js/);
  assert.doesNotMatch(app, /INTERNAL_PART_MASTER|loadInternalPartMaster|Bundled Read-only Fallback/);
  assert.doesNotMatch(data, /INTERNAL_PART_MASTER_RAW/);
  assert.match(data, /PART_MASTER_COLUMNS/);
  assert.match(app, /Central Part Master unavailable\. BOM generation has been disabled/);
});

test('Part Master migration provides schema, known post attributes, audit, and RLS contracts', () => {
  const migration = read('supabase/migrations/20260827000500_create_part_master.sql');
  assert.match(migration, /create table public\.part_master/);
  assert.match(migration, /profile_details text/);
  assert.match(migration, /Authenticated users can read Part Master records/);
  assert.match(migration, /for select to authenticated using \(true\)/);
  assert.match(migration, /Admins can create Part Master records/);
  assert.match(migration, /Admins can update Part Master records/);
  assert.match(migration, /Admins can delete Part Master records/);
  assert.match(migration, /new\.updated_by := \(select auth\.uid\(\)\)/);
  assert.match(migration, /where tag in \('k001120', 'k060356'\)/);
});

test('terminology migration updates Main Tube labels, connection categories, and 13 × 43 formatting', () => {
  const migration = read('supabase/migrations/20260829000700_update_main_tube_and_fastener_categories.sql');
  const app = read('app.js');
  const partService = read('part-master-service.js');
  assert.match(migration, /Main Tube/);
  assert.match(migration, /Fasteners \/ Slew Drive Seat - Main Post/);
  assert.match(migration, /Fasteners \/ Slew Drive Seat - Slew Drive/);
  for (const partNumber of ['FBB8205555A000','FNC8200000A000','FOAD203700A000','FOCF200000B000','FBB8188080A000','FODC184400A000','FOCF180000B000','FNF8180000A000','FNE8180000A000']) {
    assert.match(migration, new RegExp(partNumber));
  }
  assert.match(migration, /13 × 43/);
  assert.match(partService, /replace\(\/Main\\s\+\(\?:Beam\|Tube\)\/gi, 'Torque Tube'\)/);
  assert.match(partService, /replace\(\/13\\s\*\[x×\]\\s\*43\/gi, '13 × 43'\)/);
  assert.doesNotMatch(app, /Main Beam/i);
});

test('material and weight migration updates all 20 supplied Part Master TAGs', () => {
  const migration = read('supabase/migrations/20260829000800_add_part_master_materials_and_weights.sql');
  const expected = new Map([
    ['k050346', ['1.0045 (S355JR)', '84.16']],
    ['k001162', ['1.0045 (S355JR)', '9.62']],
    ['k060326', ['1.8902 (S420JR)', '25.26']],
    ['k001119', ['1.0045 (S355JR)', '5.39']],
    ['k001141', ['1.8902 (S420GD)', '138.63']],
    ['k081150', ['1.8902 (S420GD)', '130.85']],
    ['k031180', ['1.8902 (S420GD)', '122.40']],
    ['k030870', ['1.8902 (S420GD)', '89.51']],
    ['k001147', ['1.0529 (S350GD)', '7.10']],
    ['k001098', ['1.8902 (S420GD)', '2.19']],
    ['k001145', ['1.8902 (S420GD)', '1.84']],
    ['k001101', ['1.0529 (S350GD)', '0.19']],
    ['k001099', ['1.0045 (S355JR)', '0.24']],
    ['k001573', ['1.0038 (S235JR)', '0.23']],
    ['k001389', ['DX51D', '0.55']],
    ['k001397', ['DX51D', '0.36']],
    ['k001505', ['DX51D', '1.12']],
    ['k001568', ['DX51D', '1.12']],
    ['k001511', ['DX51D', '0.21']],
    ['k001538', ['DX51D', '0.22']],
  ]);
  assert.match(migration, /update public\.part_master as part/);
  assert.match(migration, /where lower\(part\.tag\) = supplied\.tag/);
  for (const [tag, [material, weight]] of expected) {
    assert.ok(migration.includes(`('${tag}', '${material}', ${weight}::numeric)`), `${tag} must keep its supplied material and weight`);
  }
});

test('pile and torque-tube names and Limit Switch default are reproducible in a new migration', () => {
  const migration = read('supabase/migrations/20260917002100_pile_torque_tube_terminology.sql');
  const app = read('app.js');
  assert.match(migration, /update public\.part_master/);
  assert.match(migration, /'Drive Pile'/);
  assert.match(migration, /'Bearing Pile'/);
  assert.match(migration, /'Torque Tube'/);
  assert.match(migration, /ELPZFR55100000/);
  assert.match(migration, /where lower\(btrim\(tag\)\) = 'k001393'/);
  assert.match(app, /rawInputs\.drive_pile_depth_mm\?\?rawInputs\.foundation_depth_mm/);
  assert.match(app, /rawInputs\.bearing_pile_depth_mm\?\?rawInputs\.foundation_depth_mm/);
});

test('calculation-note migration stores the supplied Part Master formulas by stable identity', () => {
  const migration = read('supabase/migrations/20260829000900_add_part_master_calculation_notes.sql');
  const taggedNotes = [...migration.matchAll(/\('(k\d{6})', '([^']*)'\)/g)];
  assert.equal(taggedNotes.length, 72);
  assert.match(migration, /\('k050346', 'Total Trackers QTY'\)/);
  assert.match(migration, /\('k001099', 'Temporary formula for K001099 \/ PLUSS00173BZ00: \(PV modules − 2\) \+ \(2 × Bearing 110\) \+ \(6 × Bearing 100\), per tracker'\)/);
  assert.match(migration, /\('k001013', '= k001388 = 8 × Main Tube B'\)/);
  assert.match(migration, /\('FNF8180000A000', '2 × Main Post'\)/);
  assert.match(migration, /\('FNE8180000A000', '2 × Main Post'\)/);
  assert.match(migration, /calculation_note = 'PV Modules per Tracker × Number of Trackers'/);
  assert.doesNotMatch(migration, /Main Beam/i);
  assert.doesNotMatch(migration, /k001568|k001549/);
});

test('Part Master service caches one database load and resolves exact active post configurations', async () => {
  const rows = [
    {id:'1',part:'Main Post',tag:'k001152',description:'Main',category:'Steel Structure',active:true,post_kind:'Main Post',foundation_method:'Ramming',foundation_depth_mm:2000,profile_type:'HEA 140'},
    {id:'2',part:'Bearing Post',tag:'k001120',description:'Bearing',category:'Steel Structure',active:true,post_kind:'Bearing Post',foundation_method:'Ramming',foundation_depth_mm:2000,profile_type:'C'},
    {id:'3',part:'Old',tag:'old',description:'Old',category:'Steel Structure',active:false},
    {id:'4',part:'Tube Spacer',tag:'k001479',description:'M12 × 16 × 12.7 × 13.3',category:'Fasteners / Main Tube - Main Tube',active:true},
    {id:'5',part:'Limit Switch',tag:'k001393',part_number:'EAPZFR55100000',description:'Limit switch',category:'Electrical',active:true},
  ];
  let requests = 0;
  const query = {select(){requests += 1; return this;}, order(){return this;}, then(resolve){resolve({data:rows,error:null});}};
  const window = {LumaSupabase:{getClient:()=>({from:()=>query})}, LumaAuth:{isAdmin:()=>false}};
  vm.runInContext(read('part-master-service.js'), vm.createContext({window,console,Object,Array,String,Number,Map,Set,Error}));
  await window.LumaPartMasterService.loadPartMaster();
  await window.LumaPartMasterService.loadPartMaster();
  assert.equal(requests, 1);
  assert.equal(window.LumaPartMasterService.getAllParts().length, 5);
  assert.equal(window.LumaPartMasterService.getActiveParts().length, 4);
  assert.equal(window.LumaPartMasterService.getPartByTag('K001152').Part, 'Drive Pile');
  assert.equal(window.LumaPartMasterService.getPartByTag('K001479').Category, 'Fasteners / Main Tube - Main Tube');
  assert.equal(window.LumaPartMasterService.getPartByTag('K001393')['Part Number'], 'ELPZFR55100000');
  const match = window.LumaPartMasterService.findPostConfiguration({postKind:'Drive Pile',foundationMethod:'Ramming',foundationDepthMm:2000,profileType:'HEA 140'});
  assert.equal(match.status, 'found');
  assert.equal(match.part.TAG, 'k001152');
});

test('existing BOM quantities are preserved while known post TAGs resolve from data attributes', () => {
  const context = {globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('legacy/part-master-hardcoded-backup.js'), context);
  vm.runInContext(read('post-configuration-service.js'), context);
  vm.runInContext(read('engine.js'), context);
  const engine = context.globalThis.LumaEngine;
  const parts = engine.normalizePartMasterData(context.globalThis.INTERNAL_PART_MASTER_COLUMNS, context.globalThis.INTERNAL_PART_MASTER_RAW).rows;
  const project = {inputs:{...engine.DEFAULT_INPUTS}, tracker_quantities:engine.defaultTrackerQuantities(), bearing_rules:{}, manual_parts:engine.defaultManualParts(), soltrk_version:'2.0', bom_overrides:{}, equipment_quantity_overrides:{}};
  project.tracker_quantities['14'] = 1;
  const calculation = engine.calculateProject(project, parts, context.globalThis.INTERNAL_PART_MASTER_COLUMNS);
  assert.deepEqual(Array.from(calculation.engineeringErrors), []);
  assert.equal(calculation.bom.rows.find(row => row.TAG === 'k001152')['Total Qty'], 1);
  assert.equal(calculation.bom.rows.find(row => row.TAG === 'k001120')['Total Qty'], 2);
  project.inputs.drive_pile_depth_mm = '2300';
  const deeper = engine.calculateProject(project, parts, context.globalThis.INTERNAL_PART_MASTER_COLUMNS);
  assert.equal(deeper.bom.rows.find(row => row.TAG === 'k050376')['Total Qty'], 1);
  assert.equal(deeper.bom.rows.find(row => row.TAG === 'k001120')['Total Qty'], 2);
  project.inputs.bearing_pile_depth_mm = '2300';
  const bothDeeper = engine.calculateProject(project, parts, context.globalThis.INTERNAL_PART_MASTER_COLUMNS);
  assert.equal(bothDeeper.bom.rows.find(row => row.TAG === 'k060356')['Total Qty'], 2);
});

test('Part Master editor exists only inside Administration and supports deactivate/reactivate', () => {
  const html = read('index.html');
  const app = read('app.js');
  const admin = read('admin-part-master.js');
  const home = read('admin-suppliers.js');
  assert.doesNotMatch(html, /id="tabPartMaster"/);
  assert.doesNotMatch(app, /PART_MASTER_ADMIN_TAB|tabPartMaster|function renderPartMaster/);
  assert.match(app, /isAdmin\?\.\(\)\?\[\.\.\.TABS,ADMINISTRATION_TAB\]:TABS/);
  assert.match(home, /data-admin-page="part-master"/);
  assert.match(admin, /Reactivate Selected/);
  assert.match(admin, /setPartActive/);
  assert.match(admin, /key:'__number', label:'No\.'/);
  assert.match(admin, /data-pm-sort/);
  assert.match(admin, /data-pm-filter/);
  assert.match(admin, /label:'Material'/);
  assert.match(admin, /label:'Weight \(kg\)'/);
  assert.doesNotMatch(admin, /\.delete\(/);
});

test('Part Master add and edit form uses organized responsive field sections', () => {
  const html = read('index.html');
  const admin = read('admin-part-master.js');
  const styles = read('style.css');
  for (const heading of ['Part Identification', 'Material and Calculation Data', 'Post and Foundation Details', 'Record Status']) {
    assert.match(admin, new RegExp(heading));
  }
  assert.match(admin, /class="pm-form-field/);
  assert.match(admin, /class="pm-form-grid pm-form-grid-three"/);
  assert.match(admin, /class="pm-post-fields" data-pm-post-fields/);
  assert.match(admin, /class="part-master-form-actions"/);
  assert.match(styles, /\.part-master-form-shell/);
  assert.match(styles, /\.pm-form-grid-three/);
  assert.match(styles, /\.pm-post-fields\[hidden\]/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(html, /style\.css\?v=20260922-v4-10/);
  assert.match(html, /admin-part-master\.js\?v=20260917-pile-terminology/);
});
