'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'currency-data.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(ROOT, 'admin-suppliers.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const migrationSource = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20260829001100_expand_supported_currencies.sql'), 'utf8');

function loadCurrencies() {
  const window = {};
  vm.runInContext(source, vm.createContext({window}), {filename:'currency-data.js'});
  return window.LumaCurrencyData;
}

test('commercial currencies have stable codes, names, and visible symbols', () => {
  const currencies = loadCurrencies();
  assert.deepEqual([...currencies.CODES], ['EUR', 'USD', 'TRY', 'CNY', 'EGP', 'CHF']);
  assert.deepEqual(Array.from(currencies.OPTIONS, item => item.symbol), ['€', '$', '₺', '¥', 'E£', 'CHF']);
  assert.equal(currencies.optionLabel('TRY'), '₺ — Turkish Lira (TRY)');
  assert.equal(currencies.display('EGP'), 'E£ EGP');
  assert.equal(currencies.display('CHF'), 'CHF');
});

test('database constraints accept all current selectable currencies', () => {
  for (const code of ['EUR', 'USD', 'TRY', 'CNY', 'EGP', 'CHF']) assert.match(migrationSource, new RegExp(`'${code}'`));
  assert.match(migrationSource, /price_lists_currency_allowed/);
  assert.match(migrationSource, /logistics_rates_currency_allowed/);
});

test('Administration cards use one consistent icon-content-arrow structure', () => {
  assert.equal((adminSource.match(/class="administration-card-icon"/g) || []).length, 8);
  assert.match(adminSource, /Manage engineering Part Master records/);
  assert.match(adminSource, /Manage container capacities and logistics rates/);
  assert.match(adminSource, /Manage monthly Personnel costs by company section/);
  assert.doesNotMatch(adminSource, /<strong>CAT<\/strong>/);
  assert.match(adminSource, /administration-card coming-later[^>]*disabled>[\s\S]*?<strong>Quotation Settings<\/strong><small>Coming later<\/small>/);
  assert.doesNotMatch(adminSource, /data-admin-page="quotation-settings"/);
  assert.doesNotMatch(adminSource, /openSettings/);
  assert.match(styleSource, /grid-auto-rows:\s*1fr/);
  assert.doesNotMatch(styleSource, /administration-card\.coming-later\s*\{[^}]*grid-template-columns/s);
});
