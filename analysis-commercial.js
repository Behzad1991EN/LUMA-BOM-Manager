'use strict';

(function initializeCommercialAnalysis(global) {
  const SECTION_CATEGORIES = global.LumaCommercialCategories.SECTION_CATEGORIES;
  const SPLIT_ELECTRICAL_CATEGORIES = new Set([
    'Limit Switch', 'SOLTRK', 'Junction Box', 'Cable Gland',
    'Safeguard', 'Anemometer', 'Power Supply', 'Electrical Enclosure',
  ]);

  let state = {
    status: 'idle',
    data: {suppliers: [], priceLists: []},
    error: null,
    promise: null,
  };

  function normalizeTag(value) {
    return String(value || '').trim().toLowerCase();
  }

  function snapshot() {
    return {
      status: state.status,
      error: state.error,
      suppliers: state.data.suppliers,
      priceLists: state.data.priceLists,
    };
  }

  function reset() {
    state = {
      status: 'idle',
      data: {suppliers: [], priceLists: []},
      error: null,
      promise: null,
    };
  }

  function invalidate() {
    if (state.status !== 'loading') reset();
  }

  async function load({force = false} = {}) {
    if (state.status === 'loading' && state.promise) return state.promise;
    if (!force && state.status === 'ready') return state.data;

    state.status = 'loading';
    state.error = null;
    state.promise = global.LumaPriceListService.loadActiveAnalysisData()
      .then(data => {
        state.data = {
          suppliers: Array.isArray(data?.suppliers) ? data.suppliers : [],
          priceLists: Array.isArray(data?.priceLists) ? data.priceLists : [],
        };
        state.status = 'ready';
        state.promise = null;
        return state.data;
      })
      .catch(error => {
        state.data = {suppliers: [], priceLists: []};
        state.status = 'error';
        state.error = error;
        state.promise = null;
        throw error;
      });
    return state.promise;
  }

  function validityStatus(priceList, today = new Date()) {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    if (priceList?.valid_from && localDate < priceList.valid_from) return 'Not Yet Valid';
    if (priceList?.valid_until && localDate > priceList.valid_until) return 'Expired';
    return 'Current';
  }

  function eligibleSuppliersFor(category) {
    if (!category || state.status !== 'ready') return [];
    const allowsLegacyElectrical = SPLIT_ELECTRICAL_CATEGORIES.has(category);
    const activeLists = state.data.priceLists.filter(list => list?.active === true);
    return state.data.suppliers
      .filter(supplier => supplier?.active === true)
      .map(supplier => {
        const assignments = supplier.supplier_categories || [];
        const categoryAssignment = assignments.find(assignment =>
          assignment?.active === true && assignment.category === category
        ) || (allowsLegacyElectrical ? assignments.find(assignment =>
          assignment?.active === true && assignment.category === 'Electrical'
        ) : null);
        const priceList = activeLists.find(list =>
          list.supplier_id === supplier.id && list.category === category
        ) || (allowsLegacyElectrical ? activeLists.find(list =>
          list.supplier_id === supplier.id && list.category === 'Electrical'
        ) : null);
        return categoryAssignment && priceList ? {supplier, categoryAssignment, priceList} : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(a.supplier.supplier_code || '').localeCompare(String(b.supplier.supplier_code || '')));
  }

  function buildSection(sectionKey, supplierId, bomRows) {
    const category = SECTION_CATEGORIES[sectionKey] || null;
    const eligibleSuppliers = eligibleSuppliersFor(category);
    const requestedSupplierId = String(supplierId || '');
    const selection = eligibleSuppliers.find(entry => String(entry.supplier.id) === requestedSupplierId) || null;
    const invalidSelection = Boolean(requestedSupplierId && state.status === 'ready' && !selection);
    // Enforce the section boundary here as well as in the page renderer. A
    // caller can pass the complete BOM without allowing unrelated rows into a
    // commercial section or its missing-price report.
    const sourceRows = (Array.isArray(bomRows) ? bomRows : []).filter(row =>
      global.LumaCommercialCategories.leafKeyForPart(row) === sectionKey
    );
    const pricesByTag = new Map();

    if (selection) {
      for (const item of selection.priceList.price_list_items || []) {
        const tag = normalizeTag(item?.tag);
        if (tag) pricesByTag.set(tag, item);
      }
    }

    const rows = sourceRows.map(row => {
      const tag = normalizeTag(row?.TAG);
      const priceItem = selection && tag ? pricesByTag.get(tag) || null : null;
      const rawPrice = priceItem?.unit_price;
      const hasPrice = rawPrice !== null && rawPrice !== undefined && String(rawPrice).trim() !== '' && Number.isFinite(Number(rawPrice));
      const quantity = Number(row?.['Total Qty']);
      const validQuantity = Number.isFinite(quantity) ? quantity : 0;
      return {
        source: row,
        tag: String(row?.TAG || '').trim(),
        normalizedTag: tag,
        description: String(row?.Description || row?.['Part Name'] || row?.Part || '').trim(),
        quantity: validQuantity,
        unit: String(priceItem?.unit || row?.Unit || '').trim(),
        unitPrice: hasPrice ? Number(rawPrice) : null,
        total: hasPrice ? validQuantity * Number(rawPrice) : null,
        missingPrice: Boolean(selection && validQuantity > 0 && !hasPrice),
      };
    });
    const missingPriceRows = rows.filter(row => row.missingPrice);
    const pricedRows = rows.filter(row => row.total !== null && row.quantity > 0);
    const subtotal = pricedRows.reduce((sum, row) => sum + row.total, 0);

    return {
      status: state.status,
      error: state.error,
      sectionKey,
      category,
      eligibleSuppliers,
      requestedSupplierId,
      selection,
      invalidSelection,
      rows,
      missingPriceRows,
      pricedRows,
      subtotal,
      currency: selection?.priceList?.currency || '',
      validityStatus: selection ? validityStatus(selection.priceList) : '',
    };
  }

  global.LumaCommercialAnalysis = Object.freeze({
    SECTION_CATEGORIES,
    normalizeTag,
    snapshot,
    reset,
    invalidate,
    load,
    buildSection,
    validityStatus,
  });
})(window);
