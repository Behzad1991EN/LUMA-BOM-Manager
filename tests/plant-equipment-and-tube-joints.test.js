'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

function loadEngineAndParts(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('legacy/part-master-hardcoded-backup.js'),context);
  vm.runInContext(read('engine.js'),context);
  const engine=context.globalThis.LumaEngine;
  const parts=engine.normalizePartMasterData(context.globalThis.INTERNAL_PART_MASTER_COLUMNS,context.globalThis.INTERNAL_PART_MASTER_RAW).rows;
  parts.push({Part:'SOLTRK 3.0 Internal Plate',TAG:'k001579',Description:'SOLTRK 3.0 Internal Plate',Category:'Steel Structure / Substructure',Unit:'pcs'});
  parts.push({Part:'SOLTRK 3.0 Logo Plate',TAG:'k001569',Description:'SOLTRK 3.0 Logo Plate',Category:'Steel Structure / Substructure',Unit:'pcs'});
  return {engine,parts,columns:context.globalThis.INTERNAL_PART_MASTER_COLUMNS};
}

const scheduleRow=(pv,trackers,{type='Long',north=0,south=0}={})=>({
  'PV Modules per Tracker':pv,'Number of Trackers':trackers,'Tracker Type':type,
  'Main Tube C Required Length North':north,'Main Tube C Required Length South':south,
  'Main Tube C Stock Suggestion North':north?'11800':'Not required',
  'Main Tube C Stock Suggestion South':south?'11800':'Not required',
  'Bearing Posts / Tracker':2,_schedule_key:`${pv}:test`,
});
const totalFor=(bom,tag)=>Number(bom.rows.find(row=>row.TAG===tag)?.['Total Qty']??0);

test('plant electrical defaults round once over all trackers, then distribute without inventing extra units',()=>{
  const {engine}=loadEngineAndParts();
  const rows=[scheduleRow(14,10),scheduleRow(20,10)];
  const allocation=engine.equipmentQuantityAllocation({equipment_quantity_overrides:{}},rows);
  for(const item of engine.PLANT_ELECTRICAL_ITEMS){
    assert.equal(allocation.plantAutomaticByKey[item.key],1,item.key);
    assert.equal(allocation.plantTotalsByKey[item.key],1,item.key);
    assert.equal(Object.values(allocation.plantByKey[item.key]).reduce((sum,value)=>sum+value,0),1,item.key);
  }
  const threshold=engine.equipmentQuantityAllocation({equipment_quantity_overrides:{}},[scheduleRow(14,49),scheduleRow(20,52)]);
  assert.equal(threshold.plantAutomaticByKey.k001405,3);
  assert.equal(threshold.plantAutomaticByKey.k001525,2);
});

test('project overrides accept zero and exact whole-plant totals while SOLTRK allocation stays independent',()=>{
  const {engine}=loadEngineAndParts();
  const overrides={soltrk:5,k001405:0,k001406:4,k001542:2,anemometer:3,k001552:0,k001525:7};
  const rows=[scheduleRow(14,10),scheduleRow(20,10)];
  const allocation=engine.equipmentQuantityAllocation({equipment_quantity_overrides:overrides},rows);
  for(const [key,total] of Object.entries(overrides)){
    if(key==='soltrk')assert.equal(allocation.soltrk,total);
    else assert.equal(allocation.plantTotalsByKey[key],total,key);
  }
  assert.equal(allocation.automaticSoltrk,10);
  assert.equal(allocation.automaticJunctionBox,10);
  const {parts,columns}=loadEngineAndParts();
  const project={inputs:{...engine.DEFAULT_INPUTS},soltrk_version:'2.0',equipment_quantity_overrides:overrides,manual_parts:{}};
  const bom=engine.buildProjectBom(project,rows,parts,columns);
  assert.equal(totalFor(bom,'k001405'),0);
  assert.ok(bom.rows.some(row=>row.TAG==='k001405'),'a zero override stays visible in the BOM');
});

test('SOLTRK 3.0 consumes each plate once, and plant electrical BOM rows use project totals',()=>{
  const {engine,parts,columns}=loadEngineAndParts();
  const project={inputs:{...engine.DEFAULT_INPUTS},soltrk_version:'3.0',equipment_quantity_overrides:{soltrk:5},manual_parts:{}};
  const rows=[scheduleRow(14,10),scheduleRow(20,10)];
  const bom=engine.buildProjectBom(project,rows,parts,columns);
  for(const tag of ['k001579','k001568','k001569'])assert.equal(totalFor(bom,tag),5,tag);
  for(const tag of ['k001405','k001406','k001542','k001596','k001552','k001525'])assert.equal(totalFor(bom,tag),1,tag);
  assert.equal(totalFor(bom,'k001538'),1);
  assert.equal(totalFor(bom,'k001539'),3);
  project.soltrk_version='2.0';
  const version2=engine.buildProjectBom(project,rows,parts,columns);
  for(const tag of ['k001579','k001568','k001569'])assert.equal(totalFor(version2,tag),0,tag);
  assert.equal(totalFor(version2,'k001505'),5);
});

test('anemometer override follows the existing elevation-selected part',()=>{
  const {engine,parts,columns}=loadEngineAndParts();
  const project={inputs:{...engine.DEFAULT_INPUTS,elevation_asl:'400'},soltrk_version:'2.0',equipment_quantity_overrides:{anemometer:3},manual_parts:{}};
  const bom=engine.buildProjectBom(project,[scheduleRow(14,10)],parts,columns);
  assert.equal(totalFor(bom,'k001536'),3);
  assert.equal(totalFor(bom,'k001596'),0);
  assert.equal(totalFor(bom,'k001538'),3);
  assert.equal(totalFor(bom,'k001539'),9);
});

test('k001388 counts four fasteners per active tube joint and linked items follow it',()=>{
  const {engine,parts,columns}=loadEngineAndParts();
  const rows=[
    scheduleRow(14,1,{type:'Long'}),
    scheduleRow(20,1,{type:'Short',north:1000}),
    scheduleRow(26,1,{type:'Long',north:1000,south:1000}),
  ];
  assert.deepEqual(rows.map(row=>engine.torqueTubeJointCountForRow(row)),[2,3,4]);
  const project={inputs:{...engine.DEFAULT_INPUTS},soltrk_version:'2.0',equipment_quantity_overrides:{},manual_parts:{}};
  const bom=engine.buildProjectBom(project,rows,parts,columns);
  assert.equal(totalFor(bom,'k001388'),36);
  assert.equal(totalFor(bom,'k001157'),72);
  assert.equal(totalFor(bom,'k001013'),36);
  assert.equal(totalFor(bom,'k001479'),72);
});

test('migration defines SOLTRK plates by TAG and updates existing descriptions without changing pricing',()=>{
  const migration=read('supabase/migrations/20260917002200_soltrk_plates_and_plant_equipment.sql');
  for(const [tag,name] of [['k001579','SOLTRK 3.0 Internal Plate'],['k001568','SOLTRK 3.0 External Plate'],['k001569','SOLTRK 3.0 Logo Plate']]){
    assert.ok(migration.includes(tag));
    assert.ok(migration.includes(name));
  }
  assert.match(migration,/Steel Structure \/ Substructure/);
  assert.doesNotMatch(migration,/unit_price\s*=/);
  const app=read('app.js');
  assert.match(app,/E\.PLANT_ELECTRICAL_ITEMS\.map/);
  assert.match(app,/bindOverride\(`bomPlant_\$\{item\.key\}`/);
  assert.match(app,/E\.torqueTubeJointCountForRow\(row\)/);
});
