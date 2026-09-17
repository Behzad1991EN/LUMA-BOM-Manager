'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const CURRENCY_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'currency-data.js'), 'utf8');
const SERVICE_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'price-list-service.js'), 'utf8');
const APP_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const UI_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'admin-price-lists.js'), 'utf8');
const ADMIN_HOME_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'admin-suppliers.js'), 'utf8');
const MIGRATION_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260827000300_create_price_lists.sql'), 'utf8');
const EDITABLE_DOCUMENT_MIGRATION_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260901001600_editable_price_list_documents.sql'), 'utf8');

function loadService({admin = true, client}) {
  const window = {
    LumaAuth: {isAdmin: () => admin},
    LumaSupabase: {getClient: () => client},
  };
  const context = vm.createContext({window, console: {error() {}}});
  vm.runInContext(CURRENCY_SOURCE, context, {filename: 'currency-data.js'});
  vm.runInContext(SERVICE_SOURCE, context, {filename: 'price-list-service.js'});
  return window.LumaPriceListService;
}

function builder(result, calls, table) {
  return {
    select(columns) { calls.push(['select', table, columns]); return this; },
    update(values) { calls.push(['update', table, values]); return this; },
    eq(column, value) { calls.push(['eq', table, column, value]); return this; },
    order(column, options) { calls.push(['order', table, column, options]); return this; },
    single() { calls.push(['single', table]); return Promise.resolve(result); },
    then(resolve) { return Promise.resolve(result).then(resolve); },
  };
}

test('authenticated users can load suppliers, revisions, and item prices', async () => {
  const calls = [];
  const suppliers = [{id: 'supplier-id', supplier_code: 'SUP-001', supplier_categories: [{category: 'Steel Structure', active: true}]}];
  const priceLists = [{id: 'list-id', revision: '2026-R01', price_list_items: [{tag: 'k001141', unit_price: '177.25'}]}];
  const client = {
    from(table) {
      return builder({data: table === 'suppliers' ? suppliers : priceLists, error: null}, calls, table);
    },
  };
  const service = loadService({admin: false, client});
  const result = await service.listPriceListMaster();
  assert.deepEqual(result.suppliers, suppliers);
  assert.deepEqual(result.priceLists, priceLists);
  assert.equal(calls.some(call => call[0] === 'select' && call[1] === 'price_lists'), true);
});

test('Analysis commercial data loads suppliers and active Price Lists in two batched queries', async () => {
  const calls = [];
  const suppliers = [{id: 'supplier-id', active: true, supplier_categories: [{category: 'Steel Structure', active: true, delivery_time_days: 42}]}];
  const priceLists = [{id: 'list-id', supplier_id: 'supplier-id', active: true, price_list_items: [{tag: 'k001141', unit_price: '177.25'}]}];
  const client = {from: table => builder({data: table === 'suppliers' ? suppliers : priceLists, error: null}, calls, table)};
  const service = loadService({admin: false, client});
  const result = await service.loadActiveAnalysisData();
  assert.deepEqual(result.suppliers, suppliers);
  assert.deepEqual(result.priceLists, priceLists);
  assert.equal(calls.filter(call => call[0] === 'select').length, 2);
  assert.equal(calls.filter(call => call[0] === 'eq' && call[2] === 'active' && call[3] === true).length, 2);
});

test('admin save preserves decimal price text and sends one atomic revision payload', async () => {
  let rpcCall;
  const client = {async rpc(name, parameters) { rpcCall = {name, parameters}; return {data: 'list-id', error: null}; }};
  const service = loadService({client});
  const id = await service.savePriceList({
    header: {supplier_id: 'supplier-id', category: 'Steel Structure', revision: '2026-r01', currency: 'eur', active: true},
    items: [{tag: 'K001141', description: 'Main Post', unit: 'pcs', unit_price: '0.0375'}],
  });
  assert.equal(id, 'list-id');
  assert.equal(rpcCall.name, 'save_price_list');
  assert.equal(rpcCall.parameters.p_price_list.revision, '2026-R01');
  assert.equal(rpcCall.parameters.p_price_list.currency, 'EUR');
  assert.equal(rpcCall.parameters.p_items[0].tag, 'k001141');
  assert.equal(rpcCall.parameters.p_items[0].unit_price, '0.0375');
});

test('blank and zero prices remain distinct', async () => {
  let parameters;
  const service = loadService({client: {async rpc(name, values) { parameters = values; return {data: 'list-id', error: null}; }}});
  await service.savePriceList({header: {}, items: [
    {tag: 'k001141', unit_price: ''},
    {tag: 'k001147', unit_price: '0'},
  ]});
  assert.equal(parameters.p_items[0].unit_price, null);
  assert.equal(parameters.p_items[1].unit_price, '0');
});

test('normal users cannot start price-list writes through the service', async () => {
  let called = false;
  const service = loadService({admin: false, client: {async rpc() { called = true; return {data: null, error: null}; }}});
  await assert.rejects(service.savePriceList({header: {}, items: []}), error => error.code === 'forbidden');
  assert.equal(called, false);
});

