'use strict';

(function initializePriceListService(global) {
  const CURRENCIES = global.LumaCurrencyData.CODES;

  class PriceListServiceError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'PriceListServiceError';
      this.code = code;
    }
  }

  function getClient() {
    return global.LumaSupabase.getClient();
  }

  function requireAdmin() {
    if (!global.LumaAuth?.isAdmin?.()) {
      throw new PriceListServiceError('forbidden', 'You do not have permission to modify Price Lists.');
    }
  }

  function reportFailure(operation, error) {
    console.error(`Price List ${operation} failed.`, {code: error?.code || 'unknown'});
  }

  function mapError(operation, error) {
    reportFailure(operation, error);
    const message = String(error?.message || '');
    if (error?.code === '23505' && message.includes('price_lists_supplier_category_revision_unique')) {
      return new PriceListServiceError('duplicate_revision', 'A Price List with this supplier, category, and Document No. already exists.');
    }
    if (error?.code === '23505' && message.includes('price_list_items_price_list_tag_unique')) {
      return new PriceListServiceError('duplicate_tag', 'The same TAG cannot appear twice in one Price List.');
    }
    if (error?.code === '23505' && message.includes('price_lists_one_active_per_supplier_category')) {
      return new PriceListServiceError('active_conflict', 'Another active Price List was saved at the same time. Refresh and try again.');
    }
    if (error?.code === 'P2001' || error?.code === '23503') {
      return new PriceListServiceError('invalid_category', 'This supplier is not configured for the selected category.');
    }
    if (error?.code === 'P2002') {
      return new PriceListServiceError('invalid_dates', 'Valid Until cannot be before Valid From.');
    }
    if (error?.code === '23514' || error?.code === '22P02') {
      return new PriceListServiceError('invalid_value', 'One or more Price List values are invalid.');
    }
    if (error?.code === '42501' || error?.code === 'PGRST301') {
      return new PriceListServiceError('forbidden', 'You do not have permission to modify Price Lists.');
    }
    if (error?.code === 'P0002' || error?.code === 'PGRST116') {
      return new PriceListServiceError('not_found', 'The Price List could not be found. Refresh and try again.');
    }
    return new PriceListServiceError('unavailable', 'Price List data is unavailable. Please try again.');
  }

  function normalizeHeader(header) {
    return {
      supplier_id: String(header?.supplier_id || '').trim(),
      category: String(header?.category || '').trim(),
      revision: String(header?.revision || '').trim().toUpperCase(),
      currency: String(header?.currency || '').trim().toUpperCase(),
      valid_from: String(header?.valid_from || '').trim(),
      valid_until: String(header?.valid_until || '').trim(),
      notes: String(header?.notes || '').trim(),
      active: header?.active === true,
    };
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : []).map(item => ({
      tag: String(item?.tag || '').trim().toLowerCase(),
      description: String(item?.description || '').trim(),
      unit: String(item?.unit || '').trim(),
      unit_price: item?.unit_price === null || String(item?.unit_price ?? '').trim() === ''
        ? null
        : String(item.unit_price).trim(),
    }));
  }

  async function listPriceListMaster() {
    const client = getClient();
    try {
      const [suppliersResult, priceListsResult] = await Promise.all([
        client
          .from('suppliers')
          .select(`
            id, supplier_code, supplier_name, country, active,
            supplier_categories (category, active)
          `)
          .order('supplier_code', {ascending: true}),
        client
          .from('price_lists')
          .select(`
            id, supplier_id, category, revision, currency,
            valid_from, valid_until, active, notes,
            created_at, created_by, updated_at, updated_by,
            supplier:suppliers (id, supplier_code, supplier_name, country, active),
            price_list_items (
              id, price_list_id, tag, description, unit, unit_price,
              created_at, created_by, updated_at, updated_by
            )
          `)
          .order('updated_at', {ascending: false}),
      ]);
      if (suppliersResult.error) throw suppliersResult.error;
      if (priceListsResult.error) throw priceListsResult.error;
      return {
        suppliers: suppliersResult.data || [],
        priceLists: priceListsResult.data || [],
      };
    } catch (error) {
      throw mapError('load', error);
    }
  }

  async function loadActiveAnalysisData() {
    const client = getClient();
    try {
      const [suppliersResult, priceListsResult] = await Promise.all([
        client
          .from('suppliers')
          .select(`
            id, supplier_code, supplier_name, country, active,
            supplier_categories (category, delivery_time_days, active)
          `)
          .eq('active', true)
          .order('supplier_code', {ascending: true}),
        client
          .from('price_lists')
          .select(`
            id, supplier_id, category, revision, currency,
            valid_from, valid_until, active,
            price_list_items (id, tag, description, unit, unit_price)
          `)
          .eq('active', true),
      ]);
      if (suppliersResult.error) throw suppliersResult.error;
      if (priceListsResult.error) throw priceListsResult.error;
      return {
        suppliers: suppliersResult.data || [],
        priceLists: priceListsResult.data || [],
      };
    } catch (error) {
      throw mapError('analysis load', error);
    }
  }

  async function savePriceList({priceListId = null, header, items}) {
    requireAdmin();
    try {
      const {data, error} = await getClient().rpc('save_price_list', {
        p_price_list: normalizeHeader(header),
        p_items: normalizeItems(items),
        p_price_list_id: priceListId,
      });
      if (error) throw error;
      global.LumaCommercialAnalysis?.invalidate?.();
      return data;
    } catch (error) {
      if (error instanceof PriceListServiceError) throw error;
      throw mapError(priceListId ? 'update' : 'create', error);
    }
  }

  async function archivePriceList(priceListId) {
    requireAdmin();
    try {
      const {data, error} = await getClient()
        .from('price_lists')
        .update({active: false})
        .eq('id', priceListId)
        .select('id')
        .single();
      if (error || !data) throw error || {code: 'P0002'};
      global.LumaCommercialAnalysis?.invalidate?.();
    } catch (error) {
      if (error instanceof PriceListServiceError) throw error;
      throw mapError('archive', error);
    }
  }

  global.LumaPriceListService = Object.freeze({
    CURRENCIES,
    PriceListServiceError,
    listPriceListMaster,
    loadActiveAnalysisData,
    savePriceList,
    archivePriceList,
  });
})(window);
