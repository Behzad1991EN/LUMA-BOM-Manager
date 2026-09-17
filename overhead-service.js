'use strict';

(function initializeOverheadService(global) {
  const ITEM_DEFAULTS = Object.freeze([
    ['OH-001', 'Other purchases', 54.45],
    ['OH-002', 'IT equipment/materials (CE)', 961.34],
    ['OH-003', 'Stationery and printed materials', 1494.63],
    ['OH-004', 'Assets/goods below one million', 8273.80],
    ['OH-005', "Fuel for administrator's car", 395.69],
    ['OH-006', 'Fuel and lubricant for AMM Kant car', 7436.08],
    ['OH-007', 'Technical consulting', 84558.36],
    ['OH-008', 'Maintenance and repairs on owned assets', 182.00],
    ['OH-009', 'Travel expenses', 18574.51],
    ['OH-010', 'Maintenance on third-party assets', 3617.50],
    ['OH-011', 'Car maintenance and repairs', 1649.14],
    ['OH-012', 'Motorway tolls', 1700.38],
    ['OH-013', 'Car insurance', 5150.62],
    ['OH-014', 'Car parking', 821.96],
    ['OH-015', 'Management costs for mixed-use vehicles', 713.61],
    ['OH-016', 'Advertising', 11269.03],
    ['OH-017', 'Postal expenses', 160.97],
    ['OH-018', 'Entertainment / representation expenses', 31.74],
    ['OH-019', 'Representation service expenses', 19340.95],
    ['OH-020', 'Various staff costs', 26.00],
    ['OH-021', 'Staff training', 218.00],
    ['OH-022', 'Mileage reimbursement for employees using their own car', 0.00],
    ['OH-023', 'Consulting fees / charges', 12160.90],
    ['OH-024', 'Business trips / travel assignments', 2130.00],
    ['OH-025', 'Software/program subscription fees', 19303.29],
    ['OH-026', 'Software support', 406.60],
    ['OH-027', 'Insurance', 20537.01],
    ['OH-028', 'Other services', 21140.78],
    ['OH-029', 'Cleaning expenses', 4794.00],
    ['OH-030', 'Employee liability insurance', 183.13],
    ['OH-031', 'Rent expenses', 8586.00],
    ['OH-032', 'Leasing fees', 9383.33],
    ['OH-033', 'Car rental', 9278.81],
    ['OH-034', 'Truck rental', 75.00],
    ['OH-035', 'Expense reimbursement for third-party services', 63.65],
    ['OH-036', 'Restaurants and hotels', 7902.96],
    ['OH-037', 'Trade fairs and promotions', 4997.91],
    ['OH-038', 'Membership fees', 3649.37],
    ['OH-039', 'Stamp duties', 24.00],
    ['OH-040', 'Vehicle tax for mixed-use vehicles', 280.08],
    ['OH-041', 'Condominium/building service charges', 6325.00],
  ].map(([code, description, yearly_cost_eur]) => Object.freeze({code, description, yearly_cost_eur})));
  const DEFAULTS = Object.freeze({
    currency: 'EUR',
    items: ITEM_DEFAULTS,
    valid_from: '',
    valid_until: '',
    ksi_annual_project_capacity_mwp: 120,
    ksi_annual_overhead_eur: ITEM_DEFAULTS.reduce((sum, item) => sum + item.yearly_cost_eur, 0),
  });
  let cache = {status: 'idle', settings: cloneSettings(DEFAULTS), error: null, promise: null};

  class OverheadServiceError extends Error {
    constructor(code, message) { super(message); this.name = 'OverheadServiceError'; this.code = code; }
  }
  const getClient = () => global.LumaSupabase.getClient();
  const isAdmin = () => global.LumaAuth?.isAdmin?.() === true;
  function cloneSettings(value) { return {...value, items: (value.items || []).map(item => ({...item}))}; }
  function number(value, fallback) { if (value === '' || value === null || value === undefined) return fallback; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function normalizeDate(value) { const text = String(value ?? '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''; }
  function normalizeItems(items) {
    const source = Array.isArray(items) && items.length ? items : ITEM_DEFAULTS;
    return source.map((item, index) => ({code: String(item?.code ?? ITEM_DEFAULTS[index]?.code ?? `OH-${String(index + 1).padStart(3, '0')}`).trim(), description: String(item?.description ?? ITEM_DEFAULTS[index]?.description ?? '').trim(), yearly_cost_eur: number(item?.yearly_cost_eur, 0)}));
  }
  function normalizeSettings(value) {
    const source = value && typeof value === 'object' ? value : {}, items = normalizeItems(source.items);
    return {currency: 'EUR', items, valid_from: normalizeDate(source.valid_from), valid_until: normalizeDate(source.valid_until), ksi_annual_project_capacity_mwp: number(source.ksi_annual_project_capacity_mwp, DEFAULTS.ksi_annual_project_capacity_mwp), ksi_annual_overhead_eur: items.reduce((sum, item) => sum + item.yearly_cost_eur, 0)};
  }
  function validateSettings(value) {
    const settings = normalizeSettings(value);
    if (!settings.items.length) throw new OverheadServiceError('invalid_items', 'At least one Overhead item is required.');
    const codes = new Set();
    settings.items.forEach((item, index) => {
      if (!item.code) throw new OverheadServiceError('invalid_code', `Overhead row ${index + 1} requires a Code.`);
      if (codes.has(item.code.toLowerCase())) throw new OverheadServiceError('duplicate_code', `Overhead Code ${item.code} is duplicated.`);
      codes.add(item.code.toLowerCase());
      if (!item.description) throw new OverheadServiceError('invalid_description', `Overhead row ${index + 1} requires a description.`);
      if (!Number.isFinite(item.yearly_cost_eur) || item.yearly_cost_eur < 0) throw new OverheadServiceError('invalid_cost', `${item.description} yearly cost must be zero or greater.`);
    });
    if (settings.ksi_annual_project_capacity_mwp <= 0) throw new OverheadServiceError('invalid_capacity', 'KSI Project Capacity per Year must be greater than zero.');
    if (settings.valid_from && settings.valid_until && settings.valid_until < settings.valid_from) throw new OverheadServiceError('invalid_dates', 'Valid Till cannot be before Valid From.');
    return settings;
  }
  function mapError(operation, error) {
    if (error instanceof OverheadServiceError) return error;
    console.error(`Overhead settings ${operation} failed.`, {code: error?.code || 'unknown'});
    if (error?.code === '42501' || error?.code === 'PGRST301') return new OverheadServiceError('forbidden', 'You do not have permission to change Overhead settings.');
    if (error?.code === '23514' || error?.code === '22P02') return new OverheadServiceError('invalid_value', 'The Overhead settings contain an invalid value.');
    return new OverheadServiceError('unavailable', 'Overhead settings are unavailable. Please try again.');
  }
  function snapshot() { return {status: cache.status, settings: cloneSettings(cache.settings), error: cache.error}; }
  function invalidate() { cache = {status: 'idle', settings: cloneSettings(DEFAULTS), error: null, promise: null}; }
  async function loadSettings({force = false} = {}) {
    if (cache.status === 'loading' && cache.promise) return cache.promise;
    if (!force && cache.status === 'ready') return cloneSettings(cache.settings);
    cache.status = 'loading'; cache.error = null;
    cache.promise = getClient().from('commercial_settings').select('setting_value').eq('area', 'overhead').eq('setting_key', 'defaults').eq('active', true).maybeSingle().then(({data, error}) => {
      if (error) throw error;
      if (!data?.setting_value) throw new OverheadServiceError('missing', 'Overhead settings have not been configured.');
      cache.settings = validateSettings(data.setting_value); cache.status = 'ready'; cache.error = null; cache.promise = null;
      return cloneSettings(cache.settings);
    }).catch(error => { cache.status = 'error'; cache.error = mapError('load', error); cache.promise = null; throw cache.error; });
    return cache.promise;
  }
  async function saveSettings(values) {
    if (!isAdmin()) throw new OverheadServiceError('forbidden', 'You do not have permission to change Overhead settings.');
    const settings = validateSettings(values);
    try {
      const {data, error} = await getClient().from('commercial_settings').upsert({area: 'overhead', setting_key: 'defaults', setting_value: settings, active: true}, {onConflict: 'area,setting_key'}).select('setting_value').single();
      if (error) throw error;
      cache = {status: 'ready', settings: validateSettings(data?.setting_value || settings), error: null, promise: null};
      global.LumaApp?.refreshOverhead?.();
      return cloneSettings(cache.settings);
    } catch (error) { throw mapError('save', error); }
  }
  global.LumaOverheadService = Object.freeze({ITEM_DEFAULTS, DEFAULTS, OverheadServiceError, normalizeSettings, validateSettings, snapshot, invalidate, loadSettings, saveSettings});
})(window);
