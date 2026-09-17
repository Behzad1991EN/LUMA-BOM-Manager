'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const ROOT=path.join(__dirname,'..');
const SERVICE_SOURCE=fs.readFileSync(path.join(ROOT,'overhead-service.js'),'utf8');
const ADMIN_SOURCE=fs.readFileSync(path.join(ROOT,'admin-overhead.js'),'utf8');
const APP_SOURCE=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const MIGRATION_SOURCE=fs.readFileSync(path.join(ROOT,'supabase','migrations','20260901001900_expand_overhead_cost_register.sql'),'utf8');

function loadService(extra={}){const window={...extra};vm.runInContext(SERVICE_SOURCE,vm.createContext({window,console,Object,Array,String,Number,Set,RegExp}),{filename:'overhead-service.js'});return window.LumaOverheadService;}

test('supplied Overhead register has No/Code-ready rows and exact yearly and monthly totals',()=>{
  const service=loadService(),settings=service.validateSettings(service.DEFAULTS);
  assert.equal(settings.items.length,41);
  assert.equal(settings.items[0].code,'OH-001');
  assert.equal(settings.items[40].code,'OH-041');
  assert.ok(Math.abs(settings.ksi_annual_overhead_eur-297852.58)<1e-9);
  assert.ok(Math.abs(settings.ksi_annual_overhead_eur/12-24821.0483333333)<1e-9);
});

test('Overhead validity rejects Valid Till before Valid From',()=>{
  const service=loadService();
  assert.throws(()=>service.validateSettings({...service.DEFAULTS,valid_from:'2026-09-02',valid_until:'2026-09-01'}),error=>error.code==='invalid_dates');
  assert.doesNotThrow(()=>service.validateSettings({...service.DEFAULTS,valid_from:'2026-09-01',valid_until:'2026-09-01'}));
});

test('normal users cannot start Overhead writes in the browser service',async()=>{
  let called=false;const service=loadService({LumaAuth:{isAdmin:()=>false},LumaSupabase:{getClient:()=>({from(){called=true;}})}});
  await assert.rejects(service.saveSettings(service.DEFAULTS),error=>error.code==='forbidden');
  assert.equal(called,false);
});

test('Administration edits Codes and yearly costs while calculating monthly and per-MW values',()=>{
  assert.match(ADMIN_SOURCE,/<th>No\.<\/th><th>Code<\/th>/);
  assert.match(ADMIN_SOURCE,/name="overhead_code_\$\{index\}" required/);
  assert.match(ADMIN_SOURCE,/code:form\.elements\[`overhead_code_\$\{index\}`\]\.value\.trim\(\)/);
  assert.match(ADMIN_SOURCE,/Monthly Cost \(÷ 12\)/);
  assert.match(ADMIN_SOURCE,/value\/12/);
  assert.match(ADMIN_SOURCE,/data-overhead-cost-per-mw/);
  assert.match(ADMIN_SOURCE,/yearlyTotal\/capacity/);
  assert.match(ADMIN_SOURCE,/Valid Till cannot be before Valid From/);
  assert.match(APP_SOURCE,/Overhead Cost Register/);
  assert.match(APP_SOURCE,/Overhead Cost per MW/);
  assert.match(APP_SOURCE,/Read-only for users/);
});

test('Analysis exposes Personnel cost per MW and excludes CAT',()=>{
  assert.match(APP_SOURCE,/Personnel Cost per MW/);
  assert.match(APP_SOURCE,/filter\(page=>page!==['"]cat['"]\)/);
  assert.match(APP_SOURCE,/analysisCommercialPages\(\)\.map/);
  assert.match(APP_SOURCE,/analysisCommercialPages\(\)\.includes\(page\)/);
});

test('migration upgrades the secured commercial setting and seeds all Overhead items',()=>{
  assert.match(MIGRATION_SOURCE,/commercial_settings_overhead_values_valid/);
  assert.match(MIGRATION_SOURCE,/not valid/);
  assert.match(MIGRATION_SOURCE,/validate constraint commercial_settings_overhead_values_valid/);
  assert.match(MIGRATION_SOURCE,/"code":"OH-001"/);
  assert.match(MIGRATION_SOURCE,/"code":"OH-041"/);
  assert.match(MIGRATION_SOURCE,/"ksi_annual_overhead_eur":297852\.58/);
  assert.doesNotMatch(MIGRATION_SOURCE,/create table/i);
});
