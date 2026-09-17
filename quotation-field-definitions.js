'use strict';

(function initializeQuotationFieldDefinitions(global) {
  const SOURCE_TBD = 'TBD';
  const LAYOUT_DEBUG = false;
  const PDF_PAGE_BY_LAYOUT_PAGE = Object.freeze({1:1, 4:3, 5:4, 6:5, 11:10});

  const text = (xMm, baselineYMm, widthMm, fontSizePt, options = {}) => ({
    xMm, baselineYMm, widthMm, fontFamily:'Carlito', fontSizePt,
    minFontSizePt:options.minFontSizePt ?? Math.max(7, fontSizePt - 2),
    fontWeight:options.fontWeight || 'normal', color:options.color || '595959',
    align:options.align || 'left', anchor:options.anchor || 'base west',
    lineHandling:options.lineHandling || 'shrink-then-warn',
    prefix:options.prefix || '', suffix:options.suffix || '',
  });
  const erase = (xMm, yMm, widthMm, heightMm, background = 'white') => ({xMm, yMm, widthMm, heightMm, background});
  const field = (id, page, label, group, exampleValue, eraseBox, textBox, options = {}) => Object.freeze({
    id, page, pdfPage:PDF_PAGE_BY_LAYOUT_PAGE[page] || page, label, group, source:SOURCE_TBD, valueType:options.valueType || 'text',
    exampleValue, editable:true, storageKey:options.storageKey || `template_fields.${id}`,
    valuePart:options.valuePart || '', inputType:options.inputType || 'text',
    maxLength:Number.isInteger(options.maxLength) && options.maxLength > 0 ? options.maxLength : null,
    erase:eraseBox, text:textBox, ambiguous:options.ambiguous || '',
    overflowCheck:options.overflowCheck !== false,
  });

  const FIELDS = Object.freeze([
    // Page 1 — cover, customer, quotation reference.
    field('clientCompany', 1, 'Client Company', 'Client', 'NAME COMPANY',
      erase(19.93,141.64,73.10,9.70), text(92.80,149.93,72.70,22,{fontWeight:'bold',color:'3F3F3F',minFontSizePt:18,align:'right',anchor:'base east',suffix:'/'}),
      {storageKey:'customer_company'}),
    field('projectLocation', 1, 'Project Location', 'Client', 'Location',
      erase(79.73,164.92,25.05,8.64), text(79.77,172.16,25.00,20,{fontWeight:'bold',color:'A6A6A6',minFontSizePt:17}),
      {storageKey:'project_location',maxLength:30,overflowCheck:false}),
    field('clientTitle', 1, 'Contact Title', 'Client', 'MR/MRs',
      erase(43.39,183.09,27.87,9.52), text(43.40,191.03,27.80,22,{color:'A6A6A6',minFontSizePt:18}),
      {storageKey:'title',inputType:'title'}),
    field('clientFirstName', 1, 'Client First Name', 'Client', 'XXXXX',
      erase(26.63,192.62,21.52,9.52), text(26.59,200.48,21.55,22,{fontWeight:'bold',color:'3F3F3F',minFontSizePt:18}),
      {storageKey:'client_first_name'}),
    field('clientLastName', 1, 'Client Last Name', 'Client', 'XXXXXX',
      erase(49.57,192.62,25.93,9.52), text(49.71,200.48,25.78,22,{fontWeight:'bold',color:'3F3F3F',minFontSizePt:18}),
      {storageKey:'client_last_name'}),
    field('clientAddress', 1, 'Address', 'Client', 'Address',
      erase(26.63,208.14,13.93,5.29), text(26.59,212.30,54.00,12,{color:'A6A6A6',minFontSizePt:9}),
      {storageKey:'address'}),
    field('clientPostalCode', 1, 'Postal Code', 'Client', 'Postal code',
      erase(26.63,213.25,22.90,5.29), text(26.59,217.45,22.10,12,{color:'A6A6A6',minFontSizePt:10,suffix:' -'}),
      {storageKey:'postal_code'}),
    field('clientCity', 1, 'City', 'Client', 'City',
      erase(49.39,213.25,6.88,5.29), text(49.66,217.45,31.00,12,{color:'A6A6A6',minFontSizePt:9}),
      {storageKey:'city'}),
    field('clientCountry', 1, 'Country', 'Client', 'Country',
      erase(26.63,218.55,13.93,5.29), text(26.59,222.60,54.00,12,{color:'A6A6A6',minFontSizePt:9}),
      {storageKey:'country'}),
    field('quotationNumber', 1, 'Quotation Number', 'Quotation Reference', 'XXXX',
      erase(161.75,243.42,17.28,4.76), text(180.40,247.12,17.20,11,{color:'7F7F7F',minFontSizePt:9,align:'right',anchor:'base east'}),
      {storageKey:'quotation_number'}),
    field('quotationDateDay', 1, 'Quotation Date — Day', 'Quotation Reference', 'XX',
      erase(171.10,248.88,4.06,4.76), text(175.05,252.59,4.00,11,{color:'7F7F7F',minFontSizePt:9,align:'right',anchor:'base east'}),
      {storageKey:'date',valuePart:'day',inputType:'date'}),
    field('quotationDateMonth', 1, 'Quotation Date — Month', 'Quotation Reference', 'XX',
      erase(176.57,248.88,4.06,4.76), text(180.55,252.59,4.00,11,{color:'7F7F7F',minFontSizePt:9,align:'right',anchor:'base east'}),
      {storageKey:'date',valuePart:'month',inputType:'date'}),

    // Page 4 — offer and configuration.
    field('trackerOfferQuantity', 4, 'Tracker Offer Quantity', 'Offer', 'kWp',
      erase(113.59,40.22,7.06,3.88,'peach'), text(113.56,43.22,7.05,10,{color:'000000',minFontSizePt:8}),
      {ambiguous:'The approved placeholder reads “kWp” in the Qty column; its future business meaning is not assigned.'}),
    field('trackerPricePerKwWhole', 4, 'Tracker Price €/kW — Whole Number', 'Offer', 'XXX',
      erase(133.17,40.22,7.06,3.88,'peach'), text(140.10,43.22,7.00,11,{color:'000000',minFontSizePt:9,align:'right',anchor:'base east'}),
      {storageKey:'price_per_kw',inputType:'number'}),
    field('panelsPerStructure', 4, 'Panels per Structure', 'Project Configuration', 'XX',
      erase(66.32,73.91,3.88,4.94), text(70.20,77.79,3.85,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'}),
      {overflowCheck:false}),
    field('structureCount', 4, 'Number of Structures', 'Project Configuration', 'XX',
      erase(82.73,73.91,3.70,4.94), text(82.73,77.79,3.65,11,{color:'595959',minFontSizePt:9}),
      {overflowCheck:false}),
    field('pileCount', 4, 'Number of Piles', 'Project Configuration', 'XXXX',
      erase(47.62,78.85,7.58,4.94), text(47.62,82.73,7.50,11,{color:'595959',minFontSizePt:9}),
      {overflowCheck:false}),
    field('moduleCount', 4, 'Module Quantity', 'Project Configuration', 'XXXX',
      erase(37.22,88.72,7.76,4.41), text(44.98,92.25,7.70,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('moduleWidthMm', 4, 'Module Width', 'Project Configuration', 'XXXX',
      erase(56.62,93.49,7.76,4.41), text(64.30,97.01,7.70,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('moduleLengthMm', 4, 'Module Length', 'Project Configuration', 'XXXX',
      erase(65.97,93.49,7.58,4.41), text(73.50,97.01,7.50,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('modulePowerWp', 4, 'Module Power', 'Project Configuration', 'XXX',
      erase(48.70,98.07,5.95,4.59), text(54.55,101.60,5.60,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('trackerLengthM', 4, 'Tracker Length', 'Project Configuration', 'XX',
      erase(54.50,102.83,3.88,4.94), text(58.38,106.72,3.85,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'}),
      {overflowCheck:false}),
    field('trackerHeightM', 4, 'Height with Flat Panels', 'Project Configuration', '1,50',
      erase(70.38,107.77,6.53,4.94), text(76.91,111.65,6.48,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('foundationDepthM', 4, 'Ramming Depth', 'Project Configuration', '1,50',
      erase(60.50,112.71,6.53,4.94), text(67.03,116.59,6.48,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('maximumTrackingTilt', 4, 'Maximum Tracking Tilt', 'Project Configuration', '60°',
      erase(60.85,117.65,5.12,4.76), text(60.85,121.53,5.08,11,{color:'595959',minFontSizePt:9})),
    field('groundClearanceM', 4, 'Ground Clearance at 60°', 'Project Configuration', '0,50',
      erase(72.85,122.41,6.53,4.94), text(79.38,126.29,6.48,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('pitchDistance', 4, 'Pitch Distance', 'Project Configuration', 'XX,XX m',
      erase(57.33,127.35,14.25,4.94), text(71.50,131.23,14.15,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east',suffix:'/'})),
    field('safeguardQuantity', 4, 'Safeguard Quantity', 'Offer', 'X',
      erase(118.18,135.11,2.47,3.88,'peach'), text(118.26,138.11,2.35,10,{color:'000000',minFontSizePt:8})),
    field('monitoringQuantity', 4, 'Monitoring System Quantity', 'Offer', 'X',
      erase(118.18,169.33,2.47,3.88,'peach'), text(118.26,172.51,2.35,10,{color:'000000',minFontSizePt:8})),
    field('commissioningPriceWhole', 4, 'Commissioning Price — Whole Number', 'Offer', 'XXXX',
      erase(130.88,240.77,9.35,3.88,'peach'), text(140.10,243.77,9.30,11,{color:'000000',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('footnoteDesignCode', 4, 'Footnote Design Code', 'Offer Footnote', 'Eurocode 1991',
      erase(92.43,265.64,21.52,4.23), text(113.90,268.82,21.45,10,{color:'7F7F7F',minFontSizePt:8,align:'right',anchor:'base east'})),
    field('footnoteWindLoad', 4, 'Footnote Wind Load', 'Offer Footnote', '250N/m²',
      erase(41.10,269.88,12.88,4.23), text(53.98,273.23,12.80,10,{color:'7F7F7F',minFontSizePt:8,align:'right',anchor:'base east'})),

    // Pages 5, 6, and 11.
    field('commissioningWorkingDays', 5, 'Commissioning Technician Working Days', 'Commissioning', 'XX',
      erase(63.15,47.27,3.88,4.76), text(67.03,50.98,3.82,11,{color:'595959',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('pilePricePerMWpWhole', 6, 'Piles Price per MWp — Whole Number', 'Supplements', '550',
      erase(179.39,35.45,5.97,4.06,'peach'), text(185.20,38.63,5.75,11,{color:'000000',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('installationManworkRateWhole', 6, 'Installation Manworks Daily Rate — Whole Number', 'Supplements', '500',
      erase(179.39,77.08,5.97,4.76), text(185.20,80.96,5.65,11,{color:'000000',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('extendedManworkRateWhole', 6, 'Extended Manworks Daily Rate — Whole Number', 'Supplements', '600',
      erase(179.39,88.55,5.97,4.76), text(185.20,92.43,5.65,11,{color:'000000',minFontSizePt:9,align:'right',anchor:'base east'})),
    field('generalLayoutReference', 11, 'General Layout Reference', 'Attachments', 'XXXXXXX',
      erase(53.80,116.42,12.88,4.23), text(66.68,119.77,12.80,10,{color:'595959',minFontSizePt:8,align:'right',anchor:'base east'}),
      {storageKey:'general_layout'}),
  ]);

  const byId = new Map(FIELDS.map(definition => [definition.id, definition]));
  const commandName = id => `QF${String(id).replace(/(^|[^a-z0-9]+)([a-z0-9])/gi, (_match, _separator, character) => character.toUpperCase())}`;
  const hasValue = value => value !== '' && value !== null && value !== undefined;
  const templateOverrideValue = (quotation, definition) => {
    const value = quotation?.template_fields?.[definition.id];
    return hasValue(value) && String(value) !== String(definition.exampleValue) ? String(value) : '';
  };
  const storageValue = (quotation, definition, automaticValues = {}) => {
    if (definition.storageKey.startsWith('template_fields.')) {
      const override = templateOverrideValue(quotation, definition);
      if (override) return override;
      const automatic = automaticValues[definition.id];
      return hasValue(automatic) ? automatic : definition.exampleValue;
    }
    const raw = quotation[definition.storageKey];
    if (definition.valuePart) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw || ''));
      if (!match) return definition.exampleValue;
      return definition.valuePart === 'day' ? match[3] : match[2];
    }
    return raw === '' || raw === null || raw === undefined ? definition.exampleValue : raw;
  };
  const limitValue = (definition, value) => {
    const characters = Array.from(String(value));
    return definition.maxLength ? characters.slice(0, definition.maxLength).join('') : characters.join('');
  };
  const fieldValues = (quotation, automaticValues = {}) => Object.freeze(Object.fromEntries(FIELDS.map(definition => [definition.id, limitValue(definition, storageValue(quotation || {}, definition, automaticValues))])));
  const templateDefaults = () => Object.fromEntries(FIELDS.filter(definition => definition.storageKey.startsWith('template_fields.')).map(definition => [definition.id, '']));
  const primaryControls = () => {
    const seen = new Set();
    return FIELDS.filter(definition => !definition.storageKey.startsWith('template_fields.')).filter(definition => {
      if (seen.has(definition.storageKey)) return false;
      seen.add(definition.storageKey);
      return true;
    }).map(definition => ({label:definition.valuePart ? 'Quotation Date' : definition.label, key:definition.storageKey, inputType:definition.inputType, group:definition.group, maxLength:definition.maxLength}));
  };
  const draftGroups = () => {
    const groups = new Map();
    for (const definition of FIELDS.filter(item => item.storageKey.startsWith('template_fields.'))) {
      if (!groups.has(definition.group)) groups.set(definition.group, []);
      groups.get(definition.group).push(definition);
    }
    return groups;
  };

  global.LumaQuotationFields = Object.freeze({SOURCE_TBD, LAYOUT_DEBUG, FIELDS, get:id => byId.get(id), commandName, fieldValues, templateDefaults, templateOverrideValue, primaryControls, draftGroups});
})(window);
