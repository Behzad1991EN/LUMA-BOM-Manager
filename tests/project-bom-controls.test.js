'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function loadEngine() {
  const context = {globalThis: {}};
  vm.createContext(context);
  vm.runInContext(read('engine.js'), context, {filename: 'engine.js'});
  return context.globalThis.LumaEngine;
}

test('Project BOM equipment controls expose automatic totals without changing allocation logic', () => {
  const engine = loadEngine();
  const rows = [
    {'PV Modules per Tracker': 14, 'Number of Trackers': 3, _schedule_key: '14:a'},
    {'PV Modules per Tracker': 20, 'Number of Trackers': 4, _schedule_key: '20:a'},
  ];
  const automatic = engine.equipmentQuantityAllocation({equipment_quantity_overrides: {}}, rows);
  assert.equal(automatic.automaticSoltrk, 4);
  assert.equal(automatic.automaticJunctionBox, 3);
  assert.equal(automatic.soltrk, 4);
  assert.equal(automatic.junctionBox, 3);

  const overridden = engine.equipmentQuantityAllocation({equipment_quantity_overrides: {soltrk: 7, junction_box: 5}}, rows);
  assert.equal(overridden.automaticSoltrk, 4);
  assert.equal(overridden.automaticJunctionBox, 3);
  assert.equal(overridden.soltrk, 7);
  assert.equal(overridden.junctionBox, 5);
  assert.equal(Object.values(overridden.soltrkByPv).reduce((sum, value) => sum + value, 0), 7);
  assert.equal(Object.values(overridden.junctionBoxByPv).reduce((sum, value) => sum + value, 0), 5);
});

test('Project BOM uses grouped controls, dedicated overrides, and no editable table quantity', () => {
  const app = read('app.js');
  assert.match(app, /function bomProjectSettingsHtml\(project,allocation\)/);
  assert.match(app, /placeholder="Auto \(\$\{escapeHtml\(allocation\.automaticSoltrk\)\}\)"/);
  assert.match(app, /placeholder="Auto \(\$\{escapeHtml\(allocation\.automaticJunctionBox\)\}\)"/);
  assert.match(app, /bindOverride\('bomSoltrkOverride','soltrk','SOLTRK'\)/);
  assert.match(app, /bindOverride\('bomJunctionBoxOverride','junction_box','Junction Box'\)/);
  assert.match(app, /non-negative whole number/);
  assert.doesNotMatch(app, /function editBomCell|bom-editable-cell|bom-cell-input/);
});

