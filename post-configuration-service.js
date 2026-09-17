'use strict';

(function initializePostConfiguration(global) {
  const text = value => String(value ?? '').trim();
  const normalized = value => text(value).toLowerCase().replace(/\s+/g, ' ');
  const pileKind = value => {
    const kind = normalized(value);
    return kind === 'main post' ? 'drive pile' : kind === 'bearing post' ? 'bearing pile' : kind;
  };

  function activePostParts(parts, postKind='') {
    return (parts || []).filter(part => part?.Active !== false
      && text(part?.TAG)
      && text(part?.['Post Kind'])
      && (!postKind || pileKind(part['Post Kind']) === pileKind(postKind)));
  }

  function profileOptions(parts, postKind) {
    return [...new Set(activePostParts(parts, postKind).map(part => text(part['Profile Type'])).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, {numeric:true}));
  }

  function depthOptions(parts, postKind) {
    return [...new Set(activePostParts(parts, postKind).map(part => Number(part['Foundation Depth mm'])).filter(depth => Number.isFinite(depth) && depth > 0))]
      .sort((a, b) => a - b).map(String);
  }

  function resolveResult(parts, {postKind, foundationMethod, foundationDepthMm, profileType}) {
    const matches = activePostParts(parts, postKind).filter(part =>
      normalized(part['Foundation Method']) === normalized(foundationMethod)
      && Number(part['Foundation Depth mm']) === Number(foundationDepthMm)
      && normalized(part['Profile Type']) === normalized(profileType));
    if (!matches.length) return {status:'missing', part:null, matches:[]};
    if (matches.length > 1) return {status:'ambiguous', part:null, matches};
    return {status:'found', part:matches[0], matches};
  }

  function resolve(parts, criteria) { return resolveResult(parts, criteria).part; }

  function selection(project, postKind) {
    const inputs = project?.inputs || {};
    const drivePile = pileKind(postKind) === 'drive pile';
    return {
      postKind,
      foundationMethod:inputs.foundation_method,
      foundationDepthMm:(drivePile ? inputs.drive_pile_depth_mm : inputs.bearing_pile_depth_mm) ?? inputs.foundation_depth_mm,
      profileType:drivePile ? inputs.main_post_profile : inputs.bearing_post_profile,
    };
  }

  function missingMessage(value, postKind) {
    const item = value?.postKind ? value : selection(value, postKind);
    return `No ${item.postKind || postKind || 'pile'} is configured for ${item.foundationMethod || 'the selected foundation method'}, ${item.foundationDepthMm || 'the selected depth'} mm, and ${item.profileType || 'the selected profile'}.`;
  }

  function ambiguityMessage() {
    return 'More than one active Part Master record matches this post configuration.';
  }

  function validate(project, parts) {
    const matches = {}, errors = [];
    for (const postKind of ['Drive Pile', 'Bearing Pile']) {
      const key = postKind === 'Drive Pile' ? 'main' : 'bearing';
      const item = selection(project, postKind);
      const result = resolveResult(parts, item);
      matches[key] = result.part;
      if (result.status === 'missing') errors.push(missingMessage(item));
      if (result.status === 'ambiguous') errors.push(ambiguityMessage());
    }
    return {valid:errors.length === 0, errors, matches};
  }

  global.LumaPostConfiguration = Object.freeze({
    profileOptions, depthOptions, resolveResult, resolve, selection,
    missingMessage, ambiguityMessage, validate,
  });
})(globalThis);
