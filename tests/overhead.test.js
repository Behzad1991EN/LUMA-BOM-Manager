'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const CALCULATOR_SOURCE = fs.readFileSync(path.join(ROOT, 'commercial-cost-calculator.js'), 'utf8');
const APP_SOURCE = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const ADMIN_SOURCE = fs.readFileSync(path.join(ROOT, 'admin-suppliers.js'), 'utf8');
const INDEX_SOURCE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MIGRATION_SOURCE = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20260829001500_add_overhead_settings.sql'), 'utf8');

function calculator() {
  const window = {};
  vm.runInContext(CALCULATOR_SOURCE, vm.createContext({window, Object, Number, String, Set, Array}), {filename: 'commercial-cost-calculator.js'});
  return window.LumaCommercialCostCalculator;
}

function example(overrides = {}) {
  return {
    baseCosts: {EUR: 900000},
    externalLogistics: {EUR: 60000},
    internalLogistics: {EUR: 40000},
    logisticsComplete: true,
    baseGapCount: 0,
    overheadSettings: {ksi_annual_overhead_eur: 1000000, ksi_annual_project_capacity_mwp: 120},
    projectCapacityMwp: 24,
    commercialContingencyPercent: 5,
    penaltyPercent: 2,
    marginPercent: 10,
    vatRate: 0.22,
    ...overrides,
  };
}

test('authoritative commercial sequence reproduces the required Overhead and VAT example', () => {
  const result = calculator().buildResult(example());
  assert.equal(result.overhead.coefficientA, 1000000 / 120);
  assert.equal(result.overhead.constantOverhead, 200000);
  assert.equal(result.overhead.combinedPercent, 17);
  assert.equal(result.overhead.percentageAmount, 34000);
  assert.equal(result.overhead.totalOverhead, 234000);
  assert.equal(result.previousProjectPrice, 1000000);
  assert.equal(result.subtotalBeforeVat, 1234000);
  assert.equal(result.vat.amount, 271480);
  assert.equal(result.finalCostIncludingVat, 1505480);
});

test('Penalty blank is invalid while explicit zero is valid', () => {
  const missing = calculator().buildResult(example({penaltyPercent: ''}));
  assert.equal(missing.overhead.penaltyMissing, true);
  assert.equal(missing.finalCostIncludingVat, null);
  assert.ok(missing.overhead.errors.includes('Penalty percentage is required.'));
  const zero = calculator().buildResult(example({penaltyPercent: 0}));
  assert.equal(zero.overhead.penaltyMissing, false);
  assert.equal(zero.overhead.penaltyPercent, 0);
  assert.equal(zero.overhead.valid, true);
});

test('blank Margin is valid as zero and percentages are added rather than compounded', () => {
  const result = calculator().buildResult(example({commercialContingencyPercent: 5, penaltyPercent: 2, marginPercent: ''}));
  assert.equal(result.overhead.marginBlank, true);
  assert.equal(result.overhead.marginPercent, 0);
  assert.equal(result.overhead.combinedPercent, 7);
  assert.ok(Math.abs(result.overhead.percentageAmount - 14000) < 1e-9);
});

test('Margin accepts both negative and positive percentages', () => {
  const negative = calculator().buildResult(example({marginPercent: -10}));
  const positive = calculator().buildResult(example({marginPercent: 10}));
  assert.equal(negative.overhead.marginPercent, -10);
  assert.equal(positive.overhead.marginPercent, 10);
  assert.ok(negative.overhead.percentageAmount < positive.overhead.percentageAmount);
});

test('legacy blank commercial Contingency defaults to five without using BOM contingency', () => {
  const result = calculator().buildResult(example({commercialContingencyPercent: ''}));
  assert.equal(result.overhead.contingencyPercent, 5);
  assert.equal(result.overhead.contingencyDefaulted, true);
  assert.doesNotMatch(CALCULATOR_SOURCE, /fastener_contingency_percent|contingency_enabled/);
});

test('company constants extend commercial_settings with existing admin RLS foundation', () => {
  assert.match(MIGRATION_SOURCE, /area in \([^)]*'overhead'/);
  assert.match(MIGRATION_SOURCE, /ksi_annual_overhead_eur[^\n]*1000000/);
  assert.match(MIGRATION_SOURCE, /ksi_annual_project_capacity_mwp[^\n]*120/);
  assert.match(MIGRATION_SOURCE, /ksi_annual_project_capacity_mwp'\)::numeric > 0/);
  assert.doesNotMatch(MIGRATION_SOURCE, /create table/i);
});

test('Administration and Analysis use the shared service and calculator', () => {
  assert.match(INDEX_SOURCE, /src="overhead-service\.js"/);
  assert.match(INDEX_SOURCE, /src="admin-overhead\.js"/);
  assert.match(ADMIN_SOURCE, /data-admin-page="overhead"/);
  assert.match(APP_SOURCE, /LumaOverheadService\.snapshot\(\)/);
  assert.match(CALCULATOR_SOURCE, /Project Overhead is in EUR/);
  assert.match(APP_SOURCE, /Penalty percentage is required/);
  assert.match(APP_SOURCE, /Overhead Formula Trace/);
});
