'use strict';

(function initializePartMasterService(global) {
  const state = {
    rows:[], loaded:false, loading:null, listeners:new Set(), byTag:new Map(), byCategory:new Map(),
  };
  const client = () => global.LumaSupabase.getClient();
  const text = value => String(value ?? '').trim();
  const normalizedMasterText = value => text(value)
    .replace(/Main\s+Post/gi, 'Drive Pile')
    .replace(/Bearing\s+Post/gi, 'Bearing Pile')
    .replace(/Main\s+(?:Beam|Tube)/gi, 'Torque Tube')
    .replace(/13\s*[x×]\s*43/gi, '13 × 43');
  const normalized = value => normalizedMasterText(value).toLowerCase().replace(/\s+/g, ' ');
  const categoryOverridesByTag = Object.freeze({
    k001576:'Steel Structure / Substructure',
  });
  const normalizedCategory = row => {
    const category=text(row?.category);
    // Keep the explicitly named Tube Spacer connection category as supplied.
    if(text(row?.tag).toLowerCase()==='k001479' && category==='Fasteners / Main Tube - Main Tube')return category;
    return categoryOverridesByTag[text(row?.tag).toLowerCase()] || normalizedMasterText(category);
  };

  function publicMessage(error) {
    console.error('Part Master database operation failed.', {code:error?.code || 'unknown'});
    if (error?.code === '23505' && String(error?.message || '').includes('post_configuration')) {
      return 'More than one active Part Master record matches this post configuration.';
    }
    if (error?.code === '23505') return 'This TAG already exists in Part Master.';
    if (error?.code === '23502' || error?.code === '23514') return 'Complete all required Part Master fields with valid values.';
    if (error?.code === '42501' || error?.code === 'PGRST301') return 'You do not have permission to change Part Master data.';
    return 'Unable to load Part Master from the database. Engineering/BOM generation is temporarily unavailable.';
  }

  const toAppRecord = row => Object.freeze({
    id:row.id, Part:normalizedMasterText(row.part), TAG:row.tag || '', Description:normalizedMasterText(row.description),
    'Part Number':text(row.tag).toLowerCase()==='k001393'&&row.part_number==='EAPZFR55100000'?'ELPZFR55100000':row.part_number || '', Category:normalizedCategory(row), Unit:row.unit || '',
    Material:normalizedMasterText(row.material), Weight:row.weight ?? '',
    'Calculation Note':normalizedMasterText(row.calculation_note), Active:row.active !== false,
    'Post Kind':normalizedMasterText(row.post_kind), 'Foundation Method':row.foundation_method || '',
    'Foundation Depth mm':row.foundation_depth_mm ?? '', 'Profile Type':normalizedMasterText(row.profile_type),
    'Profile Details':normalizedMasterText(row.profile_details), 'Overall Length mm':row.overall_length_mm ?? '',
    created_at:row.created_at || '', created_by:row.created_by || '',
    updated_at:row.updated_at || '', updated_by:row.updated_by || '',
  });

  function rebuildIndexes(rows) {
    state.rows = Object.freeze(rows.slice());
    state.byTag = new Map();
    state.byCategory = new Map();
    for (const row of state.rows) {
      const tag = normalized(row.TAG);
      if (tag) state.byTag.set(tag, row);
      const category = normalized(row.Category);
      if (!state.byCategory.has(category)) state.byCategory.set(category, []);
      state.byCategory.get(category).push(row);
    }
    state.loaded = true;
  }

  function notify() {
    for (const listener of state.listeners) {
      try { listener(getAllParts()); } catch (error) { console.error('Part Master cache listener failed.', error); }
    }
  }

  async function loadPartMaster({force=false} = {}) {
    if (state.loaded && !force) return getAllParts();
    if (state.loading) return state.loading;
    state.loading = (async () => {
      const {data, error} = await client().from('part_master').select('*').order('category').order('tag');
      if (error) {
        reset();
        throw new Error(publicMessage(error));
      }
      if (!Array.isArray(data) || !data.length) {
        reset();
        throw new Error('Part Master could not be loaded. BOM generation is unavailable.');
      }
      rebuildIndexes(data.map(toAppRecord));
      notify();
      return getAllParts();
    })();
    try { return await state.loading; } finally { state.loading = null; }
  }

  function getAllParts() { return state.rows.slice(); }
  function getActiveParts() { return state.rows.filter(row => row.Active !== false); }
  function getPartByTag(tag) { return state.byTag.get(normalized(tag)) || null; }
  function getPartsByCategory(category, {activeOnly=true} = {}) {
    const rows = state.byCategory.get(normalized(category)) || [];
    return rows.filter(row => !activeOnly || row.Active !== false).slice();
  }

  function findPostConfiguration({postKind, foundationMethod, foundationDepthMm, profileType}) {
    const matches = state.rows.filter(row => row.Active !== false
      && normalized(row['Post Kind']) === normalized(postKind)
      && normalized(row['Foundation Method']) === normalized(foundationMethod)
      && Number(row['Foundation Depth mm']) === Number(foundationDepthMm)
      && normalized(row['Profile Type']) === normalized(profileType)
      && text(row.TAG));
    if (!matches.length) return Object.freeze({status:'missing', part:null, matches:[]});
    if (matches.length > 1) return Object.freeze({status:'ambiguous', part:null, matches:matches.slice()});
    return Object.freeze({status:'found', part:matches[0], matches:matches.slice()});
  }

  function numberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }

  function payload(record, {creating=false} = {}) {
    const postKind = normalizedMasterText(record['Post Kind']) || null;
    const tag = text(record.TAG).toLowerCase();
    if (creating && !tag) throw new Error('TAG is required for a new Part Master record.');
    if (!text(record.Part) || !text(record.Description) || !text(record.Category)) {
      throw new Error('Part, Description, and Category are required.');
    }
    return {
      part:normalizedMasterText(record.Part), tag:tag || null, description:normalizedMasterText(record.Description),
      part_number:text(record['Part Number']) || null, category:normalizedMasterText(record.Category),
      unit:text(record.Unit) || null, material:normalizedMasterText(record.Material) || null,
      weight:numberOrNull(record.Weight), calculation_note:normalizedMasterText(record['Calculation Note']) || null,
      active:record.Active !== false, post_kind:postKind,
      foundation_method:postKind ? text(record['Foundation Method']) || null : null,
      foundation_depth_mm:postKind ? numberOrNull(record['Foundation Depth mm']) : null,
      profile_type:postKind ? normalizedMasterText(record['Profile Type']) || null : null,
      profile_details:postKind ? normalizedMasterText(record['Profile Details']) || null : null,
      overall_length_mm:postKind ? numberOrNull(record['Overall Length mm']) : null,
    };
  }

  function mergeDatabaseRow(databaseRow) {
    const row = toAppRecord(databaseRow);
    const rows = state.rows.filter(existing => existing.id !== row.id);
    rows.push(row);
    rows.sort((a, b) => `${a.Category}\u0000${a.TAG}`.localeCompare(`${b.Category}\u0000${b.TAG}`, undefined, {numeric:true}));
    rebuildIndexes(rows);
    notify();
    return row;
  }

  function requireAdmin() {
    if (!global.LumaAuth?.isAdmin?.()) throw new Error('Administrator access is required.');
  }

  async function createPart(record) {
    requireAdmin();
    const {data, error} = await client().from('part_master').insert(payload(record, {creating:true})).select().single();
    if (error) throw new Error(publicMessage(error));
    return mergeDatabaseRow(data);
  }

  async function updatePart(id, record) {
    requireAdmin();
    const {data, error} = await client().from('part_master').update(payload(record)).eq('id', id).select().single();
    if (error) throw new Error(publicMessage(error));
    return mergeDatabaseRow(data);
  }

  async function save(record) { return record.id ? updatePart(record.id, record) : createPart(record); }

  async function setPartActive(id, active) {
    requireAdmin();
    const {data, error} = await client().from('part_master').update({active:!!active}).eq('id', id).select().single();
    if (error) throw new Error(publicMessage(error));
    return mergeDatabaseRow(data);
  }

  async function list({includeInactive=false, force=false} = {}) {
    await loadPartMaster({force});
    return includeInactive ? getAllParts() : getActiveParts();
  }

  function subscribe(listener) {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  }

  function reset() {
    state.rows = [];
    state.loaded = false;
    state.byTag = new Map();
    state.byCategory = new Map();
  }

  global.LumaPartMasterService = Object.freeze({
    loadPartMaster, list, getAllParts, getActiveParts, getPartByTag,
    getPartsByCategory, findPostConfiguration, createPart, updatePart, save,
    setPartActive, deactivate:id => setPartActive(id, false),
    reactivate:id => setPartActive(id, true), subscribe, reset,
  });
})(window);
