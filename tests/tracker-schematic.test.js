'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadSchematic(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('tracker-schematic.js'),context,{filename:'tracker-schematic.js'});
  return context.globalThis.LumaTrackerSchematic;
}

function loadEngine(){
  const context={globalThis:{}};
  vm.createContext(context);
  vm.runInContext(read('engine.js'),context,{filename:'engine.js'});
  return context.globalThis.LumaEngine;
}

function sample(){
  return {
    project:{inputs:{pv_module_width:'1134',pv_module_length:'2384',pv_module_gap:'19',motor_gap:'400',target_end_gap:'50'}},
    row:{
      'PV Modules per Tracker':5,
      'Modules / North Side':3,
      'Modules / South Side':2,
      'Tracker Length (mm)':6203,
      'Main Tube C End North from Midplane':3621,
      'Main Tube C End South from Midplane':2582,
      'First Piece Name':'Torque Tube A',
      'First Piece Length':900,
      'Zone A End (120)':1000,
      'Zone B End (110)':2200,
      'Overlap A/B (mm)':100,
      'Overlap B/C (mm)':100,
      'Main Tube C Start from Midplane':2100,
      'Main Tube C Required Length North':1521,
      'Main Tube C Required Length South':482,
      'Bearing Rule Mode':'Asymmetrical',
      'Bearing Rule Source':'Custom',
      _module_support_rows:[
        {Side:'North','Rail Type':'Z Rail','Signed Distance from Mid Plane (mm)':520},
        {Side:'North','Rail Type':'Hat Rail','Signed Distance from Mid Plane (mm)':1650},
        {Side:'South','Rail Type':'Z Rail','Signed Distance from Mid Plane (mm)':-520},
      ],
      _bearing_rows:[
        {Side:'North','Pair No.':1,'Distance from Main Post (mm)':2200,'Bearing Type':'Bearing 120'},
        {Side:'South','Pair No.':1,'Distance from Main Post (mm)':-1800,'Bearing Type':'Bearing 120'},
      ],
    },
  };
}

test('top-view model uses project inputs and calculated asymmetric tracker geometry',()=>{
  const schematic=loadSchematic(),{project,row}=sample(),model=schematic.buildTopViewModel(project,row);
  assert.equal(model.modules.length,5);
  assert.equal(model.northModules,3);
  assert.equal(model.southModules,2);
  assert.equal(model.moduleWidth,1134);
  assert.equal(model.moduleLength,2384);
  assert.equal(model.moduleGap,19);
  assert.equal(model.motorGap,400);
  assert.equal(model.trackerLength,6203);
  assert.deepEqual(Array.from(model.bearingSegments,segment=>segment.distance),[2200,1800]);
  assert.deepEqual(Array.from(model.pileSegments,segment=>segment.distance),[2200,1800]);
  assert.deepEqual(Array.from(model.tubeSegments,segment=>segment.distance),[900,1300,1521,900,1300,482]);
  assert.deepEqual(Array.from(model.tubeSegments,segment=>segment.profile),[120,110,100,120,110,100]);
  assert.equal(model.modules.find(item=>item.label==='N1').y1,200);
  assert.equal(model.modules.find(item=>item.label==='S1').y2,-200);
});

test('top-view model uses calculated required sides when estimation tracker length differs from CAD stock ends',()=>{
  const schematic=loadSchematic(),{project,row}=sample();
  row['Tracker Length (mm)']=6000;row['Main Tube C End North from Midplane']=5000;row['Main Tube C End South from Midplane']=5000;row['Required North Side']=3400;row['Required South Side']=2600;
  const model=schematic.buildTopViewModel(project,row);
  assert.equal(model.northEnd,3400);
  assert.equal(model.southEnd,2600);
  assert.equal(model.northEnd+model.southEnd,model.trackerLength);
});

