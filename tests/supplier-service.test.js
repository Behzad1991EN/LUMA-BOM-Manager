'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const SERVICE_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'supplier-service.js'), 'utf8');
const MIGRATION_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260827000200_create_supplier_master.sql'),
  'utf8',
);

function loadService({admin = true, client}) {
  const window = {
    LumaAuth: {isAdmin: () => admin},
    LumaSupabase: {getClient: () => client},
  };
  vm.runInContext(SERVICE_SOURCE, vm.createContext({window, console: {error() {}}}), {filename: 'supplier-service.js'});
  return window.LumaSupplierService;
}

function resultBuilder(result, calls, table) {
  return {
    select(columns) { calls.push(['select', table, columns]); return this; },
    eq(column, value) { calls.push(['eq', table, column, value]); return this; },
    order(column, options) { calls.push(['order', table, column, options]); return this; },
    delete() { calls.push(['delete', table]); return this; },
    then(resolve) { return Promise.resolve(result).then(resolve); },
  };
}

test('authenticated supplier reads include catalog and relational category data', async () => {
  const calls = [];
  const catalog = [{category: 'Steel Structure', sort_order: 10, active: true}];
  const suppliers = [{
    id: 'supplier-id', supplier_code: 'SUP-001', supplier_name: 'ABC Steel', active: true,
    supplier_categories: [{category: 'Steel Structure', delivery_time_days: 42, active: true}],
  }];
  const client = {
    from(table) {
      const result = table === 'supplier_category_catalog'
        ? {data: catalog, error: null}
        : {data: suppliers, error: null};
      return resultBuilder(result, calls, table);
    },
  };

  const service = loadService({admin: false, client});
  const result = await service.listSupplierMaster();
  assert.deepEqual(result.categories, catalog);
  assert.deepEqual(result.suppliers, suppliers);
  assert.equal(calls.some(call => call[0] === 'select' && call[1] === 'suppliers'), true);
});

test('admin save normalizes supplier code and sends category delivery days to the atomic RPC', async () => {
  let rpcCall;
  const client = {
    async rpc(name, parameters) {
      rpcCall = {name, parameters};
      return {data: 'supplier-id', error: null};
    },
  };
  const service = loadService({client});
  const id = await service.saveSupplier({
    details: {supplier_code: ' sup-001 ', supplier_name: ' ABC Steel ', active: true},
    categories: [{category: 'Steel Structure', delivery_time_days: 42}],
  });

  assert.equal(id, 'supplier-id');
  assert.equal(rpcCall.name, 'save_supplier');
  assert.equal(rpcCall.parameters.p_supplier.supplier_code, 'SUP-001');
  assert.equal(rpcCall.parameters.p_supplier.supplier_name, 'ABC Steel');
  assert.equal(
    JSON.stringify(rpcCall.parameters.p_categories),
    JSON.stringify([{category: 'Steel Structure', delivery_time_days: 42}]),
  );
});

test('frontend guard prevents normal users from starting supplier writes', async () => {
  let called = false;
  const service = loadService({
    admin: false,
    client: {async rpc() { called = true; return {data: null, error: null}; }},
  });

  await assert.rejects(
    service.saveSupplier({details: {}, categories: []}),
    error => error.code === 'forbidden',
  );
  assert.equal(called, false);
});

test('duplicate supplier codes receive a non-sensitive user-facing error', async () => {
  const service = loadService({
    client: {async rpc() { return {data: null, error: {code: '23505', details: 'internal constraint details'}}; }},
  });

  await assert.rejects(
    service.saveSupplier({details: {supplier_code: 'SUP-001'}, categories: []}),
    error => error.code === 'duplicate_code' && error.message === 'Supplier Code already exists.',
  );
});

test('admin delete targets suppliers so category rows cascade in PostgreSQL', async () => {
  const calls = [];
  const client = {from: table => resultBuilder({error: null}, calls, table)};
  const service = loadService({client});
  await service.deleteSupplier('supplier-id');
  assert.deepEqual(calls, [
    ['delete', 'suppliers'],
    ['eq', 'suppliers', 'id', 'supplier-id'],
  ]);
});

test('migration contains the required RLS, audit, controlled-category, and cascade contracts', () => {
  const requiredFragments = [
    'create table public.suppliers',
    'create table public.supplier_categories',
    'create table public.supplier_category_catalog',
    "('Steel Structure', 10)",
    "('Fasteners', 70)",
    'references public.suppliers (id) on delete cascade',
    'delivery_time_days integer',
    'alter table public.suppliers enable row level security',
    'alter table public.supplier_categories enable row level security',
    'using ((select private.is_admin()))',
    'with check ((select private.is_admin()))',
    'new.created_by := (select auth.uid())',
    'new.updated_by := (select auth.uid())',
    'security invoker',
  ];
  for (const fragment of requiredFragments) assert.match(MIGRATION_SOURCE, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});
