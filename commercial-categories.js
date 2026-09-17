'use strict';

(function initializeCommercialCategories(global) {
  const SECTION_CATEGORIES = Object.freeze({
    posts: 'Posts',
    substructure: 'Substructure',
    bearing: 'Bearing',
    slew_drive: 'Slew Drive',
    pv_module: 'PV Module',
    limit_switch: 'Limit Switch',
    soltrk: 'SOLTRK',
    junction_box: 'Junction Box',
    cable_gland: 'Cable Gland',
    safeguard: 'Safeguard',
    anemometer: 'Anemometer',
    power_supply: 'Power Supply',
    electrical_enclosure: 'Electrical Enclosure',
    fasteners: 'Fasteners',
  });

  const normalizeText = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const CATEGORY_ALIASES = Object.freeze({
    posts: 'posts',
    post: 'posts',
    steelstructurepost: 'posts',
    steelstructureposts: 'posts',
    substructure: 'substructure',
    steelstructuresubstructure: 'substructure',
    steelstructure: 'substructure',
    bearing: 'bearing',
    bearings: 'bearing',
    slewdrive: 'slew_drive',
    pvmodule: 'pv_module',
    limitswitch: 'limit_switch',
    soltrk: 'soltrk',
    junctionbox: 'junction_box',
    cablegland: 'cable_gland',
    safeguard: 'safeguard',
    anemometer: 'anemometer',
    powersupply: 'power_supply',
    electricalenclosure: 'electrical_enclosure',
    fastener: 'fasteners',
    fasteners: 'fasteners',
  });
  // Compatibility while the category-correction migration is pending in an
  // environment. The same values are stored authoritatively by the migration.
  const CATEGORY_OVERRIDES_BY_TAG = Object.freeze({
    k001576: 'substructure',
  });

  function normalizeCategoryKey(value) {
    const normalized = normalizeText(value);
    if (normalized.startsWith('fastener')) return 'fasteners';
    return CATEGORY_ALIASES[normalized] || normalized;
  }

  function recordValue(record, appKey, serviceKey) {
    return record?.[appKey] ?? record?.[serviceKey] ?? '';
  }

  function leafKeyForPart(record) {
    const category = normalizeText(recordValue(record, 'Category', 'category'));
    const postKind = normalizeText(recordValue(record, 'Post Kind', 'postKind'));
    const tag = String(recordValue(record, 'TAG', 'tag')).trim().toLowerCase();
    const partIdentity = normalizeText(`${recordValue(record, 'Part Name', 'part')} ${recordValue(record, 'Part', 'part')}`);
    const identity = normalizeText(`${recordValue(record, 'Part Name', 'part')} ${recordValue(record, 'Part', 'part')} ${recordValue(record, 'Description', 'description')}`);

    if (CATEGORY_OVERRIDES_BY_TAG[tag]) return CATEGORY_OVERRIDES_BY_TAG[tag];
    if (category.startsWith('fastener')) return 'fasteners';
    // Explicit Part Master leaf categories are authoritative. Check them before
    // names/descriptions so a Substructure connection that mentions a pile
    // cannot leak into the Posts Analysis section.
    if (category === 'post' || category === 'posts' || category === 'steelstructurepost' || category === 'steelstructureposts') return 'posts';
    if (category === 'substructure' || category === 'steelstructuresubstructure') return 'substructure';
    // Compatibility for legacy records still stored as plain Steel Structure:
    // only the actual configured Drive Pile and Bearing Pile records are Posts.
    if (category === 'steelstructure') {
      if (['mainpost','bearingpost','drivepile','bearingpile'].includes(postKind) || ['mainpost','bearingpost','drivepile','bearingpile'].some(name=>partIdentity.includes(name))) return 'posts';
      return 'substructure';
    }
    if (category.startsWith('pvmodule') || identity === 'pvmodule') return 'pv_module';
    if (identity.includes('limitswitch')) return 'limit_switch';
    if (identity.includes('soltrk')) return 'soltrk';
    if (identity.includes('junctionbox') || identity.includes('jbox')) return 'junction_box';
    // Legacy Part Master records stored all of these under Electrical. Resolve
    // them by their stable component identity until every database has applied
    // the category-split migration.
    if (identity.includes('cablegland')) return 'cable_gland';
    if (identity.includes('safeguard')) return 'safeguard';
    if (identity.includes('anemometer')) return 'anemometer';
    if (identity.includes('powersupply') || identity.includes('higecogwc')) return 'power_supply';
    if (identity.includes('electricalenclosure') || identity.includes('scadaenclosure')) return 'electrical_enclosure';
    if (category.includes('bearing') || identity.startsWith('bearing')) return 'bearing';
    if (category.includes('slewdrive') || identity.includes('slewdrive')) return 'slew_drive';
    return normalizeCategoryKey(category);
  }

  function partMatchesCategory(record, category) {
    const requested = normalizeCategoryKey(category);
    if (!requested) return false;
    return leafKeyForPart(record) === requested;
  }

  function categoryLabel(value) {
    const key = normalizeCategoryKey(value);
    return SECTION_CATEGORIES[key] || String(value ?? '').trim();
  }

  global.LumaCommercialCategories = Object.freeze({
    SECTION_CATEGORIES,
    normalizeCategoryKey,
    categoryLabel,
    leafKeyForPart,
    partMatchesCategory,
  });
})(window);
