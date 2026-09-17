'use strict';

(function initializeQuotationLatex(global) {
  const registry = global.LumaQuotationFields;
  if (!registry) throw new Error('Quotation field definitions must load before quotation LaTeX generation.');

  const LATEX_ESCAPES = Object.freeze({
    '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#',
    '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
  });

  function escapeLatex(value) {
    return Array.from(String(value ?? ''), character => LATEX_ESCAPES[character] || character).join('');
  }

  function fixed(value, digits = 2) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return '';
    return Number(value).toFixed(digits);
  }

  function european(value, digits = 2) {
    const raw = fixed(value, digits);
    if (!raw) return '';
    const [integer, decimals] = raw.split('.');
    return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${digits ? `,${decimals}` : ''}`;
  }

  function buildVariables(model) {
    const values = model?.fields || {};
    const fieldCommands = registry.FIELDS.map(definition => {
      const value = values[definition.id] ?? definition.exampleValue;
      return `\\newcommand{\\${registry.commandName(definition.id)}}{${escapeLatex(value)}}`;
    });
    const numberOrNull = value => value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
    const money = value => numberOrNull(value) === null ? '' : european(value, 2);
    const compact = (value, maximumDigits = 3) => {
      const numeric = numberOrNull(value);
      if (numeric === null) return '';
      return numeric.toLocaleString('de-DE', {minimumFractionDigits:0, maximumFractionDigits:maximumDigits});
    };
    const displayValue = (value, maximumDigits = 2) => numberOrNull(value) === null ? String(value ?? '') : compact(value, maximumDigits);
    const suppliedConfigurations = Array.isArray(model?.structureConfigurations) ? model.structureConfigurations : [];
    const structureConfigurations = suppliedConfigurations.length ? suppliedConfigurations : [{
      panels:values.panelsPerStructure ?? 'XX',
      quantity:values.structureCount ?? 'XX',
    }];
    const configurationStartY = 220.82;
    const configurationEndY = 375;
    const configurationDetailLines = 11;
    const configurationLineCount = structureConfigurations.length + configurationDetailLines;
    const configurationLineStep = Math.min(13.83, (configurationEndY - configurationStartY) / Math.max(1, configurationLineCount - 1));
    const configurationFontSize = Math.min(10.56, Math.max(8, configurationLineStep - 0.25));
    const configurationDetailStartY = configurationStartY + structureConfigurations.length * configurationLineStep;
    const structureRows = structureConfigurations.map((configuration, index) => {
      const y = (configurationStartY + index * configurationLineStep).toFixed(3);
      const panels = escapeLatex(displayValue(configuration?.panels));
      const quantity = escapeLatex(displayValue(configuration?.quantity));
      return `  \\PlaceConfigurationLine{${y}}{N. of structures with ${panels} panels: ${quantity}}%`;
    }).join('\n');
    const date = String(model?.quotationDate || '');
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const currencyCode = String(model?.quotationCurrency || 'EUR');
    const currencySymbol = global.LumaCurrencyData?.symbol?.(currencyCode) || currencyCode;
    const trackerPrice = numberOrNull(model?.pricePerKw) ?? numberOrNull(values.trackerPricePerKwWhole);
    const trackerQuantity = numberOrNull(values.trackerOfferQuantity);
    const safeguardQuantity = numberOrNull(values.safeguardQuantity);
    const monitoringQuantity = numberOrNull(values.monitoringQuantity);
    const commissioningPrice = numberOrNull(model?.commissioningUnitPrice) ?? numberOrNull(values.commissioningPriceWhole);
    const runtimeValues = {
      QFProjectMWp:compact(model?.projectMWp),
      QFClientName:[model?.clientFirstName, model?.clientLastName].map(value => String(value || '').trim()).filter(Boolean).join(' '),
      QFClientPostalCity:[model?.clientPostalCode, model?.clientCity].map(value => String(value || '').trim()).filter(Boolean).join(' - '),
      QFQuotationVersion:model?.quotationVersion || '',
      QFQuotationDate:dateMatch ? `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}` : date,
      QFQuotationDateYear:dateMatch?.[1] || '',
      QFCurrencyCode:currencyCode,
      QFCurrencySymbol:currencySymbol,
      QFTrackerPricePerKw:money(trackerPrice),
      QFTrackerOfferTotal:money(trackerQuantity !== null && trackerPrice !== null ? trackerQuantity * trackerPrice : model?.trackerOfferTotal),
      QFSafeguardUnitPrice:money(model?.safeguardUnitPrice),
      QFSafeguardTotal:money(safeguardQuantity !== null && numberOrNull(model?.safeguardUnitPrice) !== null ? safeguardQuantity * Number(model.safeguardUnitPrice) : model?.safeguardTotal),
      QFMonitoringUnitPrice:money(model?.monitoringUnitPrice),
      QFMonitoringTotal:money(monitoringQuantity !== null && numberOrNull(model?.monitoringUnitPrice) !== null ? monitoringQuantity * Number(model.monitoringUnitPrice) : model?.monitoringTotal),
      QFEngineeringUnitPrice:money(model?.engineeringUnitPrice),
      QFEngineeringTotal:money(model?.engineeringTotal),
      QFCommissioningPrice:money(commissioningPrice),
      QFCommissioningTotal:money(commissioningPrice),
      QFQuotationTotal:money(model?.quotationTotal),
      QFPilePricePerMWp:money(numberOrNull(values.pilePricePerMWpWhole) ?? model?.pileSupplementPricePerMWp),
      QFInstallationManworkRate:money(numberOrNull(values.installationManworkRateWhole) ?? model?.manworkRate1),
      QFExtendedManworkRate:money(numberOrNull(values.extendedManworkRateWhole) ?? model?.manworkRate2),
    };
    const runtimeCommands = Object.entries(runtimeValues).map(([name, value]) => `\\newcommand{\\${name}}{${escapeLatex(value)}}`);
    const configurationCommands = [
      `\\newcommand{\\QFConfigurationLineStep}{${configurationLineStep.toFixed(3)}}`,
      `\\newcommand{\\QFConfigurationFontSize}{${configurationFontSize.toFixed(3)}}`,
      `\\newcommand{\\QFConfigurationDetailStartY}{${configurationDetailStartY.toFixed(3)}}`,
      `\\newcommand{\\QFStructureConfigurationRows}{%\n${structureRows}\n}`,
    ];
    return [...fieldCommands, ...runtimeCommands, ...configurationCommands].join('\n') + '\n';
  }

  const decimal = value => Number(value).toFixed(2).replace(/\.00$/, '');
  const weight = definition => definition.text.fontWeight === 'bold' ? '\\bfseries' : '\\mdseries';
  const content = definition => `${escapeLatex(definition.text.prefix)}\\${registry.commandName(definition.id)}{}${escapeLatex(definition.text.suffix)}`;

  function approximateWidthMm(definition, value, fontSizePt = definition.text.fontSizePt) {
    return Array.from(value).reduce((sum, character) => sum + (character === ' ' ? 0.22 : 0.42), 0) * fontSizePt * 25.4 / 72;
  }

  function fittedFontSize(definition, value) {
    const normalWidth = approximateWidthMm(definition, value);
    if (normalWidth <= definition.text.widthMm) return definition.text.fontSizePt;
    return Math.max(definition.text.minFontSizePt, definition.text.fontSizePt * definition.text.widthMm / normalWidth);
  }

  function pageOverlay(page, model) {
    const pageNames = {1:'One',4:'Four',5:'Five',6:'Six',11:'Eleven'};
    const commands = registry.FIELDS.filter(definition => definition.page === page).map(definition => {
      const e = definition.erase;
      const t = definition.text;
      const fieldValue = `${t.prefix}${model?.fields?.[definition.id] ?? definition.exampleValue}${t.suffix}`;
      const fittedSize = fittedFontSize(definition, fieldValue);
      const background = e.background === 'peach' ? 'QuotationPeach' : 'QuotationWhite';
      return [
        `    \\QErase{${decimal(e.xMm)}}{${decimal(e.yMm)}}{${decimal(e.widthMm)}}{${decimal(e.heightMm)}}{${background}}`,
        `    \\QText{${t.anchor}}{${definition.id}}{${decimal(t.xMm)}}{${decimal(t.baselineYMm)}}{${decimal(t.widthMm)}}{${decimal(fittedSize)}}{${decimal(t.minFontSizePt)}}{${t.color}}{${weight(definition)} ${content(definition)}}`,
      ].join('\n');
    });
    return `\\renewcommand{\\QuotationPage${pageNames[page]}Overlay}{%\n  \\begin{tikzpicture}[remember picture,overlay]\n${commands.join('\n')}\n  \\end{tikzpicture}%\n}`;
  }

  function buildLayout(baseLayout, model) {
    const debug = registry.LAYOUT_DEBUG ? '\\QuotationLayoutDebugtrue' : '\\QuotationLayoutDebugfalse';
    const overlays = [1,4,5,6,11].map(page => pageOverlay(page, model)).join('\n\n');
    return `${String(baseLayout || '').trim()}\n${debug}\n\n${overlays}\n`;
  }

  function overflowWarnings(model) {
    const values = model?.fields || {};
    return registry.FIELDS.filter(definition => definition.overflowCheck !== false).flatMap(definition => {
      const value = `${definition.text.prefix}${values[definition.id] ?? definition.exampleValue}${definition.text.suffix}`;
      const minimumWidthMm = approximateWidthMm(definition, value, definition.text.minFontSizePt);
      return minimumWidthMm > definition.text.widthMm
        ? [`${definition.label} is longer than its safe PDF field width and may be clipped. Shorten the value.`]
        : [];
    });
  }

  global.LumaQuotationLatex = Object.freeze({escapeLatex, buildVariables, buildLayout, overflowWarnings, formatEuropeanNumber:european});
})(window);
