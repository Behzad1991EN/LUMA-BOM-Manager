'use strict';

(function initializeCountryData(global) {
  const EUROPEAN_COUNTRIES = Object.freeze([
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium',
    'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia',
    'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
    'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia',
    'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova',
    'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway',
    'Poland', 'Portugal', 'Romania', 'San Marino', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine',
    'United Kingdom', 'Vatican City',
  ]);
  const LOGISTICS_ORIGINS = Object.freeze(['Italy', 'Egypt', 'Turkey', 'China']);
  const OTHER_EUROPEAN_COUNTRIES = Object.freeze(EUROPEAN_COUNTRIES.filter(country => country !== 'Italy'));
  const SUPPLIER_COUNTRIES = Object.freeze([...new Set([...EUROPEAN_COUNTRIES, 'Egypt', 'China'])].sort((a, b) => a.localeCompare(b)));
  const normalizeKey = value => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases = Object.freeze({
    turkiye: 'Turkey',
    'republic of turkiye': 'Turkey',
    'czech republic': 'Czechia',
    'republic of moldova': 'Moldova',
    macedonia: 'North Macedonia',
    'fyrom': 'North Macedonia',
    uk: 'United Kingdom',
    'u k': 'United Kingdom',
    'great britain': 'United Kingdom',
    holland: 'Netherlands',
    vatican: 'Vatican City',
    'bosnia herzegovina': 'Bosnia and Herzegovina',
  });
  const canonicalByKey = new Map([...SUPPLIER_COUNTRIES, ...LOGISTICS_ORIGINS].map(country => [normalizeKey(country), country]));

  function canonicalCountry(value) {
    const key = normalizeKey(value);
    return aliases[key] || canonicalByKey.get(key) || '';
  }

  function canonicalEuropeanCountry(value) {
    const country = canonicalCountry(value);
    return EUROPEAN_COUNTRIES.includes(country) ? country : '';
  }

  function canonicalLogisticsOrigin(value) {
    const country = canonicalCountry(value);
    return LOGISTICS_ORIGINS.includes(country) ? country : '';
  }

  function resolveProjectDestination(inputs) {
    if (String(inputs?.project_country_type || '') === 'Italy') return 'Italy';
    return canonicalEuropeanCountry(inputs?.destination_country || inputs?.project_country);
  }

  global.LumaCountryData = Object.freeze({
    EUROPEAN_COUNTRIES,
    OTHER_EUROPEAN_COUNTRIES,
    LOGISTICS_ORIGINS,
    SUPPLIER_COUNTRIES,
    canonicalCountry,
    canonicalEuropeanCountry,
    canonicalLogisticsOrigin,
    resolveProjectDestination,
  });
})(window);
