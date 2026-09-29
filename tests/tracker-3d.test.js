'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function loadTracker3d(fetchImpl=global.fetch){
  const context={globalThis:{},Blob,TextDecoder,TextEncoder,fetch:fetchImpl};
  vm.createContext(context);
  vm.runInContext(read('tracker-3d.js'),context,{filename:'tracker-3d.js'});
  return context.globalThis.LumaTracker3D;
}

function sample(){
  return {
    project:{inputs:{pv_module_width:'1134',pv_module_length:'2384',pv_module_gap:'19',motor_gap:'400'}},
    row:{
      'PV Modules per Tracker':4,
      'Modules / North Side':2,
      'Modules / South Side':2,
      'Main Tube C End North from Midplane':2600,
      'Main Tube C End South from Midplane':2600,
      'Zone A End (120)':700,
      'Zone B End (110)':1900,
      _module_support_rows:[
        {'Signed Distance from Mid Plane (mm)':800,'Clearance Status':'OK'},
        {'Signed Distance from Mid Plane (mm)':-800,'Clearance Status':'Warning'},
      ],
      _bearing_rows:[
        {'Distance from Main Post (mm)':1700},
        {'Distance from Main Post (mm)':-1700},
      ],
    },
  };
}

test('3D model keeps Slew Drive 01 and registers the supplied tracker parts',()=>{
  const viewer=loadTracker3d();
  assert.equal(viewer.VARIANTS['01'].detail,'Schematic');
  assert.equal(viewer.VARIANTS['01'].url,'assets/models/slew-drive/slew-drive-01.stl');
  assert.equal(viewer.VARIANTS['02'],undefined);
  assert.equal(viewer.PARTS.drivePile.url,'assets/models/tracker-parts/drive-pile.stl');
  assert.equal(viewer.PARTS.bearingDrive.url,'assets/models/tracker-parts/bearing-drive-with-bearing.stl');
  assert.equal(viewer.PARTS.hatRail.url,'assets/models/tracker-parts/hat-rail.stl');
  for(const asset of Object.values(viewer.PARTS))assert.ok(fs.statSync(path.join(root,asset.url)).size>0);
  assert.equal(fs.existsSync(path.join(root,'assets/models/slew-drive/slew-drive-02.stl')),false);
});

test('supplied STEP-derived meshes assemble with calculated modules and torque tubes',()=>{
  const viewer=loadTracker3d(),assets={};
  for(const [key,asset] of Object.entries(viewer.PARTS)){const file=fs.readFileSync(path.join(root,asset.url));assets[key]=viewer.parseStl(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));}
  const {project,row}=sample(),built=viewer.buildTrackerGeometry(project,row,assets),sourceTriangles=Object.values(assets).reduce((sum,mesh)=>sum+mesh.triangles.length,0);
  assert.equal(assets.slewDrive.triangles.length,618);
  assert.equal(assets.drivePile.triangles.length,44);
  assert.equal(assets.bearingDrive.triangles.length,304);
  assert.equal(assets.hatRail.triangles.length,28);
  assert.ok(built.geometry.positions.length>sourceTriangles*9);
  assert.equal(built.geometry.positions.length,built.geometry.normals.length);
  assert.equal(built.geometry.positions.length,built.geometry.colors.length);
  assert.equal(built.model.modules.length,4);
});

test('assembled tracker geometry serializes as a valid binary STL',()=>{
  const viewer=loadTracker3d(),file=fs.readFileSync(path.join(root,viewer.VARIANTS['01'].url)),mesh=viewer.parseStl(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength)),{project,row}=sample(),built=viewer.buildTrackerGeometry(project,row,mesh),blob=viewer.binaryStl(built.geometry,'Test Tracker');
  assert.equal(blob.size,84+(built.geometry.positions.length/9)*50);
  assert.equal(blob.type,'model/stl');
});

test('missing supplied model files use complete schematic fallbacks instead of stopping the viewer',async()=>{
  const viewer=loadTracker3d(async()=>({ok:false,status:404})),missing=[];
  const assets=await viewer.loadTrackerAssets(null,asset=>missing.push(asset.label));
  assert.equal(Object.keys(assets).length,0);
  assert.equal(missing.length,4);
  const {project,row}=sample(),built=viewer.buildTrackerGeometry(project,row,assets);
  assert.ok(built.geometry.positions.length>0);
  assert.equal(built.geometry.positions.length,built.geometry.normals.length);
  assert.equal(built.geometry.positions.length,built.geometry.colors.length);
});

test('Tracker Sketch exposes the single supplied-parts model, fixed views, image save, and STL export',()=>{
  const app=read('app.js'),index=read('index.html'),styles=read('style.css');
  assert.match(app,/3D Tracker Model/);
  assert.match(app,/supplied Drive Pile, Bearing Drive with Bearing, and Hat Rail models/);
  assert.doesNotMatch(app,/Slew Drive 02/);
  assert.match(app,/data-tracker-3d-view="isometric"/);
  assert.match(app,/data-tracker-3d-view="slew">Slew Drive Detail/);
  assert.match(app,/id="saveTracker3dView"[^>]*>Save Current View/);
  assert.match(app,/id="exportTracker3d01"[^>]*>Export 3D Tracker/);
  assert.doesNotMatch(app,/exportTracker3d02/);
  assert.match(index,/tracker-3d\.js\?v=20260925-model-fallback/);
  assert.match(styles,/\.tracker-3d-stage/);
  assert.match(styles,/\.tracker-3d-status\.loading::before/);
});
