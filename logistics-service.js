'use strict';

(function initializeLogisticsService(global) {
  const CURRENCIES = global.LumaCurrencyData.CODES;
  let cache = {status:'idle', rates:[], error:null, promise:null};

  class LogisticsServiceError extends Error {
    constructor(code, message) { super(message); this.name = 'LogisticsServiceError'; this.code = code; }
  }

  const getClient = () => global.LumaSupabase.getClient();
  function requireAdmin() {
    if (!global.LumaAuth?.isAdmin?.()) throw new LogisticsServiceError('forbidden', 'You do not have permission to change Logistics rates.');
  }
  function reportFailure(operation, error) { console.error(`Logistics ${operation} failed.`, {code:error?.code || 'unknown'}); }
  function mapError(operation, error) {
    reportFailure(operation, error);
    const message = String(error?.message || '');
    if (error?.code === '23505' && message.includes('logistics_rates_one_active_route')) return new LogisticsServiceError('active_conflict', 'Another active rate already exists for this Origin, Destination, and Cargo Group.');
    if (error?.code === '23505') return new LogisticsServiceError('duplicate_revision', 'This Logistics route revision already exists.');
    if (error?.code === '23514' || error?.code === '22P02') return new LogisticsServiceError('invalid_value', 'One or more Logistics values are invalid.');
    if (error?.code === '42501' || error?.code === 'PGRST301') return new LogisticsServiceError('forbidden', 'You do not have permission to change Logistics rates.');
    if (error?.code === 'PGRST116') return new LogisticsServiceError('not_found', 'The Logistics rate could not be found. Refresh and try again.');
    return new LogisticsServiceError('unavailable', 'Logistics data is unavailable. Please try again.');
  }

  function invalidate() { cache = {status:'idle', rates:[], error:null, promise:null}; }
  function snapshot() { return {status:cache.status, rates:cache.rates, error:cache.error}; }
  async function loadActiveRates({force=false}={}) {
    if (cache.status === 'loading' && cache.promise) return cache.promise;
    if (!force && cache.status === 'ready') return cache.rates;
    cache.status = 'loading';cache.error = null;
    cache.promise = getClient().from('logistics_rates').select('*').eq('active', true).order('origin_country').order('destination_country').then(({data,error}) => {
      if (error) throw error;cache.status = 'ready';cache.rates = data || [];cache.promise = null;return cache.rates;
    }).catch(error => {cache.status = 'error';cache.error = mapError('analysis load', error);cache.rates = [];cache.promise = null;throw cache.error;});
    return cache.promise;
  }
  async function listRates() {
    try {
      const {data,error} = await getClient().from('logistics_rates').select('*').order('updated_at', {ascending:false});
      if (error) throw error;return data || [];
    } catch (error) { throw error instanceof LogisticsServiceError ? error : mapError('load', error); }
  }
  const optionalNumber = value => value === null || value === undefined || String(value).trim() === '' ? null : Number(value);
  function normalizeRate(values) {
    const cargoGroup=String(values?.cargo_group || '').trim();
    const spec=global.LumaLogisticsCalculator.capacitySpec(cargoGroup);
    const capacityValue=optionalNumber(values?.capacity_value ?? values?.container_capacity_kg);
    return {
      origin_country:global.LumaCountryData.canonicalLogisticsOrigin(values?.origin_country),
      origin_city:String(values?.origin_city || '').trim(),
      transit_port_city:String(values?.transit_port_city || '').trim(),
      warehouse_city:String(values?.warehouse_city || '').trim(),
      destination_country:global.LumaCountryData.canonicalEuropeanCountry(values?.destination_country),
      destination_city:String(values?.destination_city || '').trim(),
      cargo_group:cargoGroup,
      route_method:String(values?.route_method || 'legacy').trim(),
      capacity_type:spec?.type || '',
      capacity_value:capacityValue,
      capacity_unit:spec?.unit || '',
      container_capacity_kg:spec?.type === 'weight' ? capacityValue : null,
      currency:String(values?.currency || '').trim().toUpperCase(),
      fob_per_container:optionalNumber(values?.fob_per_container),
      cif_per_container:optionalNumber(values?.cif_per_container),
      customs_clearance_per_container:optionalNumber(values?.customs_clearance_per_container),
      internal_site_per_container:optionalNumber(values?.internal_site_per_container),
      internal_warehouse_per_container:optionalNumber(values?.internal_warehouse_per_container),
      direct_transport_per_container:optionalNumber(values?.direct_transport_per_container),
      origin_to_port_per_container:optionalNumber(values?.origin_to_port_per_container),
      port_to_site_per_container:optionalNumber(values?.port_to_site_per_container),
      port_to_warehouse_per_container:optionalNumber(values?.port_to_warehouse_per_container),
      warehouse_unloading_per_container:optionalNumber(values?.warehouse_unloading_per_container),
      warehouse_truck_loading_per_container:optionalNumber(values?.warehouse_truck_loading_per_container),
      warehouse_storage_per_period:optionalNumber(values?.warehouse_storage_per_period),
      warehouse_storage_period_days:optionalNumber(values?.warehouse_storage_period_days),
      warehouse_storage_days:optionalNumber(values?.warehouse_storage_days),
      warehouse_to_site_per_container:optionalNumber(values?.warehouse_to_site_per_container),
      insurance_per_container:optionalNumber(values?.insurance_per_container),
      revision:String(values?.revision || '').trim().toUpperCase(),
      valid_from:String(values?.valid_from || '').trim() || null,
      valid_until:String(values?.valid_until || '').trim() || null,
      active:values?.active === true,
      notes:String(values?.notes || '').trim() || null,
    };
  }
  async function saveRate({rateId=null, values}) {
    requireAdmin();const payload = normalizeRate(values);
    try {
      const query = rateId ? getClient().from('logistics_rates').update(payload).eq('id', rateId) : getClient().from('logistics_rates').insert(payload);
      const {data,error} = await query.select('*').single();if (error) throw error;invalidate();global.LumaApp?.refreshLogistics?.();return data;
    } catch (error) { throw error instanceof LogisticsServiceError ? error : mapError(rateId ? 'update' : 'create', error); }
  }
  async function setRateActive(rateId, active) {
    requireAdmin();
    try {
      const {data,error} = await getClient().from('logistics_rates').update({active:active === true}).eq('id', rateId).select('id').single();
      if (error || !data) throw error || {code:'PGRST116'};invalidate();global.LumaApp?.refreshLogistics?.();
    } catch (error) { throw error instanceof LogisticsServiceError ? error : mapError(active ? 'reactivate' : 'deactivate', error); }
  }

  global.LumaLogisticsService = Object.freeze({CURRENCIES, LogisticsServiceError, snapshot, invalidate, loadActiveRates, listRates, saveRate, setRateActive});
})(window);
