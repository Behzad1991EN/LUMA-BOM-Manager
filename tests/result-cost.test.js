'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const ROOT=path.join(__dirname,'..');
const CALCULATOR_SOURCE=fs.readFileSync(path.join(ROOT,'result-cost-calculator.js'),'utf8');
const APP_SOURCE=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

function calculator(){const window={};vm.runInContext(CALCULATOR_SOURCE,vm.createContext({window,Object,Array,String,Number,Set}),{filename:'result-cost-calculator.js'});return window.LumaResultCostCalculator;}
function input(overrides={}){return {materialSections:[
  {label:'Steel Structure',cost:100,transportGenoa:20,transportItalian:0,transportFob:30,complete:true},
  {label:'Bearing',cost:50,transportGenoa:0,transportItalian:0,transportFob:10,complete:true},
  {label:'Slew Drive',cost:40,transportGenoa:5,transportItalian:0,transportFob:0,complete:true},
  {label:'Fasteners',cost:30,transportGenoa:0,transportItalian:5,transportFob:0,complete:true},
  {label:'Electrical',cost:20,transportGenoa:0,transportItalian:0,transportFob:0,complete:true},
],internalRows:[{label:'Engineering',costPerMw:10,projectCost:100,complete:true},{label:'Project Management',costPerMw:20,projectCost:200,complete:true},{label:'Overhead',costPerMw:5,projectCost:50,complete:true}],contingencyPercent:5,marginPercent:-10,vatRate:.22,...overrides};}

test('Result follows landed cost, internal cost, Contingency, signed Margin, and VAT order',()=>{
  const result=calculator().calculate(input());
  assert.equal(result.materialLandedTotal,310);
  assert.equal(result.internalCostTotal,350);
  assert.equal(result.totalInternalCost,660);
  assert.equal(result.contingencyAmount,33);
  assert.equal(result.expectedCost,693);
  assert.ok(Math.abs(result.marginAmount+69.3)<1e-9);
  assert.ok(Math.abs(result.priceBeforeVat-623.7)<1e-9);
  assert.ok(Math.abs(result.vatAmount-137.214)<1e-9);
  assert.ok(Math.abs(result.finalPrice-760.914)<1e-9);
  assert.equal(result.complete,true);
});

test('Result never treats an incomplete material section as zero',()=>{
  const source=input(),sections=source.materialSections.map((row,index)=>index===0?{...row,complete:false}:row);
  const result=calculator().calculate({...source,materialSections:sections});
  assert.equal(result.materials[0].landedCost,null);
  assert.equal(result.materialLandedTotal,null);
  assert.equal(result.totalInternalCost,null);
  assert.equal(result.finalPrice,null);
  assert.equal(result.complete,false);
});

test('Result limits VAT to 0, 10, or 22 percent and permits negative or positive Margin',()=>{
  const calc=calculator();
  assert.equal(calc.calculate(input({vatRate:.10,marginPercent:10})).vatRate,.10);
  assert.equal(calc.calculate(input({vatRate:.15})).vatRate,0);
  assert.ok(calc.calculate(input({marginPercent:-5})).marginAmount<0);
  assert.ok(calc.calculate(input({marginPercent:5})).marginAmount>0);
});

test('Analysis removes the duplicate Result destination and gives Packaging its own section',()=>{
  assert.match(APP_SOURCE,/page:'total',title:'Overhead & Final Price'/);
  assert.match(APP_SOURCE,/\['Summary',\['total'\]\]/);
  assert.match(APP_SOURCE,/\['Packaging',\['packaging'\]\]/);
  assert.doesNotMatch(APP_SOURCE,/page:'result',title:'Result'/);
  assert.doesNotMatch(APP_SOURCE,/\['Result',\['result'\]\]/);
  assert.doesNotMatch(APP_SOURCE,/else if\(page==='result'\)renderResultAnalysis\(\)/);
  assert.doesNotMatch(APP_SOURCE,/\['Summary',\['total','packaging'\]\]/);
});

test('Posts and Substructure audit keeps requested TAGs and exact post separation',()=>{
  assert.match(APP_SOURCE,/pages:Object\.freeze\(\['posts','substructure'\]\)/);
  const categorySource=fs.readFileSync(path.join(ROOT,'commercial-categories.js'),'utf8'),window={};vm.runInContext(categorySource,vm.createContext({window,Object,String}),{filename:'commercial-categories.js'});const categories=window.LumaCommercialCategories;
  for(const record of [{TAG:'k001119',Category:'Steel Structure',Part:'Bearing Adapter'},{TAG:'k001479',Category:'Fastener / Main Beam',Part:'Tube Spacer'},{TAG:'k001576',Category:'Fasteners / Hat rail',Part:'Square Washer'}])assert.equal(categories.leafKeyForPart(record),'substructure',record.TAG);
  for(const record of [{Category:'Steel Structure / Post',Part:'Main Post'},{Category:'Steel Structure / Post',Part:'Bearing Post'}])assert.equal(categories.leafKeyForPart(record),'posts',record.Part);
  for(const record of [{Category:'Steel Structure / Substructure',Part:'Slew Drive Seat - Main Post'},{Category:'Steel Structure / Substructure',Part:'Bearing Adapter',Description:'Connection to Bearing Post'}])assert.equal(categories.leafKeyForPart(record),'substructure',record.Part);
});