test('database errors map to safe revision, TAG, category, and permission messages', async () => {
  const cases = [
    [{code: '23505', message: 'price_lists_supplier_category_revision_unique'}, 'duplicate_revision'],
    [{code: '23505', message: 'price_list_items_price_list_tag_unique'}, 'duplicate_tag'],
    [{code: 'P2001'}, 'invalid_category'],
    [{code: '42501'}, 'forbidden'],
  ];
  for (const [databaseError, expectedCode] of cases) {
    const service = loadService({client: {async rpc() { return {data: null, error: databaseError}; }}});
    await assert.rejects(service.savePriceList({header: {}, items: []}), error => error.code === expectedCode);
  }
});

test('archive retains the revision and only updates active=false', async () => {
  const calls = [];
  const service = loadService({client: {from: table => builder({data: {id: 'list-id'}, error: null}, calls, table)}});
  await service.archivePriceList('list-id');
  assert.equal(JSON.stringify(calls), JSON.stringify([
    ['update', 'price_lists', {active: false}],
    ['eq', 'price_lists', 'id', 'list-id'],
    ['select', 'price_lists', 'id'],
    ['single', 'price_lists'],
  ]));
});

test('migration enforces revision history, exact prices, active uniqueness, audits, and RLS', () => {
  const fragments = [
    'create table public.price_lists',
    'create table public.price_list_items',
    'unit_price numeric',
    'unique (supplier_id, category, revision)',
    'unique (price_list_id, tag)',
    'where active',
    'new.created_by := (select auth.uid())',
    'new.updated_by := (select auth.uid())',
    'new.revision := old.revision',
    'alter table public.price_lists enable row level security',
    'alter table public.price_list_items enable row level security',
    'with check ((select private.is_admin()))',
    'security invoker',
    'set active = false',
    "errcode = 'P2001'",
  ];
  for (const fragment of fragments) assert.equal(MIGRATION_SOURCE.toLowerCase().includes(fragment.toLowerCase()), true, fragment);
});

test('Part Master integration is exposed as read-only TAG metadata', () => {
  assert.match(APP_SOURCE, /function getPartMasterItems\(\)/);
  assert.match(APP_SOURCE, /tag,part:String\(record\?\.Part/);
  assert.match(APP_SOURCE, /partNumber:String\(record\?\.\['Part Number'\]/);
  assert.match(APP_SOURCE, /description:String\(record\?\.Description/);
  assert.match(APP_SOURCE, /unit:String\(record\?\.Unit/);
  assert.match(APP_SOURCE, /category:String\(record\?\.Category/);
  assert.match(APP_SOURCE, /Object\.freeze\(\{tag,part/);
});

test('Administration exposes active Price Lists navigation and focused revision controls', () => {
  assert.match(ADMIN_HOME_SOURCE, /data-admin-page="price-lists"/);
  assert.match(UI_SOURCE, /Duplicate Price List/);
  assert.match(UI_SOURCE, /Archive Price List/);
  assert.match(UI_SOURCE, /Select TAG from Part Master/);
  assert.match(UI_SOURCE, /Search Part Master/);
  assert.match(UI_SOURCE, /<th>Part Number<\/th>/);
  assert.match(UI_SOURCE, /<th>Weight \(kg\)<\/th>/);
  assert.match(UI_SOURCE, /item\.partNumber/);
  assert.match(UI_SOURCE, /item\.weight/);
  assert.match(UI_SOURCE, /LumaCommercialCategories\.partMatchesCategory/);
  assert.match(UI_SOURCE, /Changing Category to/);
  assert.match(UI_SOURCE, /incompatible item\(s\) removed/);
  assert.match(UI_SOURCE, /Blank Unit Price means missing; zero is preserved as zero/);
  assert.match(UI_SOURCE, /Document No\. \(Invoice No\.\)/);
  assert.match(UI_SOURCE, /<th>No\.<\/th><th aria-label="Selection">/);
  assert.match(UI_SOURCE, /Valid Until cannot be before Valid From/);
  assert.doesNotMatch(UI_SOURCE, /name="currency" required disabled/);
});

test('follow-up migration makes Document No. and currency editable after save', () => {
  assert.match(EDITABLE_DOCUMENT_MIGRATION_SOURCE, /revision = v_revision/);
  assert.match(EDITABLE_DOCUMENT_MIGRATION_SOURCE, /currency = v_currency/);
  assert.doesNotMatch(EDITABLE_DOCUMENT_MIGRATION_SOURCE, /new\.revision := old\.revision/);
  assert.doesNotMatch(EDITABLE_DOCUMENT_MIGRATION_SOURCE, /new\.currency := old\.currency/);
  assert.match(EDITABLE_DOCUMENT_MIGRATION_SOURCE, /Steel Structure \/ Substructure/);
});
