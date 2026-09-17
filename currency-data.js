'use strict';

(function initializeCurrencyData(global) {
  const OPTIONS = Object.freeze([
    Object.freeze({code:'EUR', name:'Euro', symbol:'€'}),
    Object.freeze({code:'USD', name:'US Dollar', symbol:'$'}),
    Object.freeze({code:'TRY', name:'Turkish Lira', symbol:'₺'}),
    Object.freeze({code:'CNY', name:'Chinese Yuan', symbol:'¥'}),
    Object.freeze({code:'EGP', name:'Egyptian Pound', symbol:'E£'}),
    Object.freeze({code:'CHF', name:'Swiss Franc', symbol:'CHF'}),
  ]);
  const CODES = Object.freeze(OPTIONS.map(currency => currency.code));
  const byCode = new Map(OPTIONS.map(currency => [currency.code, currency]));
  const legacySymbols = Object.freeze({GBP:'£', IRR:'﷼'});

  function normalizeCode(value, fallback = '') {
    const code = String(value || '').trim().toUpperCase();
    return byCode.has(code) ? code : fallback;
  }

  function symbol(code) {
    const normalized = String(code || '').trim().toUpperCase();
    return byCode.get(normalized)?.symbol || legacySymbols[normalized] || normalized;
  }

  function display(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return '';
    const mark = symbol(normalized);
    return mark === normalized ? normalized : `${mark} ${normalized}`;
  }

  function optionLabel(code) {
    const normalized = String(code || '').trim().toUpperCase();
    const currency = byCode.get(normalized);
    return currency ? `${currency.symbol} — ${currency.name} (${currency.code})` : display(normalized);
  }

  global.LumaCurrencyData = Object.freeze({OPTIONS, CODES, normalizeCode, symbol, display, optionLabel});
})(window);
