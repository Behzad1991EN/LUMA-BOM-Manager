'use strict';

(function initializeCommercialCostCalculator(global) {
  const VAT_RATES = Object.freeze([0, 0.10, 0.22]);
  const OVERHEAD_CURRENCY = 'EUR';
  const DEFAULT_OVERHEAD_SETTINGS = Object.freeze({
    ksi_annual_overhead_eur: 1000000,
    ksi_annual_project_capacity_mwp: 120,
  });

  function normalizeVatRate(value) {
    const rate = Number(value);
    return VAT_RATES.includes(rate) ? rate : 0;
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
  }

  function nonNegativeNumber(value) {
    if (isBlank(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function normalizeProjectPercentage(value, blankValue = '') {
    if (isBlank(value)) return blankValue;
    const number = Number(value);
    return Number.isFinite(number) ? number : blankValue;
  }

  function numericTotals(source) {
    const totals = {};
    for (const [currency, value] of Object.entries(source || {})) {
      const amount = Number(value);
      if (currency && Number.isFinite(amount)) totals[currency] = amount;
    }
    return totals;
  }

  function amountFor(totals, currency) {
    const amount = Number(totals?.[currency]);
    return Number.isFinite(amount) ? amount : 0;
  }

  function buildOverhead({
    overheadSettings,
    overheadSettingsStatus = 'ready',
    projectCapacityMwp,
    commercialContingencyPercent,
    penaltyPercent,
    marginPercent,
  } = {}) {
    const source = overheadSettings && typeof overheadSettings === 'object' ? overheadSettings : DEFAULT_OVERHEAD_SETTINGS;
    const annualOverhead = nonNegativeNumber(source.ksi_annual_overhead_eur);
    const annualCapacity = nonNegativeNumber(source.ksi_annual_project_capacity_mwp);
    const projectCapacity = nonNegativeNumber(projectCapacityMwp);
    const contingencyWasBlank = isBlank(commercialContingencyPercent);
    const contingencyPercent = contingencyWasBlank ? 5 : nonNegativeNumber(commercialContingencyPercent);
    const penaltyWasBlank = isBlank(penaltyPercent);
    const normalizedPenaltyPercent = penaltyWasBlank ? null : nonNegativeNumber(penaltyPercent);
    const marginWasBlank = isBlank(marginPercent);
    const normalizedMarginPercent = marginWasBlank ? 0 : normalizeProjectPercentage(marginPercent, null);
    const errors = [];

    if (overheadSettingsStatus !== 'ready') errors.push(overheadSettingsStatus === 'loading' || overheadSettingsStatus === 'idle' ? 'Overhead configuration is loading.' : 'Overhead configuration is unavailable.');
    if (annualOverhead === null) errors.push('KSI Annual Overhead must be zero or greater.');
    if (annualCapacity === null || annualCapacity <= 0) errors.push('KSI Project Capacity per Year must be greater than zero.');
    if (projectCapacity === null) errors.push('Current Project Capacity is unavailable.');
    if (contingencyPercent === null) errors.push('Commercial Contingency percentage must be zero or greater.');
    if (penaltyWasBlank) errors.push('Penalty percentage is required.');
    else if (normalizedPenaltyPercent === null) errors.push('Penalty percentage must be zero or greater.');
    if (!marginWasBlank && normalizedMarginPercent === null) errors.push('Margin percentage must be a valid number.');

    const coefficientA = annualOverhead !== null && annualCapacity !== null && annualCapacity > 0 ? annualOverhead / annualCapacity : null;
    const constantOverhead = coefficientA !== null && projectCapacity !== null ? projectCapacity * coefficientA : null;
    const percentagesValid = contingencyPercent !== null && normalizedPenaltyPercent !== null && normalizedMarginPercent !== null;
    const combinedPercent = percentagesValid ? contingencyPercent + normalizedPenaltyPercent + normalizedMarginPercent : null;
    const percentageAmount = constantOverhead !== null && combinedPercent !== null ? constantOverhead * (combinedPercent / 100) : null;
    const totalOverhead = constantOverhead !== null && percentageAmount !== null ? constantOverhead + percentageAmount : null;

    return Object.freeze({
      currency: OVERHEAD_CURRENCY,
      configurationStatus: overheadSettingsStatus,
      annualOverhead,
      annualCapacity,
      coefficientA,
      projectCapacity,
      constantOverhead,
      contingencyPercent,
      contingencyDefaulted: contingencyWasBlank,
      penaltyPercent: normalizedPenaltyPercent,
      penaltyMissing: penaltyWasBlank,
      marginPercent: normalizedMarginPercent,
      marginBlank: marginWasBlank,
      combinedPercent,
      percentageAmount,
      totalOverhead,
      valid: errors.length === 0,
      errors: Object.freeze(errors),
    });
  }

  function buildResult({
    baseCosts,
    externalLogistics,
    internalLogistics,
    vatRate,
    baseGapCount = 0,
    logisticsComplete = false,
    overheadSettings,
    overheadSettingsStatus = 'ready',
    projectCapacityMwp,
    commercialContingencyPercent,
    penaltyPercent,
    marginPercent,
  } = {}) {
    const normalizedBase = numericTotals(baseCosts);
    const normalizedExternal = numericTotals(externalLogistics);
    const normalizedInternal = numericTotals(internalLogistics);
    const rate = normalizeVatRate(vatRate);
    const overhead = buildOverhead({overheadSettings, overheadSettingsStatus, projectCapacityMwp, commercialContingencyPercent, penaltyPercent, marginPercent});
    const currencies = [...new Set([...Object.keys(normalizedBase), ...Object.keys(normalizedExternal), ...Object.keys(normalizedInternal)])].sort((a, b) => a.localeCompare(b));
    const canCombineCurrency = currencies.length === 1 && currencies[0] === OVERHEAD_CURRENCY;
    const canCalculateFinal = canCombineCurrency && overhead.valid && overhead.totalOverhead !== null;
    const byCurrency = {};

    for (const currency of currencies) {
      const baseCommercialCost = amountFor(normalizedBase, currency);
      const externalLogisticsTotal = amountFor(normalizedExternal, currency);
      const internalLogisticsTotal = amountFor(normalizedInternal, currency);
      const logisticsTotal = externalLogisticsTotal + internalLogisticsTotal;
      const previousProjectPrice = baseCommercialCost + logisticsTotal;
      const totalProjectOverhead = canCalculateFinal ? overhead.totalOverhead : null;
      const subtotalBeforeVat = canCalculateFinal ? previousProjectPrice + totalProjectOverhead : null;
      const vatAmount = subtotalBeforeVat === null ? null : subtotalBeforeVat * rate;
      byCurrency[currency] = Object.freeze({
        currency,
        baseCommercialCost,
        externalLogisticsTotal,
        internalLogisticsTotal,
        logisticsTotal,
        previousProjectPrice,
        projectConstantOverhead: canCalculateFinal ? overhead.constantOverhead : null,
        percentageOverheadAmount: canCalculateFinal ? overhead.percentageAmount : null,
        totalProjectOverhead,
        subtotalBeforeVat,
        vatRate: rate,
        vatAmount,
        finalCostIncludingVat: subtotalBeforeVat === null ? null : subtotalBeforeVat + vatAmount,
      });
    }

    const currencyMismatch = currencies.length > 0 && !canCombineCurrency;
    const single = currencies.length === 1 ? byCurrency[currencies[0]] : null;
    const warnings = [];
    if (currencyMismatch) warnings.push('Project Overhead is in EUR, but the Previous Project Price is not exclusively EUR. No combined subtotal or final price has been produced because no authoritative FX rate is configured.');
    if (!currencies.length) warnings.push('Previous Project Price is unavailable because no commercial currency total has been produced.');
    if (Number(baseGapCount) > 0) warnings.push('Base commercial pricing is incomplete. Priced-item subtotals are shown, but the final price is incomplete.');
    if (!logisticsComplete) warnings.push('Logistics is incomplete. Configure every required route, capacity, and per-container rate before relying on the final price.');
    warnings.push(...overhead.errors);

    return Object.freeze({
      baseCosts: Object.freeze(normalizedBase),
      logistics: Object.freeze({external: Object.freeze(normalizedExternal), internal: Object.freeze(normalizedInternal)}),
      currencies: Object.freeze(currencies),
      byCurrency: Object.freeze(byCurrency),
      currencyMismatch,
      previousProjectPrice: canCombineCurrency ? single?.previousProjectPrice ?? null : null,
      overhead,
      subtotalBeforeVat: canCalculateFinal ? single?.subtotalBeforeVat ?? null : null,
      vat: Object.freeze({rate, amount: canCalculateFinal ? single?.vatAmount ?? null : null}),
      finalCostIncludingVat: canCalculateFinal ? single?.finalCostIncludingVat ?? null : null,
      currency: canCombineCurrency ? OVERHEAD_CURRENCY : '',
      complete: Boolean(canCalculateFinal && Number(baseGapCount) === 0 && logisticsComplete),
      warnings: Object.freeze([...new Set(warnings)]),
    });
  }

  global.LumaCommercialCostCalculator = Object.freeze({VAT_RATES, OVERHEAD_CURRENCY, DEFAULT_OVERHEAD_SETTINGS, normalizeVatRate, normalizeProjectPercentage, buildOverhead, buildResult});
})(window);
