'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
function loadEngine(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'engine.js'),'utf8'),context);
  return context.globalThis.LumaEngine;
}

test('each Hat and Z rail receives 1, 2, or 3 plates from its 120, 110, or 100 tube',()=>{
  const engine=loadEngine();
  const project={inputs:{...engine.DEFAULT_INPUTS}};
  const geometry={
    'Modules / North Side':3,'Modules / South Side':3,
    'Zone A End (120)':1000,'Zone B End (110)':2300,
    'Main Tube C End North from Midplane':4000,
    'Main Tube C End South from Midplane':4000,
  };
  const result=engine.calculateModuleSupportPlatesForTracker(project,{'PV Modules per Tracker':6},geometry);
  assert.deepEqual([...result['Rows North Side'].map(row=>row['Final Plates / Rail / Side'])],[1,2,3,3]);
  assert.deepEqual([...result['Rows South Side'].map(row=>row['Final Plates / Rail / Side'])],[1,2,3,3]);
  assert.equal(result['Rows North Side'][0]['Rail Type'],'Z Rail');
  assert.equal(result['Rows North Side'][3]['Rail Type'],'Z Rail');
  assert.equal(result['Module Support Plates / North Side'],9);
  assert.equal(result['Module Support Plates / South Side'],9);
  assert.equal(result['Module Support Plates / Tracker'],18);
  assert.match(result['Rows North Side'][2].Reason,/100 × 100 Torque Tube/);
  assert.equal(result.Rows.every(row=>row['Influence Bearing']===''),true);
});

test('outside rails receive no assumed plate and BOM multiplies the per-tracker total',()=>{
  const engine=loadEngine();
  const project={inputs:{...engine.DEFAULT_INPUTS}};
  const geometry={
    'Modules / North Side':3,'Modules / South Side':3,
    'Zone A End (120)':1000,'Zone B End (110)':2300,
    'Main Tube C End North from Midplane':4000,
    'Main Tube C End South from Midplane':3000,
  };
  const result=engine.calculateModuleSupportPlatesForTracker(project,{'PV Modules per Tracker':6},geometry);
  assert.equal(result['Rows South Side'][3]['Beam Zone'],'Outside');
  assert.equal(result['Rows South Side'][3]['Final Plates / Rail / Side'],0);
  assert.equal(result['Module Support Plates / Tracker'],15);
  const definition=engine.BOM_DEFINITIONS.find(item=>item[0]==='Module Rail Support Plate');
  assert.equal(definition[1]({'Module Support Plates / Tracker':15,'Number of Trackers':2}),30);
  assert.match(definition[4],/3 plates on 100 × 100 Torque Tube/);
});

test('the new Part Master migration records the same rule for K001099',()=>{
  const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260922002400_update_module_rail_support_plate_note.sql'),'utf8');
  assert.match(migration,/where lower\(btrim\(tag\)\) = 'k001099'/);
  assert.match(migration,/3 plates on 100 × 100 Torque Tube, 2 on 110 × 110, 1 on 120 × 120/);
});
