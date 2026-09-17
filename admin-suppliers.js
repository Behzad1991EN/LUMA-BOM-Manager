'use strict';

(function initializeSupplierAdministration(global) {
  const state = {
    root: null,
    initialized: false,
    page: 'home',
    suppliers: [],
    categories: [],
    selectedSupplierId: null,
    search: '',
    notice: null,
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function isAdmin() {
    return global.LumaAuth?.isAdmin?.() === true;
  }

  function reset(root = state.root) {
    if (root) root.replaceChildren();
    state.root = null;
    state.initialized = false;
    state.page = 'home';
    state.suppliers = [];
    state.categories = [];
    state.selectedSupplierId = null;
    state.search = '';
    state.notice = null;
    global.LumaAdminPriceLists?.reset?.();
    global.LumaAdminPartMaster?.reset?.();
    global.LumaAdminLogistics?.reset?.();
    global.LumaAdminOverhead?.reset?.();
    global.LumaAdminPersonnel?.reset?.();
  }

  function backButton(label) {
    return `<button class="admin-back-button" type="button" data-admin-back aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>`;
  }

  function renderHome() {
    if (!state.root || !isAdmin()) return;
    const email = global.LumaAuth.getSession()?.user?.email || 'Authenticated administrator';
    state.page = 'home';
    state.root.innerHTML = `
      <div class="administration-home-header">
        <h2 class="table-title">Administration</h2>
        <p class="table-subtitle">Manage administrator-controlled commercial and engineering configuration.</p>
      </div>
      <div class="administration-card-grid">
        <button class="administration-card" type="button" data-admin-page="suppliers">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20V8l8-4 8 4v12M8 20v-5h8v5M8 10h.01M12 10h.01M16 10h.01"/></svg></span>
          <span><strong>Suppliers</strong><small>Manage supplier master data and supported categories.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card" type="button" data-admin-page="price-lists">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5M16 16h.01"/></svg></span>
          <span><strong>Supplier Price Lists</strong><small>Manage supplier/category price-list revisions.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card" type="button" data-admin-page="part-master">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg></span>
          <span><strong>Part Master</strong><small>Manage engineering Part Master records.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card coming-later" type="button" disabled>
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 11h6M9 15h6"/></svg></span>
          <span><strong>Quotation Settings</strong><small>Coming later</small></span>
        </button>
        <button class="administration-card" type="button" data-admin-page="logistics">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg></span>
          <span><strong>Logistics</strong><small>Manage container capacities and logistics rates.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card" type="button" data-admin-page="overhead">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19h16M7 16V8m5 8V5m5 11v-6M5 5l3-3 3 3"/></svg></span>
          <span><strong>Overhead</strong><small>Manage yearly Overhead costs, validity, and annual project capacity.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card" type="button" data-admin-page="personnel">
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-6a5 5 0 0 1 6 4v2"/></svg></span>
          <span><strong>Personnel Costs</strong><small>Manage monthly Personnel costs by company section.</small></span>
          <em aria-hidden="true">&rsaquo;</em>
        </button>
        <button class="administration-card coming-later" type="button" disabled>
          <span class="administration-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.6-.6-1.4-.9-2.5-.9-1.4 0-2.5.7-2.5 1.7 0 2.7 5 1.3 5 4 0 1-1.1 1.7-2.5 1.7-1.1 0-2-.3-2.7-1M12 6.5v11"/></svg></span>
          <span><strong>Custom Costs</strong><small>Coming later</small></span>
        </button>
      </div>
      <dl class="administration-access">
        <div><dt>Access</dt><dd>Administrator only</dd></div>
        <div><dt>Signed in as</dt><dd>${escapeHtml(email)}</dd></div>
        <div><dt>Role</dt><dd>Administrator</dd></div>
      </dl>`;
    state.root.querySelector('[data-admin-page="suppliers"]').addEventListener('click', openSupplierList);
    state.root.querySelector('[data-admin-page="price-lists"]').addEventListener('click', () => global.LumaAdminPriceLists.open(state.root, renderHome));
    state.root.querySelector('[data-admin-page="part-master"]').addEventListener('click', () => global.LumaAdminPartMaster.open(state.root, renderHome));
    state.root.querySelector('[data-admin-page="logistics"]').addEventListener('click', () => global.LumaAdminLogistics.open(state.root, renderHome));
    state.root.querySelector('[data-admin-page="overhead"]').addEventListener('click', () => global.LumaAdminOverhead.open(state.root, renderHome));
    state.root.querySelector('[data-admin-page="personnel"]').addEventListener('click', () => global.LumaAdminPersonnel.open(state.root, renderHome));
  }

  function renderSupplierLoading(message = 'Loading suppliers...') {
    if (!state.root || !isAdmin()) return;
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Administration')}</div>
      <div class="supplier-loading" role="status">${escapeHtml(message)}</div>`;
    state.root.querySelector('[data-admin-back]').addEventListener('click', renderHome);
  }

  async function loadSupplierMaster() {
    const result = await global.LumaSupplierService.listSupplierMaster();
    if (!isAdmin()) return false;
    state.categories = result.categories;
    state.suppliers = result.suppliers;
    return true;
  }

  async function openSupplierList() {
    if (!isAdmin()) return;
    state.page = 'suppliers';
    state.notice = null;
    renderSupplierLoading();
    try {
      if (await loadSupplierMaster()) renderSupplierList();
    } catch (error) {
      renderSupplierLoadError(error.message);
    }
  }

  function renderSupplierLoadError(message) {
    if (!state.root || !isAdmin()) return;
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Administration')}</div>
      <div class="supplier-error" role="alert">
        <strong>Suppliers could not be loaded.</strong>
        <span>${escapeHtml(message)}</span>
        <button type="button" data-supplier-retry>Try Again</button>
      </div>`;
    state.root.querySelector('[data-admin-back]').addEventListener('click', renderHome);
    state.root.querySelector('[data-supplier-retry]').addEventListener('click', openSupplierList);
  }

  function activeCategories(supplier) {
    const order = new Map(state.categories.map(item => [item.category, item.sort_order]));
    return (supplier.supplier_categories || [])
      .filter(item => item.active !== false)
      .sort((a, b) => (order.get(a.category) || 999) - (order.get(b.category) || 999));
  }

  function filteredSuppliers() {
    const query = state.search.trim().toLowerCase();
    if (!query) return state.suppliers;
    return state.suppliers.filter(supplier => {
      const categories = activeCategories(supplier).map(item => item.category).join(' ');
      return `${supplier.supplier_code} ${supplier.supplier_name} ${supplier.country || ''} ${supplier.city || ''} ${categories}`.toLowerCase().includes(query);
    });
  }

  function supplierRowsHtml() {
    const suppliers = filteredSuppliers();
    if (!suppliers.length) {
      return '<tr><td class="empty-table-message" colspan="8">No suppliers match the current search.</td></tr>';
    }
    return suppliers.map((supplier, index) => {
      const selected = supplier.id === state.selectedSupplierId;
      const categories = activeCategories(supplier).map(item => {
        const delivery = Number.isInteger(item.delivery_time_days) ? ` (${item.delivery_time_days} days)` : '';
        return `${item.category}${delivery}`;
      }).join(', ');
      return `<tr class="supplier-row${selected ? ' row-selected' : ''}${supplier.active === false ? ' supplier-inactive-row' : ''}" data-supplier-id="${escapeHtml(supplier.id)}">
        <td>${index + 1}</td>
        <td class="supplier-select-cell"><input type="radio" name="selectedSupplier" value="${escapeHtml(supplier.id)}" aria-label="Select ${escapeHtml(supplier.supplier_name)}" ${selected ? 'checked' : ''}></td>
        <td><strong>${escapeHtml(supplier.supplier_code)}</strong></td>
        <td>${escapeHtml(supplier.supplier_name)}</td>
        <td>${escapeHtml(supplier.country || '—')}</td>
        <td>${escapeHtml(supplier.city || '—')}</td>
        <td class="supplier-categories-cell">${escapeHtml(categories || '—')}</td>
        <td><span class="supplier-status ${supplier.active === false ? 'inactive' : 'active'}">${supplier.active === false ? 'Inactive' : 'Active'}</span></td>
      </tr>`;
    }).join('');
  }

  function renderSupplierTable() {
    const body = state.root?.querySelector('#supplierTableBody');
    if (!body) return;
    body.innerHTML = supplierRowsHtml();
    body.querySelectorAll('[data-supplier-id]').forEach(row => {
      row.addEventListener('click', () => selectSupplier(row.dataset.supplierId));
    });
    updateSupplierActions();
  }

  function updateSupplierActions() {
    const selectedExists = state.suppliers.some(item => item.id === state.selectedSupplierId);
    const editButton = state.root?.querySelector('[data-supplier-edit]');
    const deleteButton = state.root?.querySelector('[data-supplier-delete]');
    if (editButton) editButton.disabled = !selectedExists;
    if (deleteButton) deleteButton.disabled = !selectedExists;
  }

  function selectSupplier(supplierId) {
    state.selectedSupplierId = supplierId;
    renderSupplierTable();
  }

  function renderSupplierList() {
    if (!state.root || !isAdmin()) return;
    state.page = 'suppliers';
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Administration')}</div>
      <div class="supplier-page-header">
        <div><h2 class="table-title">Suppliers</h2><p class="table-subtitle">Manage supplier master data and supported categories.</p></div>
        <button class="export" type="button" data-supplier-add>Add Supplier</button>
      </div>
      ${state.notice ? `<p class="supplier-notice ${escapeHtml(state.notice.kind)}" role="status">${escapeHtml(state.notice.message)}</p>` : ''}
      <div class="supplier-list-controls">
        <label class="supplier-search"><span>Search</span><input type="search" data-supplier-search value="${escapeHtml(state.search)}" placeholder="Code, name, location, or category"></label>
        <div class="supplier-selection-actions">
          <button type="button" data-supplier-edit disabled>Edit Selected Supplier</button>
          <button class="danger" type="button" data-supplier-delete disabled>Delete Selected Supplier</button>
        </div>
      </div>
      <div class="table-wrap supplier-table-wrap">
        <table class="supplier-table">
          <thead><tr><th>No.</th><th aria-label="Selection"></th><th>Supplier Code</th><th>Supplier Name</th><th>Country</th><th>City</th><th>Categories</th><th>Active</th></tr></thead>
          <tbody id="supplierTableBody">${supplierRowsHtml()}</tbody>
        </table>
      </div>`;

    state.root.querySelector('[data-admin-back]').addEventListener('click', renderHome);
    state.root.querySelector('[data-supplier-add]').addEventListener('click', () => renderSupplierForm());
    state.root.querySelector('[data-supplier-edit]').addEventListener('click', editSelectedSupplier);
    state.root.querySelector('[data-supplier-delete]').addEventListener('click', deleteSelectedSupplier);
    state.root.querySelector('[data-supplier-search]').addEventListener('input', event => {
      state.search = event.target.value;
      renderSupplierTable();
    });
    state.root.querySelectorAll('[data-supplier-id]').forEach(row => row.addEventListener('click', () => selectSupplier(row.dataset.supplierId)));
    updateSupplierActions();
  }

  function supplierInput(label, name, value = '', options = '') {
    return `<label class="supplier-form-field"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${options}></label>`;
  }
  function supplierCountrySelect(value = '') {
    const canonical = global.LumaCountryData.canonicalCountry(value), current = canonical || String(value || '').trim();
    const values = [...global.LumaCountryData.SUPPLIER_COUNTRIES];if(current&&!values.includes(current))values.unshift(current);
    return `<label class="supplier-form-field"><span>Country</span><select name="country"><option value="">Select Country</option>${values.map(country=>`<option value="${escapeHtml(country)}" ${country===current?'selected':''}>${escapeHtml(country)}</option>`).join('')}</select></label>`;
  }

  function categoryRowsHtml(supplier) {
    const assignments = new Map((supplier?.supplier_categories || []).filter(item => item.active !== false).map(item => [item.category, item]));
    return state.categories.map((category, index) => {
      const assignment = assignments.get(category.category);
      const checked = !!assignment;
      const value = Number.isInteger(assignment?.delivery_time_days) ? assignment.delivery_time_days : '';
      return `<div class="supplier-category-row" data-category-row>
        <label class="supplier-category-check"><input type="checkbox" name="category_enabled_${index}" data-category-enabled data-category="${escapeHtml(category.category)}" ${checked ? 'checked' : ''}><span>${escapeHtml(category.category)}</span></label>
        <label><span>Delivery Time (days)</span><input type="number" name="category_delivery_${index}" data-category-delivery min="0" step="1" inputmode="numeric" value="${escapeHtml(value)}" ${checked ? '' : 'disabled'}></label>
      </div>`;
    }).join('');
  }

  function renderSupplierForm(supplier = null) {
    if (!state.root || !isAdmin()) return;
    const editing = !!supplier;
    state.page = editing ? 'edit-supplier' : 'add-supplier';
    state.root.innerHTML = `
      <div class="admin-subpage-nav">${backButton('Back to Suppliers')}</div>
      <div class="supplier-form-header"><h2 class="table-title">${editing ? 'Edit Supplier' : 'Add Supplier'}</h2><p class="table-subtitle">${editing ? `Update ${escapeHtml(supplier.supplier_name)}.` : 'Create a new Supplier Master record.'}</p></div>
      <form id="supplierForm" class="supplier-form" novalidate>
        <div class="supplier-form-grid">
          ${supplierInput('Supplier Code', 'supplier_code', supplier?.supplier_code, 'required autocomplete="off"')}
          ${supplierInput('Supplier Name', 'supplier_name', supplier?.supplier_name, 'required autocomplete="organization"')}
          ${supplierCountrySelect(supplier?.country)}
          ${supplierInput('City', 'city', supplier?.city, 'autocomplete="address-level2"')}
          ${supplierInput('Contact Name', 'contact_name', supplier?.contact_name, 'autocomplete="name"')}
          ${supplierInput('Contact Email', 'contact_email', supplier?.contact_email, 'type="email" autocomplete="email"')}
          ${supplierInput('Contact Phone', 'contact_phone', supplier?.contact_phone, 'type="tel" autocomplete="tel"')}
          ${supplierInput('Website', 'website', supplier?.website, 'type="url" autocomplete="url" placeholder="https://example.com"')}
          <label class="supplier-form-field supplier-form-wide"><span>Address</span><textarea name="address" rows="3">${escapeHtml(supplier?.address || '')}</textarea></label>
          <label class="supplier-form-field supplier-form-wide"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(supplier?.notes || '')}</textarea></label>
          <label class="supplier-active-check supplier-form-wide"><input type="checkbox" name="active" ${supplier?.active === false ? '' : 'checked'}><span>Active supplier</span></label>
        </div>
        <fieldset class="supplier-category-fieldset">
          <legend>Supply Categories</legend>
          <p>Delivery time is stored as calendar days for each enabled category.</p>
          <div class="supplier-category-grid">${categoryRowsHtml(supplier)}</div>
        </fieldset>
        <p id="supplierFormStatus" class="supplier-form-status" role="alert" aria-live="polite" hidden></p>
        <div class="supplier-form-actions">
          <button type="button" data-supplier-form-cancel>Cancel</button>
          <button class="export" type="submit" data-supplier-form-save>${editing ? 'Save Changes' : 'Create Supplier'}</button>
        </div>
      </form>`;

    const form = state.root.querySelector('#supplierForm');
    state.root.querySelector('[data-admin-back]').addEventListener('click', renderSupplierList);
    state.root.querySelector('[data-supplier-form-cancel]').addEventListener('click', renderSupplierList);
    form.querySelectorAll('[data-category-enabled]').forEach(checkbox => checkbox.addEventListener('change', () => {
      const delivery = checkbox.closest('[data-category-row]').querySelector('[data-category-delivery]');
      delivery.disabled = !checkbox.checked;
      if (!checkbox.checked) delivery.value = '';
    }));
    form.addEventListener('submit', event => saveSupplierForm(event, supplier));
    form.elements.supplier_code.focus();
  }

  function setFormStatus(message = '') {
    const status = state.root?.querySelector('#supplierFormStatus');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
  }

  function setFormBusy(form, busy, editing) {
    [...form.elements].forEach(element => { element.disabled = busy || (element.hasAttribute('data-category-delivery') && !element.closest('[data-category-row]').querySelector('[data-category-enabled]').checked); });
    const save = form.querySelector('[data-supplier-form-save]');
    if (save) save.textContent = busy ? 'Saving...' : (editing ? 'Save Changes' : 'Create Supplier');
  }

  function readSupplierForm(form, editingSupplier) {
    const supplierCode = form.elements.supplier_code.value.trim().toUpperCase();
    const supplierName = form.elements.supplier_name.value.trim();
    const email = form.elements.contact_email.value.trim();

    if (!supplierCode) throw new Error('Supplier Code is required.');
    if (!supplierName) throw new Error('Supplier Name is required.');
    if (state.suppliers.some(item => item.id !== editingSupplier?.id && item.supplier_code.toLowerCase() === supplierCode.toLowerCase())) {
      throw new Error('Supplier Code already exists.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid Contact Email.');
    }

    const categories = [];
    form.querySelectorAll('[data-category-row]').forEach(row => {
      const enabled = row.querySelector('[data-category-enabled]');
      if (!enabled.checked) return;
      const input = row.querySelector('[data-category-delivery]');
      const raw = input.value.trim();
      const delivery = raw === '' ? null : Number(raw);
      if (delivery !== null && (!Number.isInteger(delivery) || delivery < 0)) {
        throw new Error(`Enter a whole number of delivery days for ${enabled.dataset.category}.`);
      }
      categories.push({category: enabled.dataset.category, delivery_time_days: delivery});
    });

    const details = {
      supplier_code: supplierCode,
      supplier_name: supplierName,
      country: form.elements.country.value,
      city: form.elements.city.value,
      address: form.elements.address.value,
      contact_name: form.elements.contact_name.value,
      contact_email: email,
      contact_phone: form.elements.contact_phone.value,
      website: form.elements.website.value,
      notes: form.elements.notes.value,
      active: form.elements.active.checked,
    };
    return {details, categories};
  }

  async function saveSupplierForm(event, editingSupplier) {
    event.preventDefault();
    if (!isAdmin()) return;
    const form = event.currentTarget;
    setFormStatus('');
    let values;
    try {
      values = readSupplierForm(form, editingSupplier);
    } catch (error) {
      setFormStatus(error.message);
      return;
    }

    setFormBusy(form, true, !!editingSupplier);
    let supplierId;
    try {
      supplierId = await global.LumaSupplierService.saveSupplier({
        supplierId: editingSupplier?.id || null,
        ...values,
      });
    } catch (error) {
      if (isAdmin()) {
        setFormBusy(form, false, !!editingSupplier);
        setFormStatus(error.message);
      }
      return;
    }

    if (!isAdmin()) return;
    state.selectedSupplierId = supplierId;
    state.notice = {kind: 'success', message: editingSupplier ? 'Supplier updated.' : 'Supplier created.'};
    renderSupplierLoading('Refreshing suppliers...');
    try {
      if (await loadSupplierMaster()) renderSupplierList();
    } catch (error) {
      renderSupplierLoadError(error.message);
    }
  }

  function editSelectedSupplier() {
    const supplier = state.suppliers.find(item => item.id === state.selectedSupplierId);
    if (supplier) renderSupplierForm(supplier);
  }

  async function deleteSelectedSupplier() {
    const supplier = state.suppliers.find(item => item.id === state.selectedSupplierId);
    if (!supplier || !isAdmin()) return;
    if (!confirm(`Delete supplier "${supplier.supplier_name}"?\n\nThis will also remove its category assignments.\n\nContinue?`)) return;

    renderSupplierLoading('Deleting supplier...');
    try {
      await global.LumaSupplierService.deleteSupplier(supplier.id);
      if (!isAdmin()) return;
      state.selectedSupplierId = null;
      state.notice = {kind: 'success', message: 'Supplier deleted.'};
      if (await loadSupplierMaster()) renderSupplierList();
    } catch (error) {
      if (!isAdmin()) return;
      state.notice = {kind: 'error', message: error.message};
      try {
        if (await loadSupplierMaster()) renderSupplierList();
      } catch (loadError) {
        renderSupplierLoadError(loadError.message);
      }
    }
  }

  function render(root) {
    if (!isAdmin()) {
      reset(root);
      return;
    }
    if (state.root !== root) reset(state.root);
    state.root = root;
    if (state.initialized) return;
    state.initialized = true;
    renderHome();
  }

  global.LumaAdminSuppliers = Object.freeze({render, reset});
})(window);
