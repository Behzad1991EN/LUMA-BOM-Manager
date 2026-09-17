'use strict';

(function initializeQuotationRenderer(global) {
  const TEMPLATE_ROOT = 'LaTeX/';
  const TEMPLATE_RELEASE = '20260907-parameterized-latex';
  const templateUrl = path => `${TEMPLATE_ROOT}${path}?v=${TEMPLATE_RELEASE}`;
  const TEMPLATE_PDF_URL = templateUrl('LUMA%20Quotation-3-revised.pdf');
  const MASTER_URL = templateUrl('LUMA%20Quotation-3-revised.tex');
  const MAIN_FILE = 'LUMA_Quotation.tex';
  const TEMPLATE_ASSETS = Object.freeze([
    ['Picture/image4.png', templateUrl('Picture/image4.png')],
    ['Picture/image7.png', templateUrl('Picture/image7.png')],
    ['Picture/image8.png', templateUrl('Picture/image8.png')],
    ['Original/source_media/image1.jpg', templateUrl('Original/source_media/image1.jpg')],
    ['Original/source_media/image2.png', templateUrl('Original/source_media/image2.png')],
    ['Original/source_media/image3.jpeg', templateUrl('Original/source_media/image3.jpeg')],
    ['Original/source_media/image5.png', templateUrl('Original/source_media/image5.png')],
    ['Original/source_media/image6.png', templateUrl('Original/source_media/image6.png')],
  ]);
  const PDF_MIME = 'application/pdf';
  const rootState = new WeakMap();
  const progressTimers = new WeakMap();
  const activeObjectUrls = new Set();
  let templatePdfPromise = null;
  let sourceFilesPromise = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const safeFilename = value => String(value || 'LUMA-Quotation').replace(/[^a-z0-9._-]+/gi, '_');

  async function fetchRequired(url, type) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Required quotation file could not be loaded: ${url}`);
    return type === 'text' ? response.text() : response.arrayBuffer();
  }

  async function loadTemplatePdf() {
    if (!templatePdfPromise) templatePdfPromise = fetchRequired(TEMPLATE_PDF_URL, 'binary')
      .then(buffer => new Blob([buffer], {type:PDF_MIME}))
      .catch(error => { templatePdfPromise = null; throw error; });
    return templatePdfPromise;
  }

  async function loadSourceFiles() {
    if (!sourceFilesPromise) sourceFilesPromise = Promise.all([
      fetchRequired(MASTER_URL, 'text'),
      ...TEMPLATE_ASSETS.map(([, url]) => fetchRequired(url, 'binary')),
    ]).then(([master, ...assetBuffers]) => ({master, assetBuffers}))
      .catch(error => { sourceFilesPromise = null; throw error; });
    return sourceFilesPromise;
  }

  async function compilerFiles(variables) {
    const source = await loadSourceFiles();
    const files = new Map([
      [MAIN_FILE, source.master],
      ['quotation_variables.tex', variables],
    ]);
    TEMPLATE_ASSETS.forEach(([target], index) => files.set(target, new Uint8Array(source.assetBuffers[index])));
    return files;
  }

  function currentModel() {
    const project = global.LumaApp.getActiveProject();
    return global.LumaQuotationModel.fromApplication(project, global.LumaApp.getCalculation(), global.LumaApp.getCommercialSummary?.());
  }

  function formHtml(quotation) {
    const controls=[...global.LumaQuotationFields.primaryControls(),{label:'Revision',key:'revision',inputType:'text'},{label:'Currency',key:'currency',inputType:'currency'}];
    return controls.map(({label, key, inputType = 'text', maxLength = null}) => {
      if (inputType === 'title') return `<label class="quotation-field"><span>${escapeHtml(label)}</span><select data-quotation-field="${key}">${['Mr','Mrs','Ms','Dr','MR/MRs'].map(value => `<option value="${value}" ${quotation[key] === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>`;
      if (inputType === 'currency') return `<label class="quotation-field"><span>${escapeHtml(label)}</span><select data-quotation-field="${key}">${global.LumaCurrencyData.OPTIONS.map(currency => `<option value="${currency.code}" ${quotation[key] === currency.code ? 'selected' : ''}>${escapeHtml(global.LumaCurrencyData.optionLabel(currency.code))}</option>`).join('')}</select></label>`;
      const rawValue = String(quotation[key] ?? '');
      const value = maxLength ? Array.from(rawValue).slice(0, maxLength).join('') : rawValue;
      const limitAttribute = maxLength ? ` maxlength="${maxLength}"` : '';
      return `<label class="quotation-field"><span>${escapeHtml(label)}</span><input data-quotation-field="${key}" type="${inputType}" value="${escapeHtml(value)}"${limitAttribute}></label>`;
    }).join('');
  }

  function draftFieldsHtml(quotation, model) {
    return [...global.LumaQuotationFields.draftGroups()].map(([group, definitions]) => `
      <details class="quotation-draft-group">
        <summary>${escapeHtml(group)} <span>${definitions.length} field${definitions.length === 1 ? '' : 's'}</span></summary>
        <div class="quotation-draft-grid">
          ${definitions.map(definition => {
            const override = global.LumaQuotationFields.templateOverrideValue(quotation, definition);
            const automatic = model?.automaticFields?.[definition.id];
            const source = automatic !== '' && automatic !== null && automatic !== undefined ? 'automatic from project' : 'manual quotation value';
            const placeholder = automatic !== '' && automatic !== null && automatic !== undefined ? `Auto: ${automatic}` : definition.exampleValue;
            return `<label class="quotation-field quotation-draft-field"><span>${escapeHtml(definition.label)} <small>PDF page ${definition.pdfPage} · ${escapeHtml(source)}</small></span><input data-quotation-template-field="${definition.id}" type="text" value="${escapeHtml(override)}" placeholder="${escapeHtml(placeholder)}"></label>`;
          }).join('')}
        </div>
      </details>`).join('');
  }

  function updateProjectFromForm(root) {
    const project = global.LumaApp.getActiveProject();
    project.quotation = global.LumaQuotationModel.normalize(project.quotation);
    root.querySelectorAll('[data-quotation-field]').forEach(input => { project.quotation[input.dataset.quotationField] = input.value.trim(); });
    root.querySelectorAll('[data-quotation-template-field]').forEach(input => { project.quotation.template_fields[input.dataset.quotationTemplateField] = input.value.trim(); });
    global.LumaApp.markProjectDirty();
  }

  function setStatus(root, message, kind = '') {
    const status = root.querySelector('[data-quotation-status]');
    if (!status) return;
    status.className = `quotation-status ${kind}`.trim();
    status.textContent = message;
  }

  const progressPhases = Object.freeze({
    'loading-engine':['Loading quotation engine...', 8],
    'engine-ready':['Quotation engine loaded.', 20],
    'loading-format':['Preparing the typesetting system and required packages...', 28],
    'compiling-pass-1':['Typesetting quotation: pass 1 of 2...', 45],
    'compiling-pass-2':['Typesetting quotation: pass 2 of 2...', 67],
    'converting-pdf':['Creating the PDF document...', 86],
    finalizing:['Finalizing quotation preview...', 96],
  });

  function updateProgress(root, label, percent) {
    const container = root.querySelector('[data-quotation-progress]');
    const bar = root.querySelector('[data-quotation-progress-bar]');
    const fill = root.querySelector('[data-quotation-progress-fill]');
    const text = root.querySelector('[data-quotation-progress-label]');
    if (!container || !bar || !fill || !text) return;
    const normalized = Math.max(0, Math.min(100, Number(percent) || 0));
    container.hidden = false;
    container.classList.remove('success', 'error');
    bar.setAttribute('aria-valuenow', String(normalized));
    fill.style.width = `${normalized}%`;
    text.textContent = label;
    const timer = progressTimers.get(root);
    if (timer) timer.percent = normalized;
  }

  function beginProgress(root) {
    const previous = progressTimers.get(root);
    if (previous?.interval) clearInterval(previous.interval);
    const timer = {started:Date.now(), percent:3, interval:null};
    progressTimers.set(root, timer);
    updateProgress(root, 'Preparing quotation files...', 3);
    const elapsed = root.querySelector('[data-quotation-progress-elapsed]');
    if (elapsed) elapsed.textContent = '0 seconds';
    timer.interval = setInterval(() => {
      const seconds = Math.max(1, Math.floor((Date.now() - timer.started) / 1000));
      if (elapsed) elapsed.textContent = `${seconds} second${seconds === 1 ? '' : 's'}`;
    }, 1000);
  }

  function setProgressPhase(root, phase, detail = {}) {
    const [label, fallbackProgress] = progressPhases[phase] || ['Generating quotation...', 35];
    updateProgress(root, label, detail.progress ?? fallbackProgress);
    setStatus(root, label, 'loading');
  }

  function finishProgress(root, outcome) {
    const timer = progressTimers.get(root);
    if (timer?.interval) clearInterval(timer.interval);
    const container = root.querySelector('[data-quotation-progress]');
    const elapsed = root.querySelector('[data-quotation-progress-elapsed]');
    const seconds = timer ? Math.max(1, Math.ceil((Date.now() - timer.started) / 1000)) : 0;
    if (elapsed) elapsed.textContent = seconds ? `${seconds} second${seconds === 1 ? '' : 's'}` : '';
    if (!container) return;
    container.classList.add(outcome);
    if (outcome === 'success') updateProgress(root, 'Quotation PDF complete.', 100);
    else root.querySelector('[data-quotation-progress-label]').textContent = 'Quotation generation stopped.';
    container.classList.add(outcome);
  }

  function setLog(root, log = '') {
    const details = root.querySelector('[data-quotation-log]');
    const output = root.querySelector('[data-quotation-log-output]');
    if (!details || !output) return;
    const text = String(log || '').trim();
    details.hidden = !text;
    output.textContent = text.length > 30000 ? text.slice(-30000) : text;
  }

  function setBusy(root, busy) {
    root.querySelectorAll('[data-quotation-action]').forEach(button => { button.disabled = busy; });
  }

  function replacePreview(root, nextState) {
    const previous = rootState.get(root);
    if (previous?.url) {
      URL.revokeObjectURL(previous.url);
      activeObjectUrls.delete(previous.url);
    }
    const url = URL.createObjectURL(nextState.blob);
    activeObjectUrls.add(url);
    rootState.set(root, {...nextState, url});
    root.querySelector('[data-quotation-pdf]').src = `${url}#view=FitH`;
  }

  async function showTemplatePreview(root) {
    const blob = await loadTemplatePdf();
    replacePreview(root, {blob, compiled:false, model:null, log:''});
    setStatus(root, 'LaTeX quotation template ready. Select Refresh Quotation to apply the project parameters.');
  }

  async function generateAuthoritativePdf(model, onStatus) {
    const warnings = global.LumaQuotationLatex.overflowWarnings(model);
    if (warnings.length) {
      const error = new Error(warnings[0]);
      error.code = 'FIELD_OVERFLOW';
      error.log = warnings.join('\n');
      throw error;
    }
    const variables = global.LumaQuotationLatex.buildVariables(model);
    const files = await compilerFiles(variables);
    const result = await global.LumaQuotationCompiler.compileQuotation(files, MAIN_FILE, {onStatus});
    return {...result, variables, compiled:true};
  }

  async function refresh(root) {
    updateProjectFromForm(root);
    const model = currentModel();
    setBusy(root, true);
    setLog(root);
    beginProgress(root);
    try {
      const result = await generateAuthoritativePdf(model, (phase, detail) => setProgressPhase(root, phase, detail));
      replacePreview(root, {...result, model});
      setLog(root, result.log);
      finishProgress(root, 'success');
      setStatus(root, 'Quotation generated successfully.', 'success');
    } catch (error) {
      console.error('Quotation generation failed.', {code:error?.code || 'UNKNOWN', message:error?.message || 'Unknown error'});
      if (error?.log) console.debug('Quotation compilation log:', error.log);
      setLog(root, error?.log);
      finishProgress(root, 'error');
      const loadFailure = ['ENGINE_UNAVAILABLE','ENGINE_LOAD_FAILED'].includes(error?.code);
      setStatus(root, error?.code === 'FIELD_OVERFLOW'
        ? error.message
        : loadFailure
        ? 'Unable to load quotation rendering engine. Dynamic quotation generation is unavailable; the previous preview has been kept.'
        : 'Quotation generation failed. Dynamic quotation generation is unavailable; the previous preview has been kept.', 'error');
    } finally {
      setBusy(root, false);
    }
  }

  async function savePdfBlob(blob, filename, fallbackUrl) {
    if (typeof global.showSaveFilePicker === 'function') {
      try {
        const handle = await global.showSaveFilePicker({
          suggestedName:filename,
          types:[{description:'PDF document', accept:{'application/pdf':['.pdf']}}],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return {saved:true, picker:true, cancelled:false};
      } catch (error) {
        if (error?.name === 'AbortError') return {saved:false, picker:true, cancelled:true};
        console.warn('The PDF location picker could not save the file; using the browser download instead.', error);
      }
    }
    const anchor = document.createElement('a');
    anchor.href = fallbackUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return {saved:true, picker:false, cancelled:false};
  }

  function markPreviewStale(root) {
    updateProjectFromForm(root);
    if (rootState.get(root)?.compiled) setStatus(root, 'Quotation information changed. Select Refresh Quotation to generate an updated PDF.');
  }

  async function downloadCurrent(root) {
    const state = rootState.get(root);
    if (!state?.compiled || !state.blob) {
      setStatus(root, 'Select Refresh Quotation before downloading the generated PDF.', 'error');
      return;
    }
    const filename = `${safeFilename(state.model.quotationNumber || state.model.projectCode)}.pdf`;
    try {
      setStatus(root, 'Choose where to save the quotation PDF...', 'loading');
      const result = await savePdfBlob(state.blob, filename, state.url);
      if (result.cancelled) { setStatus(root, 'PDF save cancelled.'); return; }
      setStatus(root, result.picker ? 'Quotation PDF saved.' : 'Quotation PDF downloaded.', 'success');
    } catch (error) {
      console.error('Quotation PDF save failed.', {message:error?.message || 'Unknown error'});
      setStatus(root, 'Quotation PDF could not be saved.', 'error');
    }
  }

  async function saveSnapshot(root) {
    updateProjectFromForm(root);
    const model = currentModel();
    if (!model.quotationNumber) { alert('Quotation Number is required before saving a snapshot.'); return; }
    try {
      const {error} = await global.LumaSupabase.getClient().from('quotations').insert({
        quotation_number:model.quotationNumber, revision:model.quotationVersion,
        project_id:model.projectId, project_code:model.projectCode, project_name:model.projectName,
        customer_company:model.clientCompany, currency:model.quotationCurrency,
        total_amount:model.quotationTotal, snapshot:model,
      });
      if (error) throw error;
      alert('Quotation snapshot saved.');
    } catch (error) {
      console.error('Quotation snapshot save failed.', {code:error?.code});
      alert(error?.code === '23505' ? 'This quotation number and revision already exist.' : 'The quotation snapshot could not be saved.');
    }
  }

  async function render(root) {
    const project = global.LumaApp.getActiveProject();
    if (!project) return;
    project.quotation = global.LumaQuotationModel.normalize(project.quotation);
    const model = currentModel();
    if (root.dataset.quotationProjectId === project.project_id && root.querySelector('[data-quotation-pdf]')) return;
    const previous = rootState.get(root);
    if (previous?.url) {
      URL.revokeObjectURL(previous.url);
      activeObjectUrls.delete(previous.url);
    }
    rootState.delete(root);
    root.dataset.quotationProjectId = project.project_id;
    root.innerHTML = `<div class="quotation-shell">
      <div class="quotation-heading"><h2 class="table-title">Quotation</h2><p class="table-subtitle">The quotation is generated from the parameterized LaTeX template in the project’s LaTeX folder.</p></div>
      <section class="quotation-information" aria-labelledby="quotationInformationTitle">
        <h3 id="quotationInformationTitle">Quotation Information</h3>
        <div class="quotation-form-grid">${formHtml(project.quotation)}</div>
        <section class="quotation-draft-fields" aria-labelledby="quotationDraftFieldsTitle">
          <h3 id="quotationDraftFieldsTitle">Quotation Draft Fields</h3>
          <p>Blank fields use the automatic project value shown in the field. Enter a value only when the quotation needs an override.</p>
          ${draftFieldsHtml(project.quotation, model)}
        </section>
        <div class="quotation-actions">
          <button type="button" data-quotation-action="refresh">Refresh Quotation</button>
          <button type="button" data-quotation-action="download">Save PDF</button>
          <button type="button" data-quotation-action="snapshot">Save Snapshot</button>
        </div>
        <p class="quotation-status loading" data-quotation-status role="status" aria-live="polite">Loading LaTeX quotation template...</p>
        <div class="quotation-progress" data-quotation-progress hidden>
          <div class="quotation-progress-copy"><strong data-quotation-progress-label>Preparing quotation files...</strong><span data-quotation-progress-elapsed>0 seconds</span></div>
          <div class="quotation-progress-track" data-quotation-progress-bar role="progressbar" aria-label="Quotation generation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-quotation-progress-fill></span></div>
        </div>
        <details class="quotation-log" data-quotation-log hidden><summary>Compilation log</summary><pre data-quotation-log-output></pre></details>
      </section>
      <section class="quotation-preview-section" aria-labelledby="quotationPreviewTitle">
        <h3 id="quotationPreviewTitle">Quotation Preview</h3>
        <iframe class="quotation-pdf-frame" data-quotation-pdf title="Generated LUMA quotation PDF preview"></iframe>
      </section>
    </div>`;
    root.querySelectorAll('[data-quotation-field]').forEach(input => input.addEventListener('change', () => markPreviewStale(root)));
    root.querySelectorAll('[data-quotation-template-field]').forEach(input => input.addEventListener('change', () => markPreviewStale(root)));
    root.querySelector('[data-quotation-action="refresh"]').addEventListener('click', () => void refresh(root));
    root.querySelector('[data-quotation-action="download"]').addEventListener('click', () => void downloadCurrent(root));
    root.querySelector('[data-quotation-action="snapshot"]').addEventListener('click', () => void saveSnapshot(root));
    try { await showTemplatePreview(root); }
    catch (error) {
      console.error('LaTeX quotation preview failed to load.', {message:error?.message});
      setStatus(root, 'The LaTeX quotation template could not be loaded.', 'error');
    }
  }

  async function openSettings(root, back) {
    if (!global.LumaAuth?.isAdmin?.()) return;
    const settings = await global.LumaQuotationModel.loadSettings();
    const fields = [['Currency','currency','currency'],['Default Revision','revision','text'],['Offer Validity (days)','validity_days','number'],['Delivery Time (weeks)','delivery_time_weeks','number'],['Safeguard Price','safeguard_price','number'],['Monitoring System Price','monitoring_price','number'],['Engineering Services Price','engineering_services_price','number'],['Commissioning and Testing Price','commissioning_price','number'],['Technician Working Days','technician_days','number'],['Pile Supplement / MWp','pile_supplement_per_mwp','number'],['Manworks Installation / day','manworks_installation_per_day','number'],['Extended KSI Staff / day','manworks_extended_per_day','number']];
    root.innerHTML = `<div class="admin-subpage-nav"><button class="admin-back-button" data-quotation-settings-back aria-label="Back">←</button></div><h2 class="table-title">Quotation Settings</h2><p class="table-subtitle">Manage company, commercial, and document defaults.</p><div class="supplier-form-grid">${fields.map(([label,key,type]) => type==='currency'?`<label>${escapeHtml(label)}<select data-quotation-setting="${key}">${global.LumaCurrencyData.OPTIONS.map(currency=>`<option value="${currency.code}" ${currency.code===(settings[key]||'EUR')?'selected':''}>${escapeHtml(global.LumaCurrencyData.optionLabel(currency.code))}</option>`).join('')}</select></label>`:`<label>${escapeHtml(label)}<input data-quotation-setting="${key}" type="${type}" value="${escapeHtml(settings[key] ?? '')}"></label>`).join('')}</div><button data-quotation-settings-save>Save Settings</button>`;
    root.querySelector('[data-quotation-settings-back]').addEventListener('click', back);
    root.querySelector('[data-quotation-settings-save]').addEventListener('click', async () => {
      const next = {...settings};
      root.querySelectorAll('[data-quotation-setting]').forEach(input => { next[input.dataset.quotationSetting] = input.type === 'number' ? (input.value === '' ? null : Number(input.value)) : input.value.trim(); });
      const {error} = await global.LumaSupabase.getClient().from('commercial_settings').upsert({area:'quotation', setting_key:'defaults', setting_value:next}, {onConflict:'area,setting_key'});
      if (error) { alert('Quotation settings could not be saved.'); return; }
      await global.LumaQuotationModel.loadSettings();
      alert('Quotation settings saved.');
    });
  }

  global.addEventListener('beforeunload', () => {
    for (const url of activeObjectUrls) URL.revokeObjectURL(url);
    activeObjectUrls.clear();
  });

  global.LumaQuotation = Object.freeze({
    normalize:global.LumaQuotationModel.normalize,
    buildModel:global.LumaQuotationModel.fromApplication,
    buildQuotationModel:global.LumaQuotationModel.buildQuotationModel,
    loadSettings:global.LumaQuotationModel.loadSettings,
    render, openSettings,
  });
})(window);
