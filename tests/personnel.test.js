'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const ROOT=path.join(__dirname,'..');
const CALCULATOR_SOURCE=fs.readFileSync(path.join(ROOT,'personnel-cost-calculator.js'),'utf8');
const SERVICE_SOURCE=fs.readFileSync(path.join(ROOT,'personnel-service.js'),'utf8');
const ADMIN_SOURCE=fs.readFileSync(path.join(ROOT,'admin-personnel.js'),'utf8');
const HOME_SOURCE=fs.readFileSync(path.join(ROOT,'admin-suppliers.js'),'utf8');
const APP_SOURCE=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const INDEX_SOURCE=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const MIGRATION_SOURCE=fs.readFileSync(path.join(ROOT,'supabase','migrations','20260901001800_add_personnel_cost_settings.sql'),'utf8');
const FOUNDATION_SOURCE=fs.readFileSync(path.join(ROOT,'supabase','migrations','20260827000600_create_quotation_foundation.sql'),'utf8');

function loadCalculator(){const window={};vm.runInContext(CALCULATOR_SOURCE,vm.createContext({window,Object,Array,String,Number,Set}),{filename:'personnel-cost-calculator.js'});return window.LumaPersonnelCostCalculator;}

test('Personnel formulas reproduce the supplied monthly, yearly, and 150 MW values',()=>{
  const calculator=loadCalculator(),settings={engineering_monthly_cost:7824.85,test_commissioning_monthly_cost:14455.92,project_management_monthly_cost:9823.90,admin_management_monthly_cost:38970};
  const result=calculator.calculate({settings,yearlyTargetMw:150,projectCapacityMwp:20});
  assert.equal(result.complete,true);
  assert.ok(Math.abs(result.rows[0].yearlyCost-93898.2)<1e-9);
  assert.ok(Math.abs(result.rows[0].costPerMw-625.988)<1e-9);
  assert.ok(Math.abs(result.totalMonthly-71074.67)<1e-9);
  assert.ok(Math.abs(result.totalYearly-852896.04)<1e-9);
  assert.ok(Math.abs(result.totalPerMw-5685.9736)<1e-9);
  assert.ok(Math.abs(result.projectPersonnelCost-113719.472)<1e-9);
});

test('Yearly Target must be positive and monthly zero remains intentional',()=>{
  const calculator=loadCalculator(),settings=Object.fromEntries(calculator.SECTIONS.map(section=>[section.key,0]));
  assert.equal(calculator.calculate({settings,yearlyTargetMw:150,projectCapacityMwp:0}).complete,true);
  const invalid=calculator.calculate({settings,yearlyTargetMw:0,projectCapacityMwp:1});
  assert.equal(invalid.complete,false);
  assert.equal(invalid.errors.includes('Yearly Target must be greater than zero.'),true);
});

test('normal users cannot start Personnel writes in the browser service',async()=>{
  let called=false;const calculator=loadCalculator(),window={LumaPersonnelCostCalculator:calculator,LumaAuth:{isAdmin:()=>false},LumaSupabase:{getClient:()=>({from(){called=true;}})}};
  vm.runInContext(SERVICE_SOURCE,vm.createContext({window,console:{error(){}}}),{filename:'personnel-service.js'});
  await assert.rejects(window.LumaPersonnelService.saveSettings({}),error=>error.code==='forbidden');
  assert.equal(called,false);
});

test('Personnel migration extends secure commercial settings and seeds the supplied defaults',()=>{
  for(const fragment of ["'personnel'",'commercial_settings_personnel_values_valid','engineering_monthly_cost','test_commissioning_monthly_cost','project_management_monthly_cost','admin_management_monthly_cost','7824.85','14455.92','9823.90','38970.00','on conflict (area, setting_key) do nothing'])assert.equal(MIGRATION_SOURCE.includes(fragment),true,fragment);
  for(const fragment of ['Authenticated users can read commercial settings','Admins can create commercial settings','Admins can update commercial settings','with check ((select private.is_admin()))'])assert.equal(FOUNDATION_SOURCE.includes(fragment),true,fragment);
});

test('Administration edits monthly values while Analysis is read-only except project Yearly Target',()=>{
  assert.match(INDEX_SOURCE,/src="personnel-cost-calculator\.js"[\s\S]*src="personnel-service\.js"/);
  assert.match(INDEX_SOURCE,/src="admin-personnel\.js"/);
  assert.match(HOME_SOURCE,/data-admin-page="personnel"/);
  assert.match(ADMIN_SOURCE,/name="\$\{esc\(section\.key\)\}" type="number"/);
  assert.match(ADMIN_SOURCE,/value\*12/);
  assert.match(APP_SOURCE,/function renderPersonnelAnalysis\(\)/);
  assert.match(APP_SOURCE,/All Personnel cost values below are read-only/);
  assert.match(APP_SOURCE,/id="personnelYearlyTarget" type="number"/);
  assert.match(APP_SOURCE,/personnel_yearly_target_mw:window\.LumaPersonnelCostCalculator\.DEFAULT_YEARLY_TARGET_MW/);
  assert.match(APP_SOURCE,/sections\.push\(\{name:'Personnel'/);
});
