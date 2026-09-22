'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadEngine(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('engine.js'),context,{filename:'engine.js'});
  return context.globalThis.LumaEngine;
}

test('PV module longitudinal holes are compatible when any entered distance is 400 or 790 mm',()=>{
  const engine=loadEngine();
  const fourHundred=engine.moduleRailCompatibility({inputs:{pv_module_longitudinal_hole_distance_1:'350',pv_module_longitudinal_hole_distance_2:'400',pv_module_longitudinal_hole_distance_3:''}});
  const sevenNinety=engine.moduleRailCompatibility({inputs:{pv_module_longitudinal_hole_distance_1:'350',pv_module_longitudinal_hole_distance_2:'790',pv_module_longitudinal_hole_distance_3:'1200'}});
  const both=engine.moduleRailCompatibility({inputs:{pv_module_longitudinal_hole_distance_1:'790',pv_module_longitudinal_hole_distance_2:'400',pv_module_longitudinal_hole_distance_3:'400'}});
  assert.equal(fourHundred.compatible,true);
  assert.deepEqual([...fourHundred.compatibleDistances],[400]);
  assert.equal(sevenNinety.compatible,true);
  assert.deepEqual([...sevenNinety.compatibleDistances],[790]);
  assert.equal(both.compatible,true);
  assert.deepEqual([...both.compatibleDistances],[400,790]);
  assert.equal(engine.moduleRailCompatibility({inputs:{pv_module_longitudinal_hole_distance_1:'350',pv_module_longitudinal_hole_distance_2:'600',pv_module_longitudinal_hole_distance_3:''}}).compatible,false);
  assert.equal(engine.moduleRailCompatibility({inputs:{}}).compatible,false);
});

test('Hat Rail clearance identifies the exact adjacent PV modules for overlap and Bearing Pile conflicts',()=>{
  const engine=loadEngine();
  const project={inputs:{...engine.DEFAULT_INPUTS,overlap_ab:'270',overlap_bc:'270'}};
  const geometry={
    'Tracker Type':'Long',
    'First Piece Name':'Torque Tube A',
    'Zone A End (120)':1000,
    'Zone B End (110)':2000,
    'Main Tube C Required Length North':500,
    'Main Tube C Required Length South':0,
  };
  const rails=[
    {'Rail No.':1,Side:'North','Rail Type':'Z Rail','Distance from Mid Plane (mm)':700,'Signed Distance from Mid Plane (mm)':700,'Beam Zone':'A / 120'},
    {'Rail No.':2,Side:'North','Rail Type':'Hat Rail','Distance from Mid Plane (mm)':700,'Signed Distance from Mid Plane (mm)':700,'Beam Zone':'A / 120'},
    {'Rail No.':3,Side:'North','Rail Type':'Hat Rail','Distance from Mid Plane (mm)':1200,'Signed Distance from Mid Plane (mm)':1200,'Beam Zone':'B / 110'},
    {'Rail No.':2,Side:'South','Rail Type':'Hat Rail','Distance from Mid Plane (mm)':500,'Signed Distance from Mid Plane (mm)':-500,'Beam Zone':'A / 120'},
  ];
  const bearings=[
    {Side:'North','Pair No.':1,'Distance from Main Post (mm)':1260},
    {Side:'South','Pair No.':1,'Distance from Main Post (mm)':-300},
  ];
  const result=engine.calculateHatRailInstallationClearances(project,geometry,bearings,rails);
  const northFirst=result.Rows.find(row=>row.Side==='North'&&row['Rail Type']==='Hat Rail'&&row['Hat Rail No.']===1);
  const northSecond=result.Rows.find(row=>row.Side==='North'&&row['Rail Type']==='Hat Rail'&&row['Hat Rail No.']===2);
  const southFirst=result.Rows.find(row=>row.Side==='South'&&row['Rail Type']==='Hat Rail');
  const northZ=result.Rows.find(row=>row['Rail Type']==='Z Rail');

  assert.equal(northFirst['Overlap Clearance (mm)'],30);
  assert.equal(northFirst['Clearance Status'],'Warning');
  assert.match(northFirst['Clearance Warning'],/North Hat Rail 1 \(between PV Modules N1 and N2\)/);
  assert.match(northFirst['Clearance Warning'],/minimum 50 mm/);
  assert.equal(northSecond['Bearing Pile Clearance (mm)'],60);
  assert.match(northSecond['Clearance Warning'],/North Bearing Pile 1/);
  assert.match(northSecond['Clearance Warning'],/minimum 100 mm/);
  assert.equal(southFirst['Clearance Status'],'OK');
  assert.equal(northZ['Clearance Status'],undefined,'Z Rails are not part of the Hat Rail clearance rule');
  assert.equal(result.Violations.length,2);
  assert.equal(result.Status,'Warning');
});

test('exact minimum clearances of 50 mm and 100 mm pass',()=>{
  const engine=loadEngine();
  const project={inputs:{...engine.DEFAULT_INPUTS,overlap_ab:'270',overlap_bc:'270'}};
  const geometry={'Tracker Type':'Long','First Piece Name':'Torque Tube A','Zone A End (120)':1000,'Zone B End (110)':2000,'Main Tube C Required Length North':0,'Main Tube C Required Length South':0};
  const rails=[{'Rail No.':2,Side:'North','Rail Type':'Hat Rail','Distance from Mid Plane (mm)':680,'Signed Distance from Mid Plane (mm)':680,'Beam Zone':'A / 120'}];
  const bearings=[{Side:'North','Pair No.':1,'Distance from Main Post (mm)':580}];
  const result=engine.calculateHatRailInstallationClearances(project,geometry,bearings,rails);
  assert.equal(result.Rows[0]['Overlap Clearance (mm)'],50);
  assert.equal(result.Rows[0]['Bearing Pile Clearance (mm)'],100);
  assert.equal(result.Status,'OK');
});

test('Tracker Sketch and Inputs render the requested clearance and compatibility messages',()=>{
  const app=read('app.js'),styles=read('style.css');
  const start=app.indexOf('function moduleRailCompatibilityMarkup(');
  const end=app.indexOf('function longitudinalHoleDistanceInputRow(',start);
  const context={E:loadEngine()};
  vm.createContext(context);
  vm.runInContext(`${app.slice(start,end)};this.markup=moduleRailCompatibilityMarkup;`,context);
  const project=(first,second,third)=>({inputs:{pv_module_longitudinal_hole_distance_1:first,pv_module_longitudinal_hole_distance_2:second,pv_module_longitudinal_hole_distance_3:third}});
  assert.match(context.markup(project('350','','')),/>Not Compatible<\/strong>/);
  assert.doesNotMatch(context.markup(project('350','','')),/Enter 400 or 790/);
  assert.match(context.markup(project('400','','')),/>Compatible with 400 mm<\/strong>/);
  assert.match(context.markup(project('790','','')),/>Compatible with 790 mm<\/strong>/);
  assert.match(context.markup(project('790','400','')),/>Compatible with 400 and 790 mm<\/strong>/);
  assert.match(app,/longitudinal-hole-distance-row/);
  assert.doesNotMatch(app,/module-rail-compatibility-row/);
  assert.match(app,/Hat Rail installation clearance warning/);
  assert.match(app,/Hat Rail Installation Check/);
  assert.match(app,/Closest Torque Tube Overlap \/ Gap/);
  assert.match(styles,/\.module-rail-compatibility\.compatible/);
  assert.match(styles,/\.module-rail-compatibility\.incompatible/);
  assert.match(styles,/278px\s+minmax\(130px, 556px\)/);
  assert.match(styles,/\.sketch-clearance-status\.warning/);
});