test('48-PV schematic uses the calculated 120, 110, and 100 torque-tube members instead of one continuous tube',()=>{
  const engine=loadEngine(),schematic=loadSchematic(),project={inputs:{...engine.DEFAULT_INPUTS,cad_blocks_available:'Yes'}},row={...engine.calculateTrackerGeometry(project,48),'PV Modules per Tracker':48};
  const model=schematic.buildTopViewModel(project,row),north=model.tubeSegments.filter(segment=>segment.side==='North');
  assert.deepEqual(Array.from(north,segment=>segment.profile),[120,110,100]);
  assert.deepEqual(Array.from(north,segment=>segment.distance),[9800,11500,7063]);
  const svg=schematic.buildTopViewSvg(model);
  assert.match(svg,/data-torque-tube="A" data-profile="120"/);
  assert.match(svg,/data-torque-tube="B" data-profile="110"/);
  assert.match(svg,/data-torque-tube="C" data-profile="100"/);
});

test('top-view SVG shows only arrow-ended torque-tube lengths and consecutive pile distances without unit suffixes',()=>{
  const schematic=loadSchematic(),{project,row}=sample(),model=schematic.buildTopViewModel(project,row),svg=schematic.buildTopViewSvg(model);
  assert.match(svg,/LUMA Tracker Schematic — Horizontal Top View/);
  for(const value of ['900','1300','1521','482','2200','1800'])assert.match(svg,new RegExp(`>${value}<`));
  assert.doesNotMatch(svg,/>\s*6203\s*</);
  assert.doesNotMatch(svg,/>\s*2384\s*</);
  assert.doesNotMatch(svg,/>\s*400\s*</);
  assert.doesNotMatch(svg,/\d+(?:\.\d+)? mm/);
  assert.ok((svg.match(/stroke-width="1\.5"/g)||[]).length>=model.tubeSegments.length+model.pileSegments.length);
  assert.match(svg,/PV Module/);
  assert.match(svg,/data-torque-tube="A" data-profile="120"/);
  assert.match(svg,/data-torque-tube="B" data-profile="110"/);
  assert.match(svg,/data-torque-tube="C" data-profile="100"/);
  assert.match(svg,/Horizontal Top View/);
  assert.equal((svg.match(/>N[1-3]<|>S[1-2]</g)||[]).length,5);
});

test('top-view DXF is an R12 drawing with arrow-ended tube and pile dimension chains',()=>{
  const schematic=loadSchematic(),{project,row}=sample(),model=schematic.buildTopViewModel(project,row),dxf=schematic.buildTopViewDxf(model);
  assert.match(dxf,/\$ACADVER\r\n1\r\nAC1009/);
  assert.match(dxf,/\$INSUNITS\r\n70\r\n4/);
  for(const layer of ['PV_MODULE','TORQUE_TUBE_A','TORQUE_TUBE_B','TORQUE_TUBE_C','MODULE_RAIL','DRIVE_PILE','BEARING_PILE','DIMENSIONS','PILE_DIM'])assert.match(dxf,new RegExp(`\\r\\n2\\r\\n${layer}\\r\\n`));
  assert.match(dxf,/LUMA TRACKER HORIZONTAL TOP VIEW/);
  for(const value of ['900','1300','1521','482','2200','1800'])assert.match(dxf,new RegExp(`\\r\\n1\\r\\n${value}\\r\\n`));
  assert.doesNotMatch(dxf,/\d+(?:\.\d+)? mm/);
  assert.match(dxf,/0\r\nEOF\r\n$/);
});

test('Tracker Sketch keeps its existing image export and adds Schematic image and DXF actions',()=>{
  const app=read('app.js'),index=read('index.html'),styles=read('style.css');
  assert.match(app,/id="saveSketch"[^>]*>Save High-Resolution Image/);
  assert.match(app,/id="trackerSchematicTitle"[^>]*>Schematic/);
  assert.match(app,/id="saveTopViewImage"[^>]*>Save Top View Image/);
  assert.match(app,/id="saveTopViewDxf"[^>]*>Export Top View DXF/);
  assert.match(app,/function saveTopViewImage\(\)/);
  assert.match(app,/function saveTopViewDxf\(\)/);
  assert.match(index,/tracker-schematic\.js\?v=20260926-horizontal-profiles/);
  assert.match(app,/buildTopViewSvg\(schematic\.model,1400,900\)/);
  assert.match(app,/canvas\.width=4200;canvas\.height=2700/);
  assert.match(styles,/\.tracker-schematic-box/);
});
