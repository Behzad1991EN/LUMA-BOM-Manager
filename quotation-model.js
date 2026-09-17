'use strict';

(function initializeQuotationModel(global) {
  const fieldRegistry = global.LumaQuotationFields;
  if (!fieldRegistry) throw new Error('Quotation field definitions must load before the quotation model.');
  const DEFAULTS = Object.freeze({
    customer_company: '',
    title: 'Mr',
    client_first_name: '',
    client_last_name: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'Italy',
    project_location: '',
    quotation_number: '',
    revision: '00',
    date: '',
    currency: 'EUR',
    general_layout: '',
    template_fields: Object.freeze(fieldRegistry.templateDefaults()),
  });

  const FIELD_SOURCES = Object.freeze(Object.fromEntries(fieldRegistry.FIELDS.map(definition => [definition.id, definition.source])));
  const PROJECT_LOCATION_MAX_LENGTH = fieldRegistry.get('projectLocation')?.maxLength || 30;

  let settings = {
    currency: 'EUR', revision: '00', validity_days: 7, delivery_time_weeks: 20,
    safeguard_price: 2500, monitoring_price: 1800, engineering_services_price: 3500,
    commissioning_price: null, technician_days: null, pile_supplement_per_mwp: 550,
    manworks_installation_per_day: 500, manworks_extended_per_day: 600,
    source: 'DEMO / SAMPLE DEFAULTS TRANSCRIBED FROM LUMA_ENG_static.pdf',
  };

  const numberOrNull = value => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const number = value => numberOrNull(value) ?? 0;
  const roundUpToHundredthMetre = millimetres => Math.ceil(Math.max(0, number(millimetres)) / 10) / 100;

  function structureConfigurations(activeRows, totalTrackers, moduleVariants) {
    const quantities = new Map();
    activeRows.forEach(row => {
      const panels = numberOrNull(row['PV Modules per Tracker']);
      const quantity = numberOrNull(row['Number of Trackers']);
      if (panels === null || quantity === null || quantity <= 0) return;
      quantities.set(panels, (quantities.get(panels) || 0) + quantity);
    });
    const configurations = [...quantities.entries()]
      .sort(([left], [right]) => left - right)
      .map(([panels, quantity]) => Object.freeze({panels, quantity}));
    if (configurations.length || moduleVariants.length !== 1 || totalTrackers <= 0) return Object.freeze(configurations);
    return Object.freeze([Object.freeze({panels:moduleVariants[0], quantity:totalTrackers})]);
  }

  function normalize(value) {
    const source = value && typeof value === 'object' ? value : {};
    const legacyName = String(source.contact_name || '').trim().split(/\s+/).filter(Boolean);
    return {
      ...DEFAULTS,
      currency: global.LumaCurrencyData.normalizeCode(settings.currency, DEFAULTS.currency),
      revision: settings.revision || DEFAULTS.revision,
      ...source,
      currency: global.LumaCurrencyData.normalizeCode(source.currency, global.LumaCurrencyData.normalizeCode(settings.currency, DEFAULTS.currency)),
      project_location:Array.from(String(source.project_location ?? DEFAULTS.project_location)).slice(0, PROJECT_LOCATION_MAX_LENGTH).join(''),
      client_first_name: source.client_first_name || legacyName.shift() || '',
      client_last_name: source.client_last_name || legacyName.join(' '),
      template_fields: {...fieldRegistry.templateDefaults(), ...(source.template_fields && typeof source.template_fields === 'object' ? source.template_fields : {})},
    };
  }

  async function loadSettings() {
    const client = global.LumaSupabase?.getClient?.();
    if (!client) return {...settings};
    const {data, error} = await client.from('commercial_settings').select('setting_value').eq('area', 'quotation').eq('setting_key', 'defaults').maybeSingle();
    if (!error && data?.setting_value) settings = {...settings, ...data.setting_value};
    return {...settings};
  }

  function buildQuotationModel(project, bom, analysis, commercialData, quotationSettings = settings) {
    const quotation = normalize(project?.quotation);
    let fields = fieldRegistry.fieldValues(quotation);
    const inputs = project?.inputs || {};
    const bomRows = bom?.rows || [];
    const activeRows = analysis?.active || [];
    const kpis = analysis?.kpis || {};
    const quantityByTags = tags => bomRows.reduce((sum, row) => tags.includes(String(row.TAG || '').toLowerCase()) ? sum + number(row['Total Qty']) : sum, 0);
    const postRows = bomRows.filter(row => /mainpost|bearingpost|drivepile|bearingpile/.test(String(row['Part Name'] || row.Part || '').toLowerCase().replace(/\s+/g, '')));
    const bomPileCount = postRows.reduce((sum, row) => sum + number(row['Total Qty']), 0);
    const hasCompletePileSchedule = activeRows.length > 0 && activeRows.every(row => numberOrNull(row['Number of Trackers']) !== null && numberOrNull(row['Bearing Posts / Tracker']) !== null);
    const scheduledPileCount = activeRows.reduce((sum, row) => sum + number(row['Number of Trackers']) * (1 + number(row['Bearing Posts / Tracker'])), 0);
    const pileCount = hasCompletePileSchedule ? scheduledPileCount : bomPileCount;
    const trackerLengthMm = Math.max(0, ...activeRows.map(row => number(row['Tracker Length (mm)'])));
    const trackerLengthM = trackerLengthMm ? roundUpToHundredthMetre(trackerLengthMm) : null;
    const moduleVariants = [...new Set(activeRows.map(row => numberOrNull(row['PV Modules per Tracker'])).filter(value => value !== null))].sort((a, b) => a - b);
    const configurations = structureConfigurations(activeRows, number(kpis.totalTrackers), moduleVariants);
    const projectMWp = number(kpis.totalPower);
    const currency = quotation.currency || quotationSettings.currency || 'EUR';
    const safeguardQuantity = quantityByTags(['k001405', 'k001406']);
    const monitoringQuantity = quantityByTags(['k001525']);
    const safeguardUnitPrice = numberOrNull(quotationSettings.safeguard_price);
    const monitoringUnitPrice = numberOrNull(quotationSettings.monitoring_price);
    const engineeringUnitPrice = numberOrNull(quotationSettings.engineering_services_price);
    const commissioningUnitPrice = numberOrNull(quotationSettings.commissioning_price);
    const pricePerKw = numberOrNull(quotation.price_per_kw);
    const currencyTotal = numberOrNull(commercialData?.grandTotals?.[currency]);
    const automaticFields = Object.freeze({
      trackerOfferQuantity:projectMWp ? Math.round(projectMWp * 1000) : 0,
      panelsPerStructure:moduleVariants.join(' / '),
      structureCount:number(kpis.totalTrackers),
      pileCount,
      moduleCount:number(kpis.totalModules),
      moduleWidthMm:numberOrNull(inputs.pv_module_width),
      moduleLengthMm:numberOrNull(inputs.pv_module_length),
      modulePowerWp:numberOrNull(inputs.pv_power),
      trackerLengthM,
      trackerHeightM:numberOrNull(inputs.tracker_height_m),
      foundationDepthM:numberOrNull(inputs.drive_pile_depth_mm ?? inputs.foundation_depth_mm) === null ? null : number(inputs.drive_pile_depth_mm ?? inputs.foundation_depth_mm) / 1000,
      maximumTrackingTilt:numberOrNull(inputs.max_tracking_tilt_deg),
      groundClearanceM:numberOrNull(inputs.ground_clearance_m),
      pitchDistance:numberOrNull(inputs.pitch_m),
      safeguardQuantity,
      monitoringQuantity,
      commissioningPriceWhole:commissioningUnitPrice,
      commissioningWorkingDays:numberOrNull(quotationSettings.technician_days),
      pilePricePerMWpWhole:numberOrNull(quotationSettings.pile_supplement_per_mwp),
      installationManworkRateWhole:numberOrNull(quotationSettings.manworks_installation_per_day),
      extendedManworkRateWhole:numberOrNull(quotationSettings.manworks_extended_per_day),
    });
    fields = fieldRegistry.fieldValues(quotation, automaticFields);

    return Object.freeze({
      fields,
      automaticFields,
      clientCompany: fields.clientCompany,
      clientTitle: fields.clientTitle,
      clientFirstName: fields.clientFirstName,
      clientLastName: fields.clientLastName,
      clientName: [fields.clientFirstName, fields.clientLastName].filter(Boolean).join(' '),
      clientAddress: fields.clientAddress,
      clientPostalCode: fields.clientPostalCode,
      clientCity: fields.clientCity,
      clientCountry: fields.clientCountry,
      projectLocation: fields.projectLocation,
      projectCountry: inputs.project_country || quotation.country,
      projectMWp,
      quotationNumber: fields.quotationNumber,
      quotationVersion: quotation.revision,
      quotationDate: quotation.date,
      trackerCount: number(kpis.totalTrackers),
      structureConfigurations:configurations,
      pileCount,
      moduleCount: number(kpis.totalModules),
      modulesPerTracker: moduleVariants.join(' / '),
      moduleWidthMm: numberOrNull(inputs.pv_module_width),
      moduleLengthMm: numberOrNull(inputs.pv_module_length),
      modulePowerWp: numberOrNull(inputs.pv_power),
      trackerLengthM,
      trackerHeightM: numberOrNull(inputs.tracker_height_m),
      foundationMethod: inputs.foundation_method || inputs.foundation_type || '',
      foundationDepthMm: numberOrNull(inputs.drive_pile_depth_mm ?? inputs.foundation_depth_mm),
      maxTrackingTiltDeg: numberOrNull(inputs.max_tracking_tilt_deg),
      groundClearanceM: numberOrNull(inputs.ground_clearance_m),
      pitchM: numberOrNull(inputs.pitch_m),
      pricePerKw,
      trackerOfferTotal: pricePerKw === null ? null : projectMWp * 1000 * pricePerKw,
      safeguardQuantity,
      safeguardUnitPrice,
      safeguardTotal: safeguardUnitPrice === null ? null : safeguardQuantity * safeguardUnitPrice,
      monitoringQuantity,
      monitoringUnitPrice,
      monitoringTotal: monitoringUnitPrice === null ? null : monitoringQuantity * monitoringUnitPrice,
      engineeringQuantity: 1,
      engineeringUnitPrice,
      engineeringTotal: engineeringUnitPrice,
      commissioningQuantity: 1,
      commissioningUnitPrice,
      commissioningDays: numberOrNull(quotationSettings.technician_days),
      commissioningTotal: commissioningUnitPrice,
      pileSupplementPricePerMWp: numberOrNull(quotationSettings.pile_supplement_per_mwp),
      manworkRate1: numberOrNull(quotationSettings.manworks_installation_per_day),
      manworkRate2: numberOrNull(quotationSettings.manworks_extended_per_day),
      quotationTotal: currencyTotal,
      quotationCurrency: currency,
      commercialGapCount: number(commercialData?.gapCount),
      generalLayoutReference: quotation.general_layout,
      projectId: project?.project_id || '',
      projectCode: project?.project_code || '',
      projectName: project?.project_name || '',
      quotation,
      fieldSources: FIELD_SOURCES,
      generatedAt: new Date().toISOString(),
    });
  }

  function fromApplication(project, calculation, commercialData) {
    return buildQuotationModel(project, calculation?.bom, calculation, commercialData, settings);
  }

  global.LumaQuotationModel = Object.freeze({DEFAULTS, FIELD_SOURCES, normalize, loadSettings, buildQuotationModel, fromApplication});
})(window);
