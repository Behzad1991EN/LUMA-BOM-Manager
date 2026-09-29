'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

function loadEngine(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('engine.js'),context,{filename:'engine.js'});
  return context.globalThis.LumaEngine;
}

test('asymmetrical rules support independent North and South Bearing Pile counts',()=>{
  const engine=loadEngine();
  const rule=engine.normalizeBearingRule({
    mode:'Asymmetrical',
    asym_north_post_count:3,
    asym_south_post_count:1,
    asym_north_gaps:[8000,7000,6000],
    asym_south_gaps:[7500,0,0],
  });
  const rows=engine.getPositionsFromRule(rule,0,{});
  assert.equal(rule.asym_north_post_count,3);
  assert.equal(rule.asym_south_post_count,1);
  assert.deepEqual([...rows.map(row=>[row.Side,row['Distance from Main Post (mm)']])],[
    ['North',8000],['North',15000],['North',21000],['South',-7500],
  ]);
  assert.equal(new Set(rows.map(row=>row['Distance from Main Post (mm)'])).size,rows.length);
});

test('legacy asymmetrical rules infer separate side counts from trailing zero distances',()=>{
  const engine=loadEngine();
  const rule=engine.normalizeBearingRule({mode:'Asymmetrical',asym_post_count:3,asym_north_gaps:[8000,7000,0],asym_south_gaps:[7500,0,0]});
  assert.equal(rule.asym_north_post_count,2);
  assert.equal(rule.asym_south_post_count,1);
  const rows=engine.getPositionsFromRule(rule,0,{});
  assert.deepEqual([...rows.map(row=>[row.Side,row['Distance from Main Post (mm)']])],[['North',8000],['North',15000],['South',-7500]]);
});

test('estimation mode identifies 5000–9000 mm as standard and uses the actual out-of-range span for pile quantity',()=>{
  const engine=loadEngine();
  for(const value of [5000,7900,9000])assert.equal(engine.getSpanLengthStatus({inputs:{max_span_length:value}}).standard,true);
  for(const value of [4999,9001])assert.equal(engine.getSpanLengthStatus({inputs:{max_span_length:value}}).standard,false);
  const project={inputs:{...engine.DEFAULT_INPUTS,cad_blocks_available:'No',max_span_length:'4500'}};
  const geometry={'Tracker Length (mm)':30000,'Zone A End (120)':5000,'Zone B End (110)':15000,'Main Tube C End North from Midplane':20000,'Main Tube C End South from Midplane':20000};
  const result=engine.calculateBearingLayoutForTracker(project,{'PV Modules per Tracker':20},geometry);
  assert.equal(result['Bearing Posts / Tracker'],6);
  assert.equal(result['Span Type'],'6-Span');
  assert.equal(result['Bearing Status'],'NON-Standard Configuration');
  assert.deepEqual([...result.Rows.map(row=>row['Gap from Previous (mm)'])],[4500,4500,4500,4500,4500,4500]);
});

test('estimation mode continues symmetrical Bearing Piles beyond eight when the entered distance requires them',()=>{
  const engine=loadEngine(),project={inputs:{...engine.DEFAULT_INPUTS,cad_blocks_available:'No',max_span_length:'3000'}};
  const geometry={'Tracker Length (mm)':30000,'Zone A End (120)':5000,'Zone B End (110)':15000,'Main Tube C End North from Midplane':20000,'Main Tube C End South from Midplane':20000};
  const result=engine.calculateBearingLayoutForTracker(project,{'PV Modules per Tracker':20},geometry);
  assert.equal(engine.estimateSpanCountForLength(project,30000),10);
  assert.equal(result['Bearing Posts / Tracker'],10);
  assert.equal(result['Span Type'],'10-Span');
  assert.equal(result['Bearing Status'],'NON-Standard Configuration');
  assert.deepEqual([...result.Rows.map(row=>row['Distance from Main Post (mm)'])],[3000,-3000,6000,-6000,9000,-9000,12000,-12000,15000,-15000]);
  assert.equal(result.Rows.every(row=>row.Status==='OK'),true);
});

test('Bearing Pile UI exposes separate asymmetrical counts and red non-standard span feedback',()=>{
  const app=read('app.js'),styles=read('style.css');
  assert.match(app,/Number of North Bearing Piles/);
  assert.match(app,/Number of South Bearing Piles/);
  assert.match(app,/id="crAsymNorthCount"/);
  assert.match(app,/id="crAsymSouthCount"/);
  assert.match(app,/min="\$\{spanStatus\.min\}" max="\$\{spanStatus\.max\}"/);
  assert.match(app,/NON-Standard Configuration/);
  assert.match(styles,/\.bearing-span-warning/);
  assert.match(styles,/color:\s*#A71919/);
});

test('a selected array configuration can override Motor Gap without changing other array types',()=>{
  const engine=loadEngine(),project={
    inputs:{...engine.DEFAULT_INPUTS,cad_blocks_available:'Yes',motor_gap:'400'},
    tracker_quantities:engine.defaultTrackerQuantities(),
    bearing_rules:{
      '20':{symmetrical:{mode:'Symmetrical',quantity:2,symmetrical_distance:8000,motor_gap_override_enabled:true,motor_gap:760}},
    },
  };
  const schedule=engine.buildSchedule(project),array20=schedule.find(row=>row['PV Modules per Tracker']===20),array21=schedule.find(row=>row['PV Modules per Tracker']===21);
  assert.equal(array20['Motor Gap (mm)'],760);
  assert.equal(array20['Motor Gap Source'],'Array Override');
  assert.equal(array21['Motor Gap (mm)'],400);
  assert.equal(array21['Motor Gap Source'],'Project Input');
  assert.equal(array20._module_support_rows[0]['Distance from Mid Plane (mm)'],array21._module_support_rows[0]['Distance from Mid Plane (mm)']+180);
});

test('Bearing Pile UI stores an optional per-array Motor Gap',()=>{
  const app=read('app.js');
  assert.match(app,/id="crMotorGapEnabled"/);
  assert.match(app,/Use a different Motor Gap for this array type/);
  assert.match(app,/motor_gap_override_enabled:r\.motor_gap_override_enabled===true/);
  assert.match(app,/Array Motor Gap must be zero or a positive number/);
  assert.doesNotMatch(app,/36-PV.*motor|motor.*36-PV/i);
});
