'use strict';

(function initializePriceListAdministration(global) {
  const state = {
    root: null,
    onBack: null,
    suppliers: [],
    priceLists: [],
    partMasterItems: [],
    selectedId: null,
    supplierFilter: '',
    categoryFilter: '',
    activeFilter: 'all',
    search: '',
    notice: null,
    editorItems: [],
    itemSearch: '',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function isAdmin() {
    return global.LumaAuth?.isAdmin?.() === true;
  }

  function reset() {
    state.root = null;
    state.onBack = null;
    state.suppliers = [];
    state.priceLists = [];
    state.partMasterItems = [];
    state.selectedId = null;
    state.supplierFilter = '';
    state.categoryFilter = '';
    state.activeFilter = 'all';
    state.search = '';
    state.notice = null;
    state.editorItems = [];
    state.itemSearch = '';
  }

  function backButton(label) {
    return `<button class="admin-back-button" type="button" data-price-list-back aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>`;
  }

  function supplierName(priceList) {
    const supplier = priceList.supplier || state.suppliers.find(item => item.id === priceList.supplier_id);
    return supplier ? `${supplier.supplier_code} — ${supplier.supplier_name}` : 'Unknown supplier';
  }

  function supplierCategories(supplierId) {
    const supplier = state.suppliers.find(item => item.id === supplierId);
    return (supplier?.supplier_categories || [])
      .filter(item => item.active !== false)
      .map(item => item.category)
      .sort((a, b) => a.localeCompare(b));
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  }

  function renderLoading(message = 'Loading Price Lists...') {
    if (!state.root || !isAdmin()) return;
    state.root.innerHTML = `<div class="admin-subpage-nav">${backButton('Back to Administration')}</div><div class="supplier-loading" role="status">${escapeHtml(message)}</div>`;
    state.root.querySelector('[data-price-list-back]').addEventListener('click', () => state.onBack?.());
  }

  async function loadMaster() {
    const result = await global.LumaPriceListService.listPriceListMaster();
    if (!isAdmin()) return false;
    state.suppliers = result.suppliers;
    state.priceLists = result.priceLists;
    return true;
  }

  function renderLoadError(message) {
    if (!state.root || !isAdmin()) return;
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Administration')}</div>
      <div class="supplier-error" role="alert"><strong>Price Lists could not be loaded.</strong><span>${escapeHtml(message)}</span><button type="button" data-price-list-retry>Try Again</button></div>`;
    state.root.querySelector('[data-price-list-back]').addEventListener('click', () => state.onBack?.());
    state.root.querySelector('[data-price-list-retry]').addEventListener('click', openList);
  }

  async function openList() {
    if (!isAdmin()) return;
    renderLoading();
    try {
      if (await loadMaster()) renderList();
    } catch (error) {
      renderLoadError(error.message);
    }
  }

  function availableFilterCategories() {
    if (state.supplierFilter) return supplierCategories(state.supplierFilter);
    return [...new Set(state.priceLists.map(item => item.category))].sort((a, b) => a.localeCompare(b));
  }

  function filteredPriceLists() {
    const query = state.search.trim().toLowerCase();
    return state.priceLists.filter(priceList => {
      if (state.supplierFilter && priceList.supplier_id !== state.supplierFilter) return false;
      if (state.categoryFilter && priceList.category !== state.categoryFilter) return false;
      if (state.activeFilter === 'active' && !priceList.active) return false;
      if (state.activeFilter === 'inactive' && priceList.active) return false;
      if (!query) return true;
      return `${supplierName(priceList)} ${priceList.category} ${priceList.revision} ${priceList.currency} ${priceList.notes || ''}`.toLowerCase().includes(query);
    });
  }

  function tableRowsHtml() {
    const rows = filteredPriceLists();
    if (!rows.length) return '<tr><td class="empty-table-message" colspan="11">No Price Lists match the current filters.</td></tr>';
    return rows.map((priceList, index) => {
      const selected = priceList.id === state.selectedId;
      return `<tr class="price-list-row${selected ? ' row-selected' : ''}${priceList.active ? '' : ' price-list-inactive-row'}" data-price-list-id="${escapeHtml(priceList.id)}">
        <td>${index + 1}</td>
        <td><input type="radio" name="selectedPriceList" aria-label="Select ${escapeHtml(priceList.revision)}" ${selected ? 'checked' : ''}></td>
        <td>${escapeHtml(supplierName(priceList))}</td><td>${escapeHtml(priceList.category)}</td><td><strong>${escapeHtml(priceList.revision)}</strong></td>
        <td>${escapeHtml(global.LumaCurrencyData.display(priceList.currency))}</td><td>${escapeHtml(priceList.valid_from || '—')}</td><td>${escapeHtml(priceList.valid_until || '—')}</td>
        <td><span class="supplier-status ${priceList.active ? 'active' : 'inactive'}">${priceList.active ? 'Active' : 'Inactive'}</span></td>
        <td>${(priceList.price_list_items || []).length}</td><td>${escapeHtml(formatDate(priceList.updated_at))}</td>
      </tr>`;
    }).join('');
  }

  function bindRows() {
    state.root.querySelectorAll('[data-price-list-id]').forEach(row => row.addEventListener('click', () => {
      state.selectedId = row.dataset.priceListId;
      renderTableBody();
    }));
  }

  function renderTableBody() {
    const body = state.root?.querySelector('#priceListTableBody');
    if (!body) return;
    body.innerHTML = tableRowsHtml();
    bindRows();
    updateActions();
  }

  function selectedPriceList() {
    return state.priceLists.find(item => item.id === state.selectedId) || null;
  }

  function updateActions() {
    const selected = selectedPriceList();
    const edit = state.root?.querySelector('[data-price-list-edit]');
    const duplicate = state.root?.querySelector('[data-price-list-duplicate]');
    const archive = state.root?.querySelector('[data-price-list-archive]');
    if (edit) edit.disabled = !selected;
    if (duplicate) duplicate.disabled = !selected;
    if (archive) archive.disabled = !selected || !selected.active;
  }

  function renderCategoryFilter() {
    const select = state.root?.querySelector('[data-price-list-category-filter]');
    if (!select) return;
    const categories = availableFilterCategories();
    if (state.categoryFilter && !categories.includes(state.categoryFilter)) state.categoryFilter = '';
    select.innerHTML = `<option value="">All Categories</option>${categories.map(category => `<option value="${escapeHtml(category)}" ${category === state.categoryFilter ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}`;
  }

  function renderList() {
    if (!state.root || !isAdmin()) return;
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Administration')}</div>
      <div class="supplier-page-header"><div><h2 class="table-title">Supplier Price Lists</h2><p class="table-subtitle">Manage supplier/category price-list documents.</p></div><button class="export" type="button" data-price-list-add>Add Price List</button></div>
      ${state.notice ? `<p class="supplier-notice ${escapeHtml(state.notice.kind)}" role="status">${escapeHtml(state.notice.message)}</p>` : ''}
      <div class="price-list-filters">
        <label><span>Supplier</span><select data-price-list-supplier-filter><option value="">All Suppliers</option>${state.suppliers.map(supplier => `<option value="${escapeHtml(supplier.id)}" ${supplier.id === state.supplierFilter ? 'selected' : ''}>${escapeHtml(`${supplier.supplier_code} — ${supplier.supplier_name}`)}</option>`).join('')}</select></label>
        <label><span>Category</span><select data-price-list-category-filter></select></label>
        <label><span>Status</span><select data-price-list-active-filter><option value="all">All</option><option value="active" ${state.activeFilter === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${state.activeFilter === 'inactive' ? 'selected' : ''}>Inactive</option></select></label>
        <label><span>Search</span><input type="search" data-price-list-search value="${escapeHtml(state.search)}" placeholder="Supplier, category, document no."></label>
      </div>
      <div class="supplier-selection-actions price-list-actions"><button type="button" data-price-list-edit disabled>Edit Price List</button><button type="button" data-price-list-duplicate disabled>Duplicate Price List</button><button class="danger" type="button" data-price-list-archive disabled>Archive Price List</button></div>
      <div class="table-wrap price-list-table-wrap"><table class="price-list-table"><thead><tr><th>No.</th><th aria-label="Selection"></th><th>Supplier</th><th>Category</th><th>Document No. (Invoice No.)</th><th>Currency</th><th>Valid From</th><th>Valid Until</th><th>Active</th><th>Items</th><th>Updated</th></tr></thead><tbody id="priceListTableBody">${tableRowsHtml()}</tbody></table></div>`;

    renderCategoryFilter();
    state.root.querySelector('[data-price-list-back]').addEventListener('click', () => state.onBack?.());
    state.root.querySelector('[data-price-list-add]').addEventListener('click', () => renderForm());
    state.root.querySelector('[data-price-list-edit]').addEventListener('click', () => { const selected = selectedPriceList(); if (selected) renderForm(selected, 'edit'); });
    state.root.querySelector('[data-price-list-duplicate]').addEventListener('click', () => { const selected = selectedPriceList(); if (selected) renderForm(selected, 'duplicate'); });
    state.root.querySelector('[data-price-list-archive]').addEventListener('click', archiveSelected);
    state.root.querySelector('[data-price-list-supplier-filter]').addEventListener('change', event => { state.supplierFilter = event.target.value; renderCategoryFilter(); renderTableBody(); });
    state.root.querySelector('[data-price-list-category-filter]').addEventListener('change', event => { state.categoryFilter = event.target.value; renderTableBody(); });
    state.root.querySelector('[data-price-list-active-filter]').addEventListener('change', event => { state.activeFilter = event.target.value; renderTableBody(); });
    state.root.querySelector('[data-price-list-search]').addEventListener('input', event => { state.search = event.target.value; renderTableBody(); });
    bindRows();
    updateActions();
  }

  function supplierOptions(selectedId) {
    return state.suppliers.filter(supplier => supplier.active !== false || supplier.id === selectedId).map(supplier => `<option value="${escapeHtml(supplier.id)}" ${supplier.id === selectedId ? 'selected' : ''}>${escapeHtml(`${supplier.supplier_code} — ${supplier.supplier_name}${supplier.active === false ? ' (Inactive)' : ''}`)}</option>`).join('');
  }

  function categoryOptions(supplierId, selectedCategory = '') {
    return supplierCategories(supplierId).map(category => `<option value="${escapeHtml(category)}" ${category === selectedCategory ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
  }

  function masterItemForTag(tag) {
    const normalized = String(tag || '').trim().toLowerCase();
    return state.partMasterItems.find(item => item.tag.toLowerCase() === normalized) || null;
  }

  function itemMatchesCategory(item, category) {
    return global.LumaCommercialCategories.partMatchesCategory(item, category);
  }

  function renderItemPicker() {
    const select = state.root?.querySelector('[data-price-item-picker]');
    if (!select) return;
    const category = state.root?.querySelector('#priceListForm')?.elements.category.value || '';
    const used = new Set(state.editorItems.map(item => item.tag.toLowerCase()));
    const query = state.itemSearch.trim().toLowerCase();
    const available = state.partMasterItems.filter(item => {
      if (!category || !itemMatchesCategory(item, category) || used.has(item.tag.toLowerCase())) return false;
      if (!query) return true;
      return `${item.tag} ${item.part || ''} ${item.partNumber || ''} ${item.description || ''} ${item.material || ''}`.toLowerCase().includes(query);
    });
    const placeholder = category && !available.length ? 'No matching Part Master TAGs' : 'Select TAG from Part Master';
    select.innerHTML = `<option value="">${placeholder}</option>${available.map(item => `<option value="${escapeHtml(item.tag)}">${escapeHtml(`${item.tag} — ${item.description || item.category || 'Part Master item'}`)}</option>`).join('')}`;
    select.disabled = !category || !available.length;
    const addButton = state.root?.querySelector('[data-price-item-add]');
    if (addButton) addButton.disabled = select.disabled;
  }

  function itemRowsHtml() {
    if (!state.editorItems.length) return '<tr><td class="empty-table-message" colspan="8">No items added. Search and select a TAG from Part Master.</td></tr>';
    return state.editorItems.map((item, index) => {
      const master = masterItemForTag(item.tag);
      const partNumber = item.partNumber || master?.partNumber || '';
      const weight = item.weight ?? master?.weight ?? '';
      return `<tr data-price-item-row="${index}"><td>${index + 1}</td><td><strong>${escapeHtml(item.tag)}</strong></td><td>${escapeHtml(partNumber || '—')}</td><td>${escapeHtml(item.description || master?.description || '—')}</td><td>${escapeHtml(item.unit || master?.unit || '—')}</td><td>${weight === '' || weight === null ? '—' : escapeHtml(weight)}</td><td><input type="text" inputmode="decimal" data-price-item-value="${index}" value="${escapeHtml(item.unit_price ?? '')}" placeholder="Missing"></td><td><button class="danger" type="button" data-price-item-remove="${index}" aria-label="Remove ${escapeHtml(item.tag)}">Remove</button></td></tr>`;
    }).join('');
  }

  function renderItemsTable() {
    const body = state.root?.querySelector('#priceListItemsBody');
    if (!body) return;
    body.innerHTML = itemRowsHtml();
    body.querySelectorAll('[data-price-item-value]').forEach(input => input.addEventListener('input', () => { state.editorItems[Number(input.dataset.priceItemValue)].unit_price = input.value; }));
    body.querySelectorAll('[data-price-item-remove]').forEach(button => button.addEventListener('click', () => {
      state.editorItems.splice(Number(button.dataset.priceItemRemove), 1);
      renderItemsTable();
      renderItemPicker();
    }));
  }

  function addSelectedPartMasterItem() {
    const picker = state.root.querySelector('[data-price-item-picker]');
    const item = state.partMasterItems.find(candidate => candidate.tag === picker.value);
    const category = state.root.querySelector('#priceListForm')?.elements.category.value || '';
    if (!item || !itemMatchesCategory(item, category)) return;
    state.editorItems.push({tag: item.tag, partNumber:item.partNumber, description: item.description, unit: item.unit, weight:item.weight, unit_price: null, preserved:false});
    renderItemsTable();
    renderItemPicker();
  }

  function confirmCategoryChange(form, previousSupplierId, previousCategory) {
    const nextCategory = form.elements.category.value;
    const incompatible = state.editorItems.filter(item => {
      const master = masterItemForTag(item.tag);
      return !master || !itemMatchesCategory(master, nextCategory);
    });
    if (incompatible.length && !confirm(`Changing Category to "${nextCategory || 'none'}" will remove ${incompatible.length} incompatible Price List item(s).\n\nContinue?`)) {
      form.elements.supplier_id.value = previousSupplierId;
      form.elements.category.innerHTML = categoryOptions(previousSupplierId, previousCategory);
      form.elements.category.value = previousCategory;
      renderItemPicker();
      return false;
    }
    if (incompatible.length) {
      const incompatibleTags = new Set(incompatible.map(item => item.tag.toLowerCase()));
      state.editorItems = state.editorItems.filter(item => !incompatibleTags.has(item.tag.toLowerCase()));
      renderItemsTable();
      setFormStatus(`${incompatible.length} incompatible item(s) removed after the Category change.`);
    } else {
      setFormStatus('');
    }
    form.dataset.previousSupplierId = form.elements.supplier_id.value;
    form.dataset.previousCategory = nextCategory;
    renderItemPicker();
    return true;
  }

  function renderForm(source = null, mode = 'create') {
    if (!state.root || !isAdmin()) return;
    const editing = mode === 'edit';
    const duplicate = mode === 'duplicate';
    const supplierId = source?.supplier_id || state.suppliers.find(supplier => supplier.active !== false)?.id || '';
    const category = source?.category || supplierCategories(supplierId)[0] || '';
    state.itemSearch = '';
    state.editorItems = (source?.price_list_items || []).map(item => {
      const master = masterItemForTag(item.tag);
      return {tag:item.tag, partNumber:master?.partNumber || '', description:item.description || master?.description || '', unit:item.unit || master?.unit || '', weight:master?.weight ?? '', unit_price:item.unit_price, preserved:editing};
    });
    const title = editing ? 'Edit Price List' : duplicate ? 'Duplicate Price List' : 'Add Price List';
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Price Lists')}</div>
      <div class="supplier-form-header"><h2 class="table-title">${title}</h2><p class="table-subtitle">${editing ? 'Update the saved document details and item prices.' : duplicate ? `Create a new price list from Document No. ${escapeHtml(source.revision)}.` : 'Create an independent supplier/category price-list document.'}</p></div>
      <form id="priceListForm" class="supplier-form price-list-form" novalidate>
        <div class="supplier-form-grid">
          <label class="supplier-form-field"><span>Supplier</span><select name="supplier_id" required ${editing ? 'disabled' : ''}><option value="">Select Supplier</option>${supplierOptions(supplierId)}</select></label>
          <label class="supplier-form-field"><span>Category</span><select name="category" required ${editing ? 'disabled' : ''}>${categoryOptions(supplierId, category)}</select></label>
          <label class="supplier-form-field"><span>Document No. (Invoice No.)</span><input name="revision" required value="${escapeHtml(duplicate ? '' : source?.revision || '')}" placeholder="INV-2026-001"></label>
          <label class="supplier-form-field"><span>Currency</span><select name="currency" required>${global.LumaCurrencyData.OPTIONS.map(currency => `<option value="${currency.code}" ${currency.code === (source?.currency || 'EUR') ? 'selected' : ''}>${escapeHtml(global.LumaCurrencyData.optionLabel(currency.code))}</option>`).join('')}</select></label>
          <label class="supplier-form-field"><span>Valid From</span><input name="valid_from" type="date" value="${escapeHtml(source?.valid_from || '')}"></label>
          <label class="supplier-form-field"><span>Valid Until</span><input name="valid_until" type="date" value="${escapeHtml(source?.valid_until || '')}"></label>
          <label class="supplier-form-field supplier-form-wide"><span>Notes</span><textarea name="notes" rows="3">${escapeHtml(source?.notes || '')}</textarea></label>
          <label class="supplier-active-check supplier-form-wide"><input name="active" type="checkbox" ${editing ? (source?.active ? 'checked' : '') : ''}><span>Active Price List</span></label>
        </div>
        <section class="price-list-items-editor"><div class="price-list-items-header"><div><h3>Price List Items</h3><p>TAG, Part Number, description, unit, and weight come from the current Part Master. Blank Unit Price means missing; zero is preserved as zero.</p></div><div class="price-item-tools"><label><span>Search Part Master</span><input type="search" data-price-item-search value="${escapeHtml(state.itemSearch)}" placeholder="TAG, Part Number, description..."></label><div class="price-item-picker"><select data-price-item-picker></select><button type="button" data-price-item-add>Add Item</button></div></div></div>
          <div class="table-wrap"><table class="price-list-items-table"><thead><tr><th>No.</th><th>TAG</th><th>Part Number</th><th>Description</th><th>Unit</th><th>Weight (kg)</th><th>Unit Price</th><th></th></tr></thead><tbody id="priceListItemsBody">${itemRowsHtml()}</tbody></table></div>
        </section>
        <p id="priceListFormStatus" class="supplier-form-status" role="alert" aria-live="polite" hidden></p>
        <div class="supplier-form-actions"><button type="button" data-price-list-cancel>Cancel</button><button class="export" type="submit" data-price-list-save>${editing ? 'Save Changes' : 'Create Price List'}</button></div>
      </form>`;

    const form = state.root.querySelector('#priceListForm');
    form.dataset.previousSupplierId = supplierId;
    form.dataset.previousCategory = category;
    renderItemPicker();
    renderItemsTable();
    state.root.querySelector('[data-price-list-back]').addEventListener('click', renderList);
    state.root.querySelector('[data-price-list-cancel]').addEventListener('click', renderList);
    state.root.querySelector('[data-price-item-add]').addEventListener('click', addSelectedPartMasterItem);
    state.root.querySelector('[data-price-item-search]').addEventListener('input', event => { state.itemSearch = event.target.value; renderItemPicker(); });
    form.elements.supplier_id.addEventListener('change', () => {
      const previousSupplierId = form.dataset.previousSupplierId || '';
      const previousCategory = form.dataset.previousCategory || '';
      form.elements.category.innerHTML = categoryOptions(form.elements.supplier_id.value);
      confirmCategoryChange(form, previousSupplierId, previousCategory);
    });
    form.elements.category.addEventListener('change', () => confirmCategoryChange(form, form.dataset.previousSupplierId || '', form.dataset.previousCategory || ''));
    const syncDateValidity = () => {
      const validFrom = form.elements.valid_from;
      const validUntil = form.elements.valid_until;
      validUntil.min = validFrom.value || '';
      const invalid = !!(validFrom.value && validUntil.value && validUntil.value < validFrom.value);
      validUntil.setCustomValidity(invalid ? 'Valid Until cannot be before Valid From.' : '');
      setFormStatus(invalid ? 'Valid Until cannot be before Valid From.' : '');
    };
    form.elements.valid_from.addEventListener('change', syncDateValidity);
    form.elements.valid_until.addEventListener('change', syncDateValidity);
    form.elements.valid_until.addEventListener('input', syncDateValidity);
    syncDateValidity();
    form.addEventListener('submit', event => saveForm(event, editing ? source : null));
    (duplicate ? form.elements.revision : form.elements.supplier_id).focus();
  }

  function setFormStatus(message = '') {
    const status = state.root?.querySelector('#priceListFormStatus');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function setFormBusy(form, busy, editing) {
    [...form.elements].forEach(element => {
      if (editing && ['supplier_id', 'category'].includes(element.name)) return;
      element.disabled = busy;
    });
    const save = form.querySelector('[data-price-list-save]');
    if (save) save.textContent = busy ? 'Saving...' : (editing ? 'Save Changes' : 'Create Price List');
  }

  function readForm(form, editingSource) {
    const header = {
      supplier_id: form.elements.supplier_id.value,
      category: form.elements.category.value,
      revision: form.elements.revision.value.trim().toUpperCase(),
      currency: form.elements.currency.value,
      valid_from: form.elements.valid_from.value,
      valid_until: form.elements.valid_until.value,
      notes: form.elements.notes.value,
      active: form.elements.active.checked,
    };
    if (!header.supplier_id) throw new Error('Supplier is required.');
    if (!header.category) throw new Error('Category is required.');
    if (!supplierCategories(header.supplier_id).includes(header.category)) throw new Error('This supplier is not configured for the selected category.');
    if (!header.revision) throw new Error('Document No. (Invoice No.) is required.');
    if (!global.LumaPriceListService.CURRENCIES.includes(header.currency)) throw new Error('Select a valid currency.');
    if (header.valid_from && header.valid_until && header.valid_until < header.valid_from) throw new Error('Valid Until cannot be before Valid From.');
    if (state.priceLists.some(item => item.id !== editingSource?.id && item.supplier_id === header.supplier_id && item.category === header.category && item.revision.toLowerCase() === header.revision.toLowerCase())) throw new Error('A Price List with this supplier, category, and Document No. already exists.');

    const tags = new Set();
    const items = state.editorItems.map(item => {
      const tag = String(item.tag || '').trim().toLowerCase();
      if (!tag) throw new Error('TAG is required for every item.');
      if (tags.has(tag)) throw new Error('The same TAG cannot appear twice in one Price List.');
      tags.add(tag);
      const master = masterItemForTag(tag);
      if (!item.preserved && (!master || !itemMatchesCategory(master, header.category))) throw new Error(`${tag} does not belong to the selected Price List Category.`);
      const rawPrice = String(item.unit_price ?? '').trim();
      if (rawPrice && !/^(?:\d+\.?\d*|\.\d+)$/.test(rawPrice)) throw new Error(`Enter a valid Unit Price for ${tag}.`);
      if (rawPrice && Number(rawPrice) < 0) throw new Error(`Unit Price cannot be negative for ${tag}.`);
      return {tag, description: item.description, unit: item.unit, unit_price: rawPrice || null};
    });
    return {header, items};
  }

  async function saveForm(event, editingSource) {
    event.preventDefault();
    if (!isAdmin()) return;
    const form = event.currentTarget;
    setFormStatus('');
    let values;
    try { values = readForm(form, editingSource); }
    catch (error) { setFormStatus(error.message); return; }
    setFormBusy(form, true, !!editingSource);
    let id;
    try {
      id = await global.LumaPriceListService.savePriceList({priceListId: editingSource?.id || null, ...values});
    } catch (error) {
      setFormBusy(form, false, !!editingSource);
      setFormStatus(error.message);
      return;
    }
    if (!isAdmin()) return;
    state.selectedId = id;
    state.notice = {kind: 'success', message: editingSource ? 'Price List updated.' : 'Price List created.'};
    renderLoading('Refreshing Price Lists...');
    try { if (await loadMaster()) renderList(); }
    catch (error) { renderLoadError(error.message); }
  }

  async function archiveSelected() {
    const priceList = selectedPriceList();
    if (!priceList || !priceList.active || !isAdmin()) return;
    if (!confirm(`Archive Price List ${priceList.revision} for ${supplierName(priceList)}?\n\nThe document and all item prices will remain stored.`)) return;
    renderLoading('Archiving Price List...');
    try {
      await global.LumaPriceListService.archivePriceList(priceList.id);
      state.notice = {kind: 'success', message: 'Price List archived. Historical prices were retained.'};
      if (await loadMaster()) renderList();
    } catch (error) {
      state.notice = {kind: 'error', message: error.message};
      try { if (await loadMaster()) renderList(); }
      catch (loadError) { renderLoadError(loadError.message); }
    }
  }

  function open(root, onBack) {
    if (!isAdmin()) return;
    state.root = root;
    state.onBack = onBack;
    state.partMasterItems = global.LumaApp.getPartMasterItems();
    state.notice = null;
    void openList();
  }

  global.LumaAdminPriceLists = Object.freeze({open, reset});
})(window);
