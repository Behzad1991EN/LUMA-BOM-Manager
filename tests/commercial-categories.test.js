'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'commercial-categories.js'), 'utf8');

function loadCategories() {
  const window = {};
  vm.runInContext(source, vm.createContext({window, Object, String}), {filename:'commercial-categories.js'});
  return window.LumaCommercialCategories;
}

test('legacy category names normalize centrally with only approved migration-compatibility TAG overrides', () => {
  const categories = loadCategories();
  assert.equal(categories.normalizeCategoryKey('Steel Structure'), 'substructure');
  assert.equal(categories.normalizeCategoryKey('Steel Structure / Post'), 'posts');
  assert.equal(categories.normalizeCategoryKey('Steel Structure / Posts'), 'posts');
  assert.equal(categories.normalizeCategoryKey('Steel Structure / Substructure'), 'substructure');
  assert.equal(categories.normalizeCategoryKey('Bearings'), 'bearing');
  assert.equal(categories.normalizeCategoryKey('Fasteners / Limit Switch'), 'fasteners');
  assert.match(source, /k001479: 'substructure'/);
  assert.match(source, /k001576: 'substructure'/);
});

test('Part Master fields resolve the intended commercial leaf categories', () => {
  const categories = loadCategories();
  const fixtures = [
    [{Category:'Steel Structure', Part:'Main Post', 'Post Kind':'Main Post'}, 'posts'],
    [{Category:'Steel Structure', Part:'Drive Pile', 'Post Kind':'Drive Pile'}, 'posts'],
    [{Category:'Steel Structure', Part:'Bearing Pile', 'Post Kind':'Bearing Pile'}, 'posts'],
    [{Category:'Steel Structure / Post', Part:'Main Post'}, 'posts'],
    [{Category:'Steel Structure / Post', Part:'Bearing Post'}, 'posts'],
    [{Category:'Steel Structure', Part:'Main Tube A'}, 'substructure'],
    [{Category:'Steel Structure', Part:'Limit Switch Holder'}, 'substructure'],
    [{Category:'Steel Structure / Substructure', Part:'Slew Drive Seat - Main Post'}, 'substructure'],
    [{Category:'Steel Structure / Substructure', Part:'Bearing Adapter', Description:'Connection to Bearing Post'}, 'substructure'],
    [{Category:'Steel Structure', Part:'Slew Drive Seat', Description:'2 x Main Post', 'Post Kind':0}, 'substructure'],
    [{Category:'Electrical', Part:'SOLTRK 3.0'}, 'soltrk'],
    [{Category:'Electrical', Part:'Cable Gland'}, 'cable_gland'],
    [{Category:'Electrical', Part:'Safeguard M'}, 'safeguard'],
    [{Category:'Electrical', Part:'Anemometer for Normal Weather'}, 'anemometer'],
    [{Category:'Electrical', Part:'Power Supply', Description:'Higeco GWC V4 4DIN'}, 'power_supply'],
    [{Category:'Electrical', Part:'Electrical Enclosure'}, 'electrical_enclosure'],
    [{Category:'Bearings', Part:'Bearing'}, 'bearing'],
    [{Category:'Fasteners / Junction Box', Part:'Bolt'}, 'fasteners'],
  ];
  for (const [record, expected] of fixtures) assert.equal(categories.leafKeyForPart(record), expected);
  assert.equal(categories.partMatchesCategory(fixtures[0][0], 'Posts'), true);
  assert.equal(categories.partMatchesCategory(fixtures[0][0], 'Substructure'), false);
  assert.equal(categories.partMatchesCategory(fixtures[5][0], 'Posts'), false);
  assert.equal(categories.partMatchesCategory(fixtures[5][0], 'Substructure'), true);
  const substructureParts = [
    ['k001147', 'Slew Drive Connection'], ['k001119', 'Bearing Adapter'],
    ['k001162', 'Slew Drive Seat'], ['k001576', 'Square Washer'],
    ['k001389', 'Limit Switch Holder'], ['k001397', 'Limit Switch Trigger'],
    ['k001568', 'SOLTRK 3.0 Holder'], ['k001511', 'Junction Box Holder'],
    ['k001479', 'Tube Spacer'],
  ];
  for (const [tag, part] of substructureParts) {
    const description = tag === 'k001119' ? 'Luma lateral pile head' : '';
    const category = ['k001479', 'k001576'].includes(tag) ? 'Fasteners / Legacy' : 'Steel Structure';
    assert.equal(categories.partMatchesCategory({TAG:tag, Category:category, Part:part, Description:description}, 'Substructure'), true, tag);
  }
  assert.equal(categories.partMatchesCategory({category:'Electrical', part:'Cable Gland'}, 'Cable Gland'), true);
  assert.equal(categories.partMatchesCategory({category:'Electrical', part:'Cable Gland'}, 'Safeguard'), false);
  assert.equal(categories.partMatchesCategory({category:'Cable Gland', part:'Cable Gland'}, 'Cable Gland'), true);
  assert.equal(categories.SECTION_CATEGORIES.electrical, undefined);
});