test('Project BOM selected rows match the VEON highlighted and keyboard-accessible behavior', () => {
  const app = read('app.js');
  const styles = read('style.css');
  assert.match(app, /table\.classList\.add\('bom-table'\)/);
  assert.match(app, /tr\.tabIndex=0/);
  assert.match(app, /tr\.setAttribute\('aria-selected'/);
  assert.match(app, /classList\.toggle\('is-selected'/);
  assert.match(app, /event\.key==='Enter'\|\|event\.key===' '/);
  assert.match(styles, /\.bom-table tbody tr\.is-selected/);
  assert.match(styles, /background: var\(--accent\) !important/);
  assert.match(styles, /color: #FFF/);
});

test('browser assets share the current release cache token', () => {
  const html = read('index.html');
  for (const asset of ['style.css', 'engine.js', 'app.js']) {
    assert.match(html, new RegExp(`${asset.replace('.', '\\.')}\\?v=20260929-torque-tube-cut-lengths`));
  }
});

test('estimation-mode Reset restores the default Max Span Length', () => {
  const engine = loadEngine();
  const app = read('app.js');
  assert.equal(engine.DEFAULT_INPUTS.max_span_length, '7900');
  assert.match(app, /id="estMaxSpanReset"/);
  assert.match(app, /p\.inputs\.max_span_length=E\.DEFAULT_INPUTS\.max_span_length;markDirty\(\);refreshOutputsOnly\(\);renderBearingConfig\(\)/);
  const project = {inputs:{cad_blocks_available:'No',max_span_length:'9000'}};
  assert.equal(engine.getSpanLimits(project)[2], 24300);
  project.inputs.max_span_length = engine.DEFAULT_INPUTS.max_span_length;
  assert.equal(engine.getSpanLimits(project)[2], 21330);
});

test('Array Table shows Number of Trackers as read-only and leaves zero quantities blank',()=>{
  const app=read('app.js');
  assert.match(app,/trackerQuantity>0\?trackerQuantity:''/);
  assert.match(app,/Tracker quantities are managed in Inputs under Bearing Pile Distance by Array Type/);
  assert.doesNotMatch(app,/function editArrayQtyCell/);
});

test('pile contingency applies only to Drive Pile and Bearing Pile totals',()=>{
  const engine=loadEngine(),project={
    inputs:{...engine.DEFAULT_INPUTS},manual_parts:{},soltrk_version:'3.0',equipment_quantity_overrides:{},
    contingency_enabled:false,fastener_contingency_percent:0,pile_contingency_enabled:true,pile_contingency_percent:10,bom_metadata_enabled:true,
  };
  const schedule=[{'PV Modules per Tracker':20,'Number of Trackers':2,'Bearing Posts / Tracker':3,'Module Support Plates / Tracker':0,'Bearing 100 / Tracker':0,'Bearing 110 / Tracker':0,'Bearing 120 / Tracker':0,'Tracker Type':'Short','Main Tube C Required Length North':0,'Main Tube C Required Length South':0,_schedule_key:'20:default'}];
  const parts=[
    {Part:'Drive Pile',TAG:'k050346',Description:'Drive pile',Category:'Steel Structure / Post',Unit:'pcs'},
    {Part:'Bearing Pile',TAG:'k060326',Description:'Bearing pile',Category:'Steel Structure / Post',Unit:'pcs'},
    {Part:'Bearing Adapter',TAG:'k001119',Description:'Bearing adapter',Category:'Steel Structure / Substructure',Unit:'pcs'},
  ];
  const result=engine.buildProjectBom(project,schedule,parts,engine.PART_COLUMNS),byName=name=>result.rows.find(row=>row['Part Name']===name);
  assert.equal(byName('Drive Pile')['Total Qty'],3);
  assert.equal(byName('Bearing Pile')['Total Qty'],7);
  assert.equal(byName('Bearing Adapter')['Total Qty'],6);
  assert.equal(byName('Drive Pile')['Contingency (%)'],10);
  assert.equal(byName('Bearing Adapter')['Contingency (%)'],0);
});

test('new projects default to SOLTRK 3.0 while explicit 2.0 remains supported',()=>{
  const engine=loadEngine(),app=read('app.js');
  assert.equal(engine.normalizeSoltrkVersion(undefined),'3.0');
  assert.equal(engine.normalizeSoltrkVersion('2.0'),'2.0');
  assert.match(app,/soltrk_version:'3\.0'/);
  assert.match(app,/p\.soltrk_version='3\.0'/);
});

test('Module Rail Elevation Plate is optional, excluded by default, and keeps its existing quantity formula',()=>{
  const engine=loadEngine();
  const project={
    inputs:{...engine.DEFAULT_INPUTS},manual_parts:{},soltrk_version:'3.0',equipment_quantity_overrides:{},
    contingency_enabled:false,pile_contingency_enabled:false,bom_metadata_enabled:true,
    module_rail_elevation_plate_included:false,
  };
  const schedule=[{'PV Modules per Tracker':20,'Number of Trackers':3,'Bearing 100 / Tracker':2,'Bearing 110 / Tracker':0,'Bearing 120 / Tracker':0,'Bearing Posts / Tracker':2,'Module Support Plates / Tracker':0,'Tracker Type':'Short','Main Tube C Required Length North':0,'Main Tube C Required Length South':0,_schedule_key:'20:default'}];
  const parts=[{Part:'Module Rail Elevation Plate',TAG:'k001573',Description:'PV rail raiser',Category:'Steel Structure / Substructure',Unit:'pcs'}];
  const excluded=engine.buildProjectBom(project,schedule,parts,engine.PART_COLUMNS);
  assert.equal(excluded.rows.some(row=>row.TAG==='k001573'),false);
  project.module_rail_elevation_plate_included=true;
  const included=engine.buildProjectBom(project,schedule,parts,engine.PART_COLUMNS);
  assert.equal(included.rows.find(row=>row.TAG==='k001573')['Total Qty'],12);
  const app=read('app.js');
  assert.match(app,/module_rail_elevation_plate_included:false/);
  assert.match(app,/id="bomModuleRailElevationPlate"/);
  assert.match(app,/project\.module_rail_elevation_plate_included=event\.target\.checked/);
});

test('array types start at 12 PV modules and continue through 56 with unchanged scheduling',()=>{
  const engine=loadEngine(),quantities=engine.defaultTrackerQuantities();
  assert.deepEqual(Object.keys(quantities),Array.from({length:45},(_,index)=>String(index+12)));
  const schedule=engine.buildSchedule({inputs:{...engine.DEFAULT_INPUTS},tracker_quantities:quantities,bearing_rules:{}});
  assert.equal(schedule.length,45);
  assert.equal(schedule[0]['PV Modules per Tracker'],12);
  assert.equal(schedule.at(-1)['PV Modules per Tracker'],56);
  const app=read('app.js');
  assert.match(app,/Array\.from\(\{length:45\},\(_,i\)=>i\+12\)/);
  assert.match(app,/customRule:\{pv:'12'/);
});

test('Selected Arrays shows Torque Tube B and exact plus upward-rounded Torque Tube C cut lengths',()=>{
  const engine=loadEngine(),project={inputs:{...engine.DEFAULT_INPUTS}};
  assert.equal(engine.roundUpToTenMm(4221),4230);
  assert.equal(engine.roundUpToTenMm(5687),5690);
  assert.equal(engine.roundUpToTenMm(5690),5690);
  const geometry=engine.calculateTrackerGeometry(project,22);
  assert.equal(geometry['Torque Tube B Length (mm)'],Number(engine.DEFAULT_INPUTS.main_beam_b_length));
  assert.equal(geometry['Torque Tube C Exact Cut Length (mm)'],geometry['Main Tube C Required Length']);
  assert.equal(geometry['Torque Tube C Rounded Cut Length (mm)']%10,0);
  assert.ok(geometry['Torque Tube C Rounded Cut Length (mm)']>=geometry['Torque Tube C Exact Cut Length (mm)']);
  assert.ok(geometry['Torque Tube C Rounded Cut Length (mm)']-geometry['Torque Tube C Exact Cut Length (mm)']<10);
  const app=read('app.js');
  assert.match(app,/SELECTED_ARRAY_COLUMNS[\s\S]*'Torque Tube B Length \(mm\)'/);
  assert.match(app,/SELECTED_ARRAY_COLUMNS[\s\S]*'Torque Tube C Exact Cut Length \(mm\)'/);
  assert.match(app,/SELECTED_ARRAY_COLUMNS[\s\S]*'Torque Tube C Rounded Cut Length \(mm\)'/);
  assert.match(app,/Exact: \$\{displayValue\(r\['Torque Tube C Exact Cut Length \(mm\)'\]\)\} \/ Rounded:/);
});
