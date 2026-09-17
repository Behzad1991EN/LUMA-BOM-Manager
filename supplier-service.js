'use strict';

(function initializeSupplierService(global) {
  const SUPPLIER_FIELDS = Object.freeze([
    'supplier_code', 'supplier_name', 'country', 'city', 'address',
    'contact_name', 'contact_email', 'contact_phone', 'website', 'notes', 'active',
  ]);

  class SupplierServiceError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'SupplierServiceError';
      this.code = code;
    }
  }

  function getClient() {
    return global.LumaSupabase.getClient();
  }

  function reportFailure(operation, error) {
    console.error(`Supplier ${operation} failed.`, {code: error?.code || 'unknown'});
  }

  function mapError(operation, error) {
    reportFailure(operation, error);
    if (error?.code === '23505') {
      return new SupplierServiceError('duplicate_code', 'Supplier Code already exists.');
    }
    if (error?.code === '23503') {
      return new SupplierServiceError('referenced', 'This supplier has Price List history and cannot be deleted. Set it inactive instead.');
    }
    if (error?.code === '42501' || error?.code === 'PGRST301') {
      return new SupplierServiceError('forbidden', 'You do not have permission to change supplier data.');
    }
    if (error?.code === 'P0002' || error?.code === 'PGRST116') {
      return new SupplierServiceError('not_found', 'The supplier could not be found. Refresh the list and try again.');
    }
    return new SupplierServiceError('unavailable', 'Supplier data is unavailable. Please try again.');
  }

  function requireAdmin() {
    if (!global.LumaAuth?.isAdmin?.()) {
      throw new SupplierServiceError('forbidden', 'You do not have permission to change supplier data.');
    }
  }

  function normalizeSupplierDetails(details) {
    const normalized = {};
    for (const field of SUPPLIER_FIELDS) {
      if (field === 'active') normalized.active = details?.active !== false;
      else normalized[field] = String(details?.[field] || '').trim();
    }
    normalized.supplier_code = normalized.supplier_code.toUpperCase();
    normalized.country = global.LumaCountryData?.canonicalCountry?.(normalized.country) || normalized.country;
    return normalized;
  }

  function normalizeCategories(categories) {
    return (Array.isArray(categories) ? categories : []).map(item => ({
      category: String(item.category || '').trim(),
      delivery_time_days: item.delivery_time_days === null || item.delivery_time_days === ''
        ? null
        : Number(item.delivery_time_days),
    }));
  }

  async function listSupplierMaster() {
    const client = getClient();
    try {
      const [catalogResult, suppliersResult] = await Promise.all([
        client
          .from('supplier_category_catalog')
          .select('category, sort_order, active')
          .eq('active', true)
          .order('sort_order', {ascending: true}),
        client
          .from('suppliers')
          .select(`
            id, supplier_code, supplier_name, country, city, address,
            contact_name, contact_email, contact_phone, website, notes, active,
            created_at, created_by, updated_at, updated_by,
            supplier_categories (
              id, supplier_id, category, delivery_time_days, active,
              created_at, updated_at
            )
          `)
          .order('supplier_code', {ascending: true}),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (suppliersResult.error) throw suppliersResult.error;
      return {
        categories: catalogResult.data || [],
        suppliers: suppliersResult.data || [],
      };
    } catch (error) {
      throw mapError('load', error);
    }
  }

  async function saveSupplier({supplierId = null, details, categories}) {
    requireAdmin();
    const client = getClient();
    try {
      const {data, error} = await client.rpc('save_supplier', {
        p_supplier: normalizeSupplierDetails(details),
        p_categories: normalizeCategories(categories),
        p_supplier_id: supplierId,
      });
      if (error) throw error;
      global.LumaCommercialAnalysis?.invalidate?.();
      return data;
    } catch (error) {
      if (error instanceof SupplierServiceError) throw error;
      throw mapError(supplierId ? 'update' : 'create', error);
    }
  }

  async function deleteSupplier(supplierId) {
    requireAdmin();
    const client = getClient();
    try {
      const {error} = await client
        .from('suppliers')
        .delete()
        .eq('id', supplierId);
      if (error) throw error;
      global.LumaCommercialAnalysis?.invalidate?.();
    } catch (error) {
      if (error instanceof SupplierServiceError) throw error;
      throw mapError('delete', error);
    }
  }

  global.LumaSupplierService = Object.freeze({
    SupplierServiceError,
    listSupplierMaster,
    saveSupplier,
    deleteSupplier,
  });
})(window);
