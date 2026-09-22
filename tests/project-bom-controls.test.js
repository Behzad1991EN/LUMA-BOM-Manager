'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function loadEngine() {
  const context = {globalThis: {}};
  vm.createContext(context);
  vm.runInContext(read('engine.js'), context, {filename: 'engine.js'});
  return context.globalThis.LumaEngine;
}

test('Project BOM equipment controls expose automatic totals without changing allocation logic', () => {
  const engine = loadEngine();
  const rows = [
    {'PV Modules per Tracker': 14, 'Number of Trackers': 3, _schedule_key: '14:a'},
    {'PV Modules per Tracker': 20, 'Number of Trackers': 4, _schedule_key: '20:a'},
  ];
  const automatic = engine.equipmentQuantityAllocation({equipment_quantity_overrides: {}}, rows);
  assert.equal(automatic.automaticSoltrk, 4);
  assert.equal(automatic.automaticJunctionBox, 3);
  assert.equal(automatic.soltrk, 4);
  assert.equal(automatic.junctionBox, 3);

  const overridden = engine.equipmentQuantityAllocation({equipment_quantity_overrides: {soltrk: 7, junction_box: 5}}, rows);
  assert.equal(overridden.automaticSoltrk, 4);
  assert.equal(overridden.automaticJunctionBox, 3);
  assert.equal(overridden.soltrk, 7);
  assert.equal(overridden.junctionBox, 5);
  assert.equal(Object.values(overridden.soltrkByPv).reduce((sum, value) => sum + value, 0), 7);
  assert.equal(Object.values(overridden.junctionBoxByPv).reduce((sum, value) => sum + value, 0), 5);
});

test('Project BOM uses grouped controls, dedicated overrides, and no editable table quantity', () => {
  const app = read('app.js');
  assert.match(app, /function bomProjectSettingsHtml\(project,allocation\)/);
  assert.match(app, /placeholder="Auto \(\$\{escapeHtml\(allocation\.automaticSoltrk\)\}\)"/);
  assert.match(app, /placeholder="Auto \(\$\{escapeHtml\(allocation\.automaticJunctionBox\)\}\)"/);
  assert.match(app, /bindOverride\('bomSoltrkOverride','soltrk','SOLTRK'\)/);
  assert.match(app, /bindOverride\('bomJunctionBoxOverride','junction_box','Junction Box'\)/);
  assert.match(app, /non-negative whole number/);
  assert.doesNotMatch(app, /function editBomCell|bom-editable-cell|bom-cell-input/);
});

test('Project BOM selected rows match the VEON highlighted and keyboard-accessible behavior', () => {
  const app = read('app.js');
  const styles = read('style.css');
  assert.match(app, /table\.classList\.add\('bom-table'\)/);
  assert.match(app, /tr\.tabIndex=0/);
  assert.match(app, /tr\.setAttribute\('aria-selected'/);
  assert.match(app, /classList\.toggle\('is-selected'/);
  assert.match(app, /event\.key==='Enter'\|\|event\.key===' '/);
  assert.match(styles, /\.bom-table tbody tr\.is-selected/);
  assert.match(styles, /background: var\(--accent\) !important/);
  assert.match(styles, /color: #FFF/);
});

test('browser assets share the current release cache token', () => {
  const html = read('index.html');
  for (const asset of ['style.css', 'engine.js', 'app.js']) {
    assert.match(html, new RegExp(`${asset.replace('.', '\\.')}\\?v=20260922-v4-10`));
  }
});
