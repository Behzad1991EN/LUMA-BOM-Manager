'use strict';

(function(global){
  const PART_COLUMNS = ['Part','TAG','Description','Part Number','Category','Unit','Material','Weight'];
  const ANEMOMETER_ELEVATION_THRESHOLD_M = 400;
  const ANEMOMETER_OPTIONS = Object.freeze({
    cold:Object.freeze({
      key:'cold',
      part:'Anemometer for Cold Weather (above 400)',
      tag:'k001536',
      description:'anemometer nuovaceva 0103011303',
      price:184.00,
      currency:'EUR',
    }),
    normal:Object.freeze({
      key:'normal',
      part:'Anemometer for Normal Weather',
      tag:'k001596',
      description:'anemometer nuovaceva 0103010805',
      price:58.40,
      currency:'EUR',
    }),
  });
  const PLANT_ELECTRICAL_ITEMS = Object.freeze([
    Object.freeze({key:'k001405',tag:'k001405',label:'Safeguard M',perTrackers:48}),
    Object.freeze({key:'k001406',tag:'k001406',label:'Safeguard S',perTrackers:48}),
    Object.freeze({key:'k001542',tag:'k001542',label:'SCADA Enclosure GW40028',perTrackers:48}),
    Object.freeze({key:'anemometer',tag:null,label:'Anemometer',perTrackers:48}),
    Object.freeze({key:'k001552',tag:'k001552',label:'SCADA Power Supply HDR-30-24',perTrackers:100}),
    Object.freeze({key:'k001525',tag:'k001525',label:'Higeco GWC V4 4DIN',perTrackers:100}),
  ]);
  const MODULE_RAIL_COMPATIBLE_LONGITUDINAL_DISTANCES_MM = Object.freeze([400,790]);
  const HAT_RAIL_OVERLAP_MIN_CLEARANCE_MM = 50;
  const HAT_RAIL_BEARING_PILE_MIN_CLEARANCE_MM = 100;

  function normalizeText(value){
    return String(value ?? '').trim().toLowerCase().replaceAll('×','x').replace(/[^a-z0-9]+/g,'');
  }
  function displayTerminology(value){
    if(typeof value!=='string')return value;
    return value.replace(/\bMain\s+Posts\b/gi,'Drive Piles')
      .replace(/\bMain\s+Post\b/gi,'Drive Pile')
      .replace(/\bBearing\s+Posts\b/gi,'Bearing Piles')
      .replace(/\bBearing\s+Post\b/gi,'Bearing Pile')
      .replace(/\bMain\s+(?:Beam|Tube)/gi,'Torque Tube');
  }
  function asNumber(value, def=0){
    if(value === null || value === undefined || value === '') return def;
    const n = Number(value);
    return Number.isFinite(n) ? n : def;
  }
  function asInt(value, def=0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : def;
  }
  function niceNumber(value){
    if(value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if(!Number.isFinite(n)) return value;
    return Number.isInteger(n) ? n : Math.round(n * 1000) / 1000;
  }
  function firstNonEmpty(...values){
    for(const value of values){ if(value !== null && value !== undefined && value !== '') return value; }
    return '';
  }
  function ceilHalf(value){ return Math.floor((asInt(value,0) + 1) / 2); }
  function ceilUp(value){ return Math.ceil(asNumber(value,0)); }

  const FASTENER_STANDARDS = [
    ['din931iso4014','Standard Hex Bolt'],
    ['din933iso4017','Standard Hex Bolt (Fully Threaded)'],
    ['din7991iso10642','Countersunk head screws with a hexagonal socket'],
    ['din7985iso7045','Cross recessed raised cheese head screws'],
    ['din913iso4026','Hexagon socket set screws with flat point'],
    ['din912iso4762','Hexagon Socket head cap Screws'],
    ['diniso7049','Pan head self tapping screws'],
    ['din186','T head Bolt'],
    ['din9761','Stud Bolt'],
    ['iso10642','Hexagon Socket countersunk head Screws'],
    ['iso7045','Pan head screws, type H or Z cross recess (Grade A)'],
    ['iso7380','Hexagon Socket Button Head'],
    ['iso21269','Hexagon Socket head cap screw with fine pitch'],
    ['din580','Lifting Eye Bolt'],
    ['iso2009','Slotted Countersunk flat head screws'],
    ['iso2010','Slotted Raised Countersunk head screws'],
    ['din316','Wing Screws, Rounded Wings'],
    ['din7504iso15480','Drilling screw'],
    ['din6921iso4162','Hexagon Flange Bolt'],
    ['iso14579','Hexalobular Cylindrical Head bolt'],
    ['iso4027','Hexagon socket set screws with cone point'],
    ['iso4029','Hexagon socket set screws with cup point'],
    ['din93x','Special Thread Length'],
    ['din603','Mushroom head square neck bolts'],
    ['din985iso10511','Thin Lock Nut'],
    ['din982iso7040','Lock Nut'],
    ['din934iso4032','Hex Nut'],
    ['din6923iso4161','Hex Nut with flange'],
    ['din936iso4035','Thin Nut'],
    ['din7967','Self-locking Counter Nut'],
    ['din986','Prevailing torque hex domed nut'],
    ['din125iso7089','Plain washers, Normal'],
    ['din9021iso7093','Plain washers, Large'],
    ['din127b','Spring Washers'],
    ['din7349iso7838','Thick Flat Washer'],
    ['din440v','Flat Washers with Square Holes'],
    ['din522iso4759','Heavy Duty Flat Washer'],
    ['din6796iso10683','Disc Spring Washers'],
    ['din522','Heavy Duty Flat Washer'],
    ['din127','Spring Washers'],
    ['din7349','Thick Flat Washer'],
    ['din6796','Disc Spring Washers'],
  ];
  function fastenerPartNameFromDescription(description){
    const norm = normalizeText(description);
    for(const [standard,name] of FASTENER_STANDARDS){ if(norm.includes(standard)) return name; }
    return null;
  }
  const DEFAULT_INPUTS = Object.freeze({
    pv_power:'700',
    foundation_type:'Ramming',
    foundation_method:'Ramming',
    drive_pile_depth_mm:'2000',
    bearing_pile_depth_mm:'2000',
    main_post_profile:'HEA 140',
    bearing_post_profile:'C',
    project_country_type:'Italy',
    project_country:'Italy',
    destination_country:'Italy',
    delivery_point:'Site',
    elevation_asl:'0',
    final_layout_document_number:'',
    pv_module_datasheet_document_number:'',
    cad_blocks_available:'Yes',
    max_span_length:'7900',
    pv_module_width:'1134',
    pv_module_length:'2384',
    pv_module_hole_distance:'1093',
    pv_module_longitudinal_hole_distance_1:'',
    pv_module_longitudinal_hole_distance_2:'',
    pv_module_longitudinal_hole_distance_3:'',
    hat_rail_hole_distance:'60',
    pv_gap_locked:true,
    pv_module_gap:'19',
    z_rail_offset:'7.5',
    motor_gap:'400',
    target_end_gap:'50',
    overlap_ab:'270',
    overlap_bc:'270',
    main_beam_a_length:'9800',
    main_beam_connection_length:'500',
    main_beam_b_length:'11500',
    main_beam_c_short_length:'8700',
    main_beam_c_long_length:'11800',
    mid_plane_to_beam_a:'80',
    bearing_distance_mode:'Symmetrical',
    symmetrical_distance:'8320',
    semi_pair_count:3,
    asym_post_count:3,
    semi_pair_gaps:{'1':'8320','2':'7350','3':'6500','4':'','5':''},
    asym_north_gaps:{'1':'8320','2':'7350','3':'6500','4':'','5':''},
    asym_south_gaps:{'1':'8320','2':'7350','3':'6500','4':'','5':''},
  });

  function defaultTrackerQuantities(){
    return Object.fromEntries(Array.from({length:43},(_,i)=>[String(i+14),0]));
  }
  function defaultManualParts(){
    return {
      manual_1:{selected:false,include:false,Item:'Safeguard',qty:'0',TAG:'',Description:'Safeguard','Part Number':'',Category:'Electrical / Standard',Unit:'pcs',_default:true},
      manual_2:{selected:false,include:false,Item:'Datalogger',qty:'0',TAG:'',Description:'Datalogger','Part Number':'',Category:'Electrical / Standard',Unit:'pcs',_default:true},
    };
  }
  function defaultBearingRule(inputs=DEFAULT_INPUTS){
    const semiCount = asInt(inputs.semi_pair_count,3);
    const asymCount = asInt(inputs.asym_post_count,3);
    return {
      locked:false,
      mode:String(inputs.bearing_distance_mode || 'Symmetrical'),
      symmetrical_distance:asNumber(inputs.symmetrical_distance,8320),
      semi_pair_count:semiCount,
      asym_post_count:asymCount,
      semi_pair_gaps:Array.from({length:semiCount},(_,i)=>asNumber(inputs.semi_pair_gaps?.[String(i+1)],0)),
      asym_north_gaps:Array.from({length:asymCount},(_,i)=>asNumber(inputs.asym_north_gaps?.[String(i+1)],0)),
      asym_south_gaps:Array.from({length:asymCount},(_,i)=>asNumber(inputs.asym_south_gaps?.[String(i+1)],0)),
    };
  }
  function normalizeBearingRule(rule){
    const r = rule || {};
    return {
      locked:!!r.locked,
      mode:normalizeBearingMode(r.mode),
      quantity:Math.max(0,asInt(r.quantity,0)),
      symmetrical_distance:asNumber(r.symmetrical_distance,0),
      semi_pair_count:asInt(r.semi_pair_count,(r.semi_pair_gaps||[]).length),
      asym_post_count:asInt(r.asym_post_count,(r.asym_north_gaps||[]).length),
      semi_pair_gaps:Array.from(r.semi_pair_gaps || [],v=>asNumber(v,0)),
      asym_north_gaps:Array.from(r.asym_north_gaps || [],v=>asNumber(v,0)),
      asym_south_gaps:Array.from(r.asym_south_gaps || [],v=>asNumber(v,0)),
    };
  }
  const BEARING_RULE_MODES=Object.freeze(['Symmetrical','Semi-symmetrical','Asymmetrical']);
  function normalizeBearingMode(value){
    const normalized=normalizeText(value);
    if(normalized==='semisymmetrical')return 'Semi-symmetrical';
    if(normalized==='asymmetrical')return 'Asymmetrical';
    return 'Symmetrical';
  }
  function bearingRuleVariantKey(mode){return normalizeText(normalizeBearingMode(mode));}
  function normalizeBearingRuleVariants(value,fallbackQuantity=0){
    if(!value||typeof value!=='object')return [];
    const isLegacyRule=Object.prototype.hasOwnProperty.call(value,'mode')||Object.prototype.hasOwnProperty.call(value,'symmetrical_distance')||Object.prototype.hasOwnProperty.call(value,'semi_pair_gaps')||Object.prototype.hasOwnProperty.call(value,'asym_north_gaps');
    const sources=Array.isArray(value)?value:(isLegacyRule?[value]:Object.values(value));
    const variants=new Map();
    sources.filter(source=>source&&typeof source==='object').forEach(source=>{
      const normalized=normalizeBearingRule(source),key=bearingRuleVariantKey(normalized.mode);
      if(!Object.prototype.hasOwnProperty.call(source,'quantity')&&sources.length===1)normalized.quantity=Math.max(0,asInt(fallbackQuantity,0));
      variants.set(key,{...normalized,key});
    });
    return BEARING_RULE_MODES.map(mode=>variants.get(bearingRuleVariantKey(mode))).filter(Boolean);
  }
  function getDesignInputs(project){
    const i = project.inputs || {};
    return {
      pv_power:asNumber(i.pv_power,700),
      pv_module_width:asNumber(i.pv_module_width,1134),
      pv_module_length:asNumber(i.pv_module_length,2384),
      pv_module_hole_distance:asNumber(i.pv_module_hole_distance,1093),
      hat_rail_hole_distance:asNumber(i.hat_rail_hole_distance,60),
      pv_module_gap:asNumber(i.pv_module_gap,19),
      z_rail_offset:asNumber(i.z_rail_offset,7.5),
      motor_gap:asNumber(i.motor_gap,400),
      target_end_gap:asNumber(i.target_end_gap,50),
      overlap_ab:asNumber(i.overlap_ab,270),
      overlap_bc:asNumber(i.overlap_bc,270),
      main_beam_a_length:asNumber(i.main_beam_a_length,9800),
      main_beam_connection_length:asNumber(i.main_beam_connection_length,500),
      main_beam_b_length:asNumber(i.main_beam_b_length,11500),
      main_beam_c_short_length:asNumber(i.main_beam_c_short_length,8700),
      main_beam_c_long_length:asNumber(i.main_beam_c_long_length,11800),
      mid_plane_to_beam_a:asNumber(i.mid_plane_to_beam_a,80),
    };
  }
  function calculateAutoPvModuleGap(project){
    const i = project.inputs || {};
    return asNumber(i.pv_module_hole_distance,1093) + asNumber(i.hat_rail_hole_distance,60) - asNumber(i.pv_module_width,1134);
  }
  function moduleRailCompatibility(project){
    const inputs=project?.inputs||project||{};
    const distances=[1,2,3]
      .map(index=>inputs[`pv_module_longitudinal_hole_distance_${index}`])
      .filter(value=>value!==null&&value!==undefined&&String(value).trim()!=='')
      .map(value=>Number(value))
      .filter(Number.isFinite);
    const compatibleDistances=MODULE_RAIL_COMPATIBLE_LONGITUDINAL_DISTANCES_MM
      .filter(distance=>distances.includes(distance));
    return {
      compatible:compatibleDistances.length>0,
      compatibleDistance:compatibleDistances[0]??null,
      compatibleDistances,
      distances,
      allowedDistances:[...MODULE_RAIL_COMPATIBLE_LONGITUDINAL_DISTANCES_MM],
    };
  }
  function getAnemometerSelection(project){
    const elevation=asNumber(project?.inputs?.elevation_asl,0);
    return elevation>=ANEMOMETER_ELEVATION_THRESHOLD_M?ANEMOMETER_OPTIONS.cold:ANEMOMETER_OPTIONS.normal;
  }
  function cadBlocksAreAvailable(project){ return String(project.inputs?.cad_blocks_available ?? 'Yes').trim().toLowerCase() === 'yes'; }
  function getBomModeText(project){ return cadBlocksAreAvailable(project) ? 'CAD Block' : 'Estimation'; }
  function getSpanLimits(project){
    const maxSpan = asNumber(project.inputs?.max_span_length,7900);
    return Object.fromEntries([2,4,6,8].map(span=>[span,span*maxSpan + 2*maxSpan*0.35]));
  }
  function estimateSpanCountForLength(project,trackerLength){
    const limits = getSpanLimits(project);
    for(const span of [2,4,6,8]){ if(trackerLength <= limits[span]) return span; }
    return 8;
  }

  function calculateTrackerGeometry(project,pvCount){
    const d = getDesignInputs(project);
    const northModules = Math.ceil(pvCount/2);
    const southModules = Math.floor(pvCount/2);
    const isOddTracker = pvCount % 2 === 1;
    const northGaps = Math.max(northModules-1,0);
    const southGaps = Math.max(southModules-1,0);
    const trackerType = pvCount > 40 ? 'Long' : 'Short';
    const firstPieceLength = trackerType === 'Long' ? d.main_beam_a_length : d.main_beam_connection_length;
    const firstPieceName = trackerType === 'Long' ? 'Torque Tube A' : 'Slew Drive Connection';
    const zoneAEnd = d.mid_plane_to_beam_a + firstPieceLength;
    const zoneBEnd = zoneAEnd - d.overlap_ab + d.main_beam_b_length;
    const baseUntilC = zoneBEnd - d.overlap_bc;

    function sideGeometry(modulesOnSide){
      const gapsOnSide = Math.max(modulesOnSide-1,0);
      const requiredSide = d.motor_gap/2 + modulesOnSide*d.pv_module_width + gapsOnSide*d.pv_module_gap + d.target_end_gap;
      // Current rule: C is not required when the required envelope ends within Tube B.
      const mainCRequired = requiredSide <= zoneBEnd ? 0 : requiredSide - baseUntilC;
      let stock, stockLength;
      if(mainCRequired <= 0){ stock='Not required'; stockLength=0; }
      else if(mainCRequired <= d.main_beam_c_short_length){ stock='Cut from 8700'; stockLength=d.main_beam_c_short_length; }
      else { stock='Cut from 11800'; stockLength=d.main_beam_c_long_length; }
      const mainCStart = baseUntilC;
      const mainCActualEnd = mainCRequired > 0 ? baseUntilC + mainCRequired : baseUntilC;
      const sideEnd = Math.max(zoneBEnd,mainCActualEnd);
      const lastPvEndWithoutEndGap = d.motor_gap/2 + modulesOnSide*d.pv_module_width + gapsOnSide*d.pv_module_gap;
      const calculatedEndGap = sideEnd - lastPvEndWithoutEndGap;
      return {modules:modulesOnSide,gaps:gapsOnSide,required:requiredSide,main_c_required:mainCRequired,stock,stock_length:stockLength,main_c_start:mainCStart,main_c_actual_end:mainCActualEnd,end:sideEnd,end_gap:calculatedEndGap};
    }
    const north = sideGeometry(northModules);
    const south = sideGeometry(southModules);
    const trackerLength = cadBlocksAreAvailable(project) ? north.end + south.end : north.required + south.required;
    return {
      'Tracker Type':trackerType,
      'Tracker Symmetry':isOddTracker?'Asymmetrical':'Symmetrical',
      'First Piece Name':firstPieceName,
      'First Piece Length':firstPieceLength,
      'Modules / Side':isOddTracker?`N:${northModules} / S:${southModules}`:northModules,
      'Modules / North Side':northModules,
      'Modules / South Side':southModules,
      'PV Gaps / Side':isOddTracker?`N:${northGaps} / S:${southGaps}`:northGaps,
      'PV Gaps / North Side':northGaps,
      'PV Gaps / South Side':southGaps,
      'Required Right Side':north.required,
      'Required North Side':north.required,
      'Required South Side':south.required,
      'Zone A End (120)':zoneAEnd,
      'Zone B End (110)':zoneBEnd,
      'Overlap A/B (mm)':d.overlap_ab,
      'Overlap B/C (mm)':d.overlap_bc,
      'A/B Overlap Start from Midplane':Math.max(0,zoneAEnd-d.overlap_ab),
      'A/B Overlap End from Midplane':zoneAEnd,
      'B/C Overlap Start from Midplane':Math.max(0,zoneBEnd-d.overlap_bc),
      'B/C Overlap End from Midplane':zoneBEnd,
      'Base Until C':baseUntilC,
      'Main Tube C Start from Midplane':baseUntilC,
      'Main Tube C Required Length':isOddTracker?`N:${niceNumber(north.main_c_required)} / S:${niceNumber(south.main_c_required)}`:north.main_c_required,
      'Main Tube C Required Length North':north.main_c_required,
      'Main Tube C Required Length South':south.main_c_required,
      'Main Tube C Stock Suggestion':isOddTracker?`N:${north.stock} / S:${south.stock}`:north.stock,
      'Main Tube C Stock Suggestion North':north.stock,
      'Main Tube C Stock Suggestion South':south.stock,
      'Main Tube C Stock Length North':north.stock_length,
      'Main Tube C Stock Length South':south.stock_length,
      'Main Tube C Actual End North from Midplane':north.main_c_actual_end,
      'Main Tube C Actual End South from Midplane':south.main_c_actual_end,
      // These remain tracker-side physical ends, matching the current bearing classification.
      'Main Tube C End from Midplane':Math.max(north.end,south.end),
      'Main Tube C End North from Midplane':north.end,
      'Main Tube C End South from Midplane':south.end,
      'Tracker Length (mm)':trackerLength,
      'Calculated End Gap':isOddTracker?`N:${niceNumber(north.end_gap)} / S:${niceNumber(south.end_gap)}`:north.end_gap,
      'Calculated End Gap North':north.end_gap,
      'Calculated End Gap South':south.end_gap,
    };
  }

  function getBearingRuleVariantsForPv(project,pvCount){
    const custom=project.bearing_rules?.[String(pvCount)]??project.bearing_rules?.[pvCount];
    return normalizeBearingRuleVariants(custom,project.tracker_quantities?.[String(pvCount)]??0);
  }
  function getBearingRuleForPv(project,pvCount,variantKey=''){
    const variants=getBearingRuleVariantsForPv(project,pvCount),requested=bearingRuleVariantKey(variantKey);
    return variants.find(rule=>rule.key===requested)||variants[0]||defaultBearingRule(project.inputs||DEFAULT_INPUTS);
  }
  function getPositionsFromRule(rule,defaultBearingPostsPerTracker,geometry){
    rule = normalizeBearingRule(rule);
    const rows=[];
    if(rule.mode === 'Symmetrical'){
      const gap=asNumber(rule.symmetrical_distance,0);
      let pairsPerSide;
      if(geometry && gap>0){
        const trackerHalfLength=asNumber(geometry['Tracker Length (mm)'],0)/2;
        pairsPerSide=trackerHalfLength>0?Math.trunc(trackerHalfLength/gap):Math.max(Math.trunc(defaultBearingPostsPerTracker/2),1);
      } else pairsPerSide=Math.max(Math.trunc(defaultBearingPostsPerTracker/2),1);
      pairsPerSide=Math.max(1,Math.min(pairsPerSide,5));
      for(let pair=1;pair<=pairsPerSide;pair++){
        const distance=pair*gap;
        rows.push({'Pair No.':pair,'Side':'North','Gap from Previous (mm)':gap,'Distance from Main Post (mm)':distance});
        rows.push({'Pair No.':pair,'Side':'South','Gap from Previous (mm)':gap,'Distance from Main Post (mm)':-distance});
      }
    } else if(rule.mode === 'Semi-symmetrical'){
      let cumulative=0;
      (rule.semi_pair_gaps||[]).forEach((rawGap,index)=>{
        const gap=asNumber(rawGap,0);
        cumulative+=gap;
        const pair=index+1;
        rows.push({'Pair No.':pair,'Side':'North','Gap from Previous (mm)':gap,'Distance from Main Post (mm)':cumulative});
        rows.push({'Pair No.':pair,'Side':'South','Gap from Previous (mm)':gap,'Distance from Main Post (mm)':-cumulative});
      });
    } else {
      const northGaps=rule.asym_north_gaps||[], southGaps=rule.asym_south_gaps||[];
      const count=Math.max(northGaps.length,southGaps.length);
      let northCumulative=0,southCumulative=0;
      for(let index=0;index<count;index++){
        const northGap=asNumber(northGaps[index],0), southGap=asNumber(southGaps[index],0);
        northCumulative+=northGap; southCumulative+=southGap;
        const pair=index+1;
        // Current logic emits both sides even when a gap is 0.
        rows.push({'Pair No.':pair,'Side':'North','Gap from Previous (mm)':northGap,'Distance from Main Post (mm)':northCumulative});
        rows.push({'Pair No.':pair,'Side':'South','Gap from Previous (mm)':southGap,'Distance from Main Post (mm)':-southCumulative});
      }
    }
    return rows;
  }
  function classifyBearing(geometry,positionMm){
    const distance=Math.abs(positionMm);
    const zoneAEnd=asNumber(geometry['Zone A End (120)'],0);
    const zoneBEnd=asNumber(geometry['Zone B End (110)'],0);
    const zoneCEnd=positionMm<0?asNumber(geometry['Main Tube C End South from Midplane'] ?? geometry['Main Tube C End from Midplane'],0):asNumber(geometry['Main Tube C End North from Midplane'] ?? geometry['Main Tube C End from Midplane'],0);
    if(distance<=zoneAEnd) return ['Torque Tube A / Connection','Bearing 120','OK'];
    if(distance<=zoneBEnd) return ['Torque Tube B 110','Bearing 110','OK'];
    if(distance<=zoneCEnd) return ['Torque Tube C 100','Bearing 100','OK'];
    return ['Outside Tracker','Check input','Warning'];
  }
  function classifyBeamZoneForPosition(geometry,positionMm){
    const distance=Math.abs(positionMm);
    const zoneAEnd=asNumber(geometry['Zone A End (120)'],0);
    const zoneBEnd=asNumber(geometry['Zone B End (110)'],0);
    const zoneCEnd=positionMm<0?asNumber(geometry['Main Tube C End South from Midplane'] ?? geometry['Main Tube C End from Midplane'],0):asNumber(geometry['Main Tube C End North from Midplane'] ?? geometry['Main Tube C End from Midplane'],0);
    if(distance<=zoneAEnd) return ['A / 120',0];
    if(distance<=zoneBEnd) return ['B / 110',1];
    if(distance<=zoneCEnd) return ['C / 100',2];
    return ['Outside',0];
  }
  function calculateEstimatedBearingPositions(project,geometry){
    const trackerLength=asNumber(geometry['Tracker Length (mm)'],0);
    const maxSpan=asNumber(project.inputs?.max_span_length,7900);
    const spanCount=estimateSpanCountForLength(project,trackerLength);
    const pairsPerSide=Math.max(Math.trunc(spanCount/2),1);
    const spanType=`${spanCount}-Span`;
    const rows=[];
    for(let pair=1;pair<=pairsPerSide;pair++){
      const distance=pair*maxSpan;
      rows.push({'Pair No.':pair,'Side':'North','Gap from Previous (mm)':maxSpan,'Distance from Main Post (mm)':distance,'Span Type':spanType});
      rows.push({'Pair No.':pair,'Side':'South','Gap from Previous (mm)':maxSpan,'Distance from Main Post (mm)':-distance,'Span Type':spanType});
    }
    return {rows,spanCount,spanType};
  }
  function calculateBearingLayoutForTracker(project,scheduleRow,geometry,ruleOverride=null,ruleSourceOverride=''){
    const pvCount=asInt(scheduleRow['PV Modules per Tracker'],0);
    const defaultPosts=asInt(firstNonEmpty(scheduleRow['Bearing Posts / Tracker'],scheduleRow['Bearing Posts'],2),2);
    let positions,bearingRuleSource,bearingRuleMode,spanType,spanCount;
    if(cadBlocksAreAvailable(project)){
      const rule=ruleOverride?normalizeBearingRule(ruleOverride):getBearingRuleForPv(project,pvCount,scheduleRow?._bearing_rule_key);
      positions=getPositionsFromRule(rule,defaultPosts,geometry);
      bearingRuleSource=ruleSourceOverride||(getBearingRuleVariantsForPv(project,pvCount).length?'Custom':'Default');
      bearingRuleMode=rule.mode;
      spanType='CAD Block'; spanCount=positions.length;
    } else {
      const estimated=calculateEstimatedBearingPositions(project,geometry);
      positions=estimated.rows; spanCount=estimated.spanCount; spanType=estimated.spanType; bearingRuleSource='Estimation'; bearingRuleMode='Symmetrical';
    }
    let bearing120=0,bearing110=0,bearing100=0,outside=0;
    const outputRows=positions.map(item=>{
      const [zone,bearingType,status]=classifyBearing(geometry,item['Distance from Main Post (mm)']);
      if(bearingType==='Bearing 120') bearing120++; else if(bearingType==='Bearing 110') bearing110++; else if(bearingType==='Bearing 100') bearing100++; else outside++;
      return {...item,'Absolute Distance (mm)':Math.abs(item['Distance from Main Post (mm)']),'Beam Zone':zone,'Bearing Type':bearingType,'Status':status,'Bearing Rule Source':bearingRuleSource,'Bearing Rule Mode':bearingRuleMode,'Span Type':spanType};
    });
    return {'Bearing Posts / Tracker':outputRows.length,'Bearing 120 / Tracker':bearing120,'Bearing 110 / Tracker':bearing110,'Bearing 100 / Tracker':bearing100,'Bearing Outside / Tracker':outside,'Bearing Status':outside===0?'OK':'Warning','Bearing Rule Source':bearingRuleSource,'Bearing Rule Mode':bearingRuleMode,'Span Type':spanType,'Estimated Span Count':spanCount,'Rows':outputRows};
  }

  function generateModuleRailPositionsForSide(project,pvCount,geometry,side){
    const d=getDesignInputs(project);
    const sideName=String(side).toLowerCase().startsWith('n')?'North':'South';
    const sign=sideName==='North'?1:-1;
    const modulesPerSide=asInt(geometry[`Modules / ${sideName} Side`],sideName==='North'?Math.ceil(pvCount/2):Math.floor(pvCount/2));
    const railCount=modulesPerSide+1;
    let position=d.motor_gap/2 + (d.pv_module_width-d.pv_module_hole_distance)/2 + d.z_rail_offset;
    const rails=[];
    for(let index=0;index<railCount;index++){
      const railType=(index===0||index===railCount-1)?'Z Rail':'Hat Rail';
      const signedPosition=sign*position;
      const [beamZone,beamLevel]=classifyBeamZoneForPosition(geometry,signedPosition);
      rails.push({'Rail No.':index+1,'Side':sideName,'Rail Type':railType,'Signed Distance from Mid Plane (mm)':signedPosition,'Distance from Mid Plane (mm)':position,'Beam Zone':beamZone,'Beam Level':beamLevel,'Base Plates':1,'Bearing Required Plates':1,'Beam Compensation':0,'Final Plates / Rail / Side':1,'Reason':'Base support plate','Influence Bearing':'','Influence Bearing Distance':''});
      if(index===0) position += d.pv_module_hole_distance + d.hat_rail_hole_distance/2 - d.z_rail_offset;
      else position += d.pv_module_hole_distance + d.hat_rail_hole_distance;
    }
    return rails;
  }
  function clearanceFromInterval(position,start,end){
    const low=Math.min(start,end),high=Math.max(start,end);
    if(position<low)return low-position;
    if(position>high)return position-high;
    return 0;
  }
  function torqueTubeOverlapZonesForSide(project,geometry,side){
    const d=getDesignInputs(project),sideName=String(side).toLowerCase().startsWith('n')?'North':'South';
    const zoneAEnd=asNumber(geometry['Zone A End (120)'],0),zoneBEnd=asNumber(geometry['Zone B End (110)'],0);
    const firstPiece=String(geometry['First Piece Name']||'Torque Tube A');
    const zones=[];
    if(d.overlap_ab>0&&zoneAEnd>0)zones.push({
      key:'A/B',
      label:`${firstPiece} / Torque Tube B overlap`,
      start:Math.max(0,zoneAEnd-d.overlap_ab),
      end:zoneAEnd,
    });
    const cRequired=asNumber(geometry[`Main Tube C Required Length ${sideName}`],0);
    if(d.overlap_bc>0&&zoneBEnd>0&&cRequired>0)zones.push({
      key:'B/C',
      label:'Torque Tube B / Torque Tube C overlap',
      start:Math.max(0,zoneBEnd-d.overlap_bc),
      end:zoneBEnd,
    });
    return zones;
  }
  function hatRailTubeLabel(geometry,rail){
    const zone=String(rail?.['Beam Zone']||'');
    if(zone.startsWith('A'))return String(geometry['First Piece Name']||'Torque Tube A');
    if(zone.startsWith('B'))return 'Torque Tube B';
    if(zone.startsWith('C'))return 'Torque Tube C';
    return 'Outside Tracker';
  }
  function calculateHatRailInstallationClearances(project,geometry,bearingRows=[],railRows=[]){
    const rows=(railRows||[]).map(row=>({...row})),warnings=[],violations=[];
    for(const sideName of ['North','South']){
      const sideRails=rows.filter(row=>row.Side===sideName&&row['Rail Type']==='Hat Rail');
      const overlaps=torqueTubeOverlapZonesForSide(project,geometry,sideName);
      const bearings=(bearingRows||[]).filter(row=>{
        if(row.Side)return row.Side===sideName;
        const position=asNumber(row['Distance from Main Post (mm)'],0);
        return sideName==='North'?position>=0:position<=0;
      }).map((row,index)=>({
        row,
        position:Math.abs(asNumber(row['Distance from Main Post (mm)'],0)),
        label:`${sideName} Bearing Pile ${asInt(row['Pair No.'],index+1)}`,
      }));
      sideRails.forEach((rail,index)=>{
        const position=Math.abs(asNumber(rail['Signed Distance from Mid Plane (mm)']??rail['Distance from Mid Plane (mm)'],0));
        const railNumber=index+1,prefix=sideName==='North'?'N':'S';
        const railLabel=`${sideName} Hat Rail ${railNumber} (between PV Modules ${prefix}${railNumber} and ${prefix}${railNumber+1})`;
        const overlap=overlaps.map(zone=>({...zone,clearance:clearanceFromInterval(position,zone.start,zone.end)})).sort((a,b)=>a.clearance-b.clearance)[0]||null;
        const containingOverlap=overlaps.find(zone=>position>=Math.min(zone.start,zone.end)&&position<=Math.max(zone.start,zone.end));
        const bearing=bearings.map(item=>({...item,clearance:Math.abs(position-item.position)})).sort((a,b)=>a.clearance-b.clearance)[0]||null;
        const issues=[];
        if(overlap&&overlap.clearance<HAT_RAIL_OVERLAP_MIN_CLEARANCE_MM){
          const message=`${railLabel}: ${niceNumber(overlap.clearance)} mm from ${overlap.label}; minimum ${HAT_RAIL_OVERLAP_MIN_CLEARANCE_MM} mm.`;
          issues.push(message);violations.push({type:'overlap',side:sideName,railNumber,position,clearance:overlap.clearance,minimum:HAT_RAIL_OVERLAP_MIN_CLEARANCE_MM,message});
        }
        if(bearing&&bearing.clearance<HAT_RAIL_BEARING_PILE_MIN_CLEARANCE_MM){
          const message=`${railLabel}: ${niceNumber(bearing.clearance)} mm from ${bearing.label}; minimum ${HAT_RAIL_BEARING_PILE_MIN_CLEARANCE_MM} mm.`;
          issues.push(message);violations.push({type:'bearing-pile',side:sideName,railNumber,position,clearance:bearing.clearance,minimum:HAT_RAIL_BEARING_PILE_MIN_CLEARANCE_MM,message});
        }
        rail['Hat Rail No.']=railNumber;
        rail['PV Modules']=`${prefix}${railNumber} / ${prefix}${railNumber+1}`;
        rail['Sits On']=containingOverlap?.label||hatRailTubeLabel(geometry,rail);
        rail['Nearest Torque Tube Overlap']=overlap?.label||'Not applicable';
        rail['Overlap Clearance (mm)']=overlap?niceNumber(overlap.clearance):'';
        rail['Nearest Bearing Pile']=bearing?.label||'Not applicable';
        rail['Bearing Pile Clearance (mm)']=bearing?niceNumber(bearing.clearance):'';
        rail['Clearance Status']=issues.length?'Warning':'OK';
        rail['Clearance Warning']=issues.join(' ');
        warnings.push(...issues);
      });
    }
    return {Rows:rows,Warnings:warnings,Violations:violations,Status:warnings.length?'Warning':'OK'};
  }
  function closestRailIndicesAroundPosition(rails,bearingPosition){
    if(!rails.length) return [];
    const positions=rails.map(r=>asNumber(r['Distance from Mid Plane (mm)'],0));
    const left=[],right=[];
    positions.forEach((p,i)=>{if(p<=bearingPosition)left.push(i);if(p>=bearingPosition)right.push(i);});
    const result=[];
    if(left.length) result.push(left[left.length-1]);
    if(right.length && !result.includes(right[0])) result.push(right[0]);
    if(!result.length){ let nearest=0; for(let i=1;i<positions.length;i++) if(Math.abs(positions[i]-bearingPosition)<Math.abs(positions[nearest]-bearingPosition)) nearest=i; result.push(nearest); }
    return result;
  }
  /*
   * TEMPORARILY DISABLED FOR K001099 / PLUSS00173BZ00.
   * Previous calculation logic retained here for future restoration. It calculated
   * support plates rail by rail using bearing influence, taper, and beam-height
   * compensation.
   *
  function calculateModuleSupportPlatesForTracker(project,scheduleRow,geometry,bearingRows){
    const pvCount=asInt(scheduleRow['PV Modules per Tracker'],0);
    function calculateSide(sideName){
      const rails=generateModuleRailPositionsForSide(project,pvCount,geometry,sideName);
      const candidates=rails.map(rail=>[{plates:1,reason:'Base support plate',bearing_level:rail['Beam Level'],seed_bearing:'',seed_distance:''}]);
      const sideSign=sideName==='North'?1:-1;
      const sideBearings=[];
      for(const b of bearingRows){
        const signedPos=asNumber(b['Distance from Main Post (mm)'],0);
        if(sideSign===1 && signedPos<=0) continue;
        if(sideSign===-1 && signedPos>=0) continue;
        const bearingType=String(b['Bearing Type']||'');
        const peak=bearingType==='Bearing 110'?2:bearingType==='Bearing 100'?4:1;
        if(peak<=1) continue;
        const [bearingBeamZone,bearingLevel]=classifyBeamZoneForPosition(geometry,signedPos);
        sideBearings.push({position:Math.abs(signedPos),signed_position:signedPos,bearing_type:bearingType,bearing_beam_zone:bearingBeamZone,bearing_level:bearingLevel,peak});
      }
      for(const bearing of sideBearings){
        for(const seedIndex of closestRailIndicesAroundPosition(rails,bearing.position)){
          for(let i=0;i<rails.length;i++){
            const offset=Math.abs(i-seedIndex);
            const taperRequired=bearing.peak-offset;
            if(taperRequired<1) continue;
            const currentLevel=rails[i]['Beam Level'];
            const beamCompensation=currentLevel-bearing.bearing_level;
            const finalCandidate=Math.max(1,taperRequired+beamCompensation);
            const reason=`${bearing.bearing_type} influence from ${niceNumber(bearing.signed_position)} mm; bearing zone=${bearing.bearing_beam_zone}; taper=${taperRequired}; rail level=${currentLevel}; bearing level=${bearing.bearing_level}; beam compensation=${beamCompensation}`;
            candidates[i].push({plates:finalCandidate,reason,bearing_level:bearing.bearing_level,seed_bearing:bearing.bearing_type,seed_distance:bearing.signed_position});
          }
        }
      }
      let total=0;
      rails.forEach((rail,i)=>{
        const best=candidates[i].reduce((a,b)=>b.plates>a.plates?b:a,candidates[i][0]);
        rail['Final Plates / Rail / Side']=best.plates;
        rail['Reason']=best.reason;
        rail['Influence Bearing']=best.seed_bearing;
        rail['Influence Bearing Distance']=best.seed_distance;
        total+=asInt(best.plates,0);
      });
      return [rails,total];
    }
    const [northRows,totalNorth]=calculateSide('North');
    const [southRows,totalSouth]=calculateSide('South');
    return {'Rows':[...northRows,...southRows],'Rows Right Side':northRows,'Rows North Side':northRows,'Rows South Side':southRows,'Module Support Plates / Tracker':totalNorth+totalSouth,'Module Support Plates / Side':totalNorth===totalSouth?totalNorth:`N:${totalNorth} / S:${totalSouth}`,'Module Support Plates / North Side':totalNorth,'Module Support Plates / South Side':totalSouth};
  }
  */

  // TEMPORARY K001099 / PLUSS00173BZ00 RULE:
  // PV modules - 2 + 2 × Bearing 110 + 6 × Bearing 100, per tracker.
  function calculateModuleSupportPlatesForTracker(project,scheduleRow,geometry,bearingRows=[]){
    const pvCount=asInt(scheduleRow['PV Modules per Tracker'],0);
    function calculateSide(sideName){
      const rails=generateModuleRailPositionsForSide(project,pvCount,geometry,sideName),reasons=rails.map(()=>[]),influences=rails.map(()=>[]);
      rails.forEach((rail,index)=>{
        const base=rail['Rail Type']==='Hat Rail'?1:0;
        rail['Base Plates']=base;rail['Bearing Required Plates']=0;rail['Final Plates / Rail / Side']=base;
        reasons[index].push(base?'Temporary formula base: 1 plate per Hat rail':'Temporary formula base: 0 plates per Z rail');
      });
      (bearingRows||[]).filter(bearing=>bearing.Side===sideName).forEach(bearing=>{
        const bearingType=String(bearing['Bearing Type']||''),additionPerRail=bearingType==='Bearing 110'?1:(bearingType==='Bearing 100'?3:0);
        if(!additionPerRail)return;
        const position=Math.abs(asNumber(bearing['Distance from Main Post (mm)'],0));
        const nearest=rails.map((rail,index)=>({index,distance:Math.abs(asNumber(rail['Distance from Mid Plane (mm)'],0)-position)})).sort((a,b)=>a.distance-b.distance||a.index-b.index).slice(0,2);
        nearest.forEach(({index})=>{
          rails[index]['Bearing Required Plates']+=additionPerRail;
          rails[index]['Final Plates / Rail / Side']+=additionPerRail;
          reasons[index].push(`${bearingType} at ${niceNumber(position)} mm: +${additionPerRail}`);
          influences[index].push(`${bearingType} @ ${niceNumber(position)} mm`);
        });
      });
      let total=0;
      rails.forEach((rail,index)=>{
        rail['Reason']=reasons[index].join('; ');
        rail['Influence Bearing']=influences[index].join(', ');
        rail['Influence Bearing Distance']=influences[index].length?influences[index].map(value=>value.split(' @ ')[1]).join(', '):'';
        total+=asInt(rail['Final Plates / Rail / Side'],0);
      });
      return [rails,total];
    }
    const [northRows,totalNorth]=calculateSide('North');
    const [southRows,totalSouth]=calculateSide('South');
    return {'Rows':[...northRows,...southRows],'Rows Right Side':northRows,'Rows North Side':northRows,'Rows South Side':southRows,'Module Support Plates / Tracker':totalNorth+totalSouth,'Module Support Plates / Side':totalNorth===totalSouth?totalNorth:`N:${totalNorth} / S:${totalSouth}`,'Module Support Plates / North Side':totalNorth,'Module Support Plates / South Side':totalSouth};
  }

  function buildSchedule(project){
    const d=getDesignInputs(project);
    const rows=[];
    for(let pvCount=14;pvCount<=56;pvCount++){
      const geometry=calculateTrackerGeometry(project,pvCount);
      const variants=cadBlocksAreAvailable(project)?getBearingRuleVariantsForPv(project,pvCount):[];
      const configurations=variants.length?variants.map(rule=>({rule,quantity:rule.quantity,key:rule.key,source:'Custom'})):[{rule:null,quantity:asInt(project.tracker_quantities?.[String(pvCount)],0),key:'default',source:cadBlocksAreAvailable(project)?'Default':'Estimation'}];
      configurations.forEach(configuration=>{
        const trackerQty=Math.max(0,asInt(configuration.quantity,0));
        const scheduleKey=`${pvCount}:${configuration.key}`;
        const row={...geometry,'PV Modules per Tracker':pvCount,'Number of Trackers':trackerQty,'PV Modules Total':pvCount*trackerQty,'Estimated Power (MWp)':pvCount*trackerQty*d.pv_power/1000000,'_bearing_rule_key':configuration.key==='default'?'':configuration.key,'_schedule_key':scheduleKey};
        const bearingResult=calculateBearingLayoutForTracker(project,row,geometry,configuration.rule,configuration.source);
        Object.assign(row,{
          'Bearing Posts / Tracker':bearingResult['Bearing Posts / Tracker'],
          'Bearing 120 / Tracker':bearingResult['Bearing 120 / Tracker'],
          'Bearing 110 / Tracker':bearingResult['Bearing 110 / Tracker'],
          'Bearing 100 / Tracker':bearingResult['Bearing 100 / Tracker'],
          'Bearing Outside / Tracker':bearingResult['Bearing Outside / Tracker'],
          'Bearing Status':bearingResult['Bearing Status'],
          'Bearing Rule Source':bearingResult['Bearing Rule Source'],
          'Bearing Rule Mode':bearingResult['Bearing Rule Mode'],
          'Span Type':bearingResult['Span Type'],
          '_bearing_rows':bearingResult.Rows,
        });
        const supportResult=calculateModuleSupportPlatesForTracker(project,row,geometry,bearingResult.Rows);
        const clearanceResult=calculateHatRailInstallationClearances(project,geometry,bearingResult.Rows,supportResult.Rows);
        Object.assign(row,{
          'Module Support Plates / Side':supportResult['Module Support Plates / Side'],
          'Module Support Plates / North Side':supportResult['Module Support Plates / North Side'],
          'Module Support Plates / South Side':supportResult['Module Support Plates / South Side'],
          'Module Support Plates / Tracker':supportResult['Module Support Plates / Tracker'],
          'Hat Rail Installation Status':clearanceResult.Status,
          'Hat Rail Installation Warnings':clearanceResult.Warnings,
          'Hat Rail Installation Violations':clearanceResult.Violations,
          '_module_support_rows':clearanceResult.Rows,
          '_module_support_rows_right':clearanceResult.Rows.filter(item=>item.Side==='North'),
          '_module_support_rows_north':clearanceResult.Rows.filter(item=>item.Side==='North'),
          '_module_support_rows_south':clearanceResult.Rows.filter(item=>item.Side==='South'),
        });
        rows.push(row);
      });
    }
    return rows;
  }
  function buildBearingLayoutTable(activeSchedule){
    const rows=[];
    activeSchedule.forEach(scheduleRow=>{
      const trackerQty=asInt(scheduleRow['Number of Trackers'],0),pvCount=asInt(scheduleRow['PV Modules per Tracker'],0);
      (scheduleRow._bearing_rows||[]).forEach(bearingRow=>rows.push({...bearingRow,'PV Modules per Tracker':pvCount,'Bearing Rule Mode':scheduleRow['Bearing Rule Mode'],'Number of Trackers':trackerQty,'Total Bearing Qty':trackerQty}));
    });
    return rows;
  }
  function buildModuleSupportLayoutTable(activeSchedule){
    const rows=[];
    activeSchedule.forEach(scheduleRow=>{
      const trackerQty=asInt(scheduleRow['Number of Trackers'],0),pvCount=asInt(scheduleRow['PV Modules per Tracker'],0);
      (scheduleRow._module_support_rows||[]).forEach(supportRow=>{
        const item={...supportRow,'PV Modules per Tracker':pvCount,'Bearing Rule Mode':scheduleRow['Bearing Rule Mode'],'Number of Trackers':trackerQty};
        if(!item.Side) item.Side=asNumber(item['Signed Distance from Mid Plane (mm)'] ?? item['Distance from Mid Plane (mm)'],0)>=0?'North':'South';
        if(!Object.prototype.hasOwnProperty.call(item,'Signed Distance from Mid Plane (mm)')) item['Signed Distance from Mid Plane (mm)']=(item.Side==='North'?1:-1)*asNumber(item['Distance from Mid Plane (mm)'],0);
        item['Total Plates']=asInt(item['Final Plates / Rail / Side'],0)*trackerQty;
        rows.push(item);
      });
    });
    return rows;
  }

  function partMasterRecordText(record){ return [record.Part,record.TAG,record.Description,record['Part Number'],record.Category].join(' '); }
  function recordIsFastener(record){
    const text=partMasterRecordText(record).toLowerCase(),category=String(record.Category||'').toLowerCase();
    return category.includes('fastener') || (` ${text} `).includes(' din ') || text.includes('iso') || text.includes('bolt') || text.includes('nut') || text.includes('washer') || text.includes('screw');
  }
  function itemIsFastener(calculatedItem,categoryFallback){
    const text=`${calculatedItem} ${categoryFallback}`.toLowerCase();
    return text.includes('fastener') || (` ${text} `).includes(' din ') || text.includes('iso') || text.includes('bolt') || text.includes('nut') || text.includes('washer') || text.includes('screw');
  }
  function recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback){
    const normalizedItem=normalizeText(calculatedItem),normalizedRecord=normalizeText(partMasterRecordText(record));
    const fastItem=itemIsFastener(calculatedItem,categoryFallback),fastRecord=recordIsFastener(record);
    if(fastItem && !fastRecord) return false;
    if(!fastItem && fastRecord) return false;
    if(normalizedItem==='pvmodule') return normalizedRecord.includes('pvmodule')||normalizedRecord.includes('solarmodule');
    if(normalizedItem==='bearingpile'||normalizedItem==='bearingpost') return !normalizedRecord.includes('adapter')&&!normalizedRecord.includes('head')&&(normalizedRecord.includes('bearingpile')||normalizedRecord.includes('bearingpost')||normalizedRecord.includes('lateralpile'));
    if(normalizedItem==='torquetubea'||normalizedItem==='maintubea') return !normalizedRecord.includes('connection')&&(normalizedRecord.includes('torquetubea')||normalizedRecord.includes('maintubea')||normalizedRecord.includes('mainbeama')||normalizedRecord.includes('120x120'));
    if(['torquetubeclong','torquetubecshort','maintubeclong','maintubecshort'].includes(normalizedItem)){
      if(!normalizedRecord.includes('torquetubec')&&!normalizedRecord.includes('maintubec')&&!normalizedRecord.includes('mainbeamc')&&!normalizedRecord.includes('100x100')) return false;
      return normalizedItem.endsWith('long')?(normalizedRecord.includes('long')||normalizedRecord.includes('11800')):(normalizedRecord.includes('short')||normalizedRecord.includes('8700'));
    }
    if(normalizedItem==='slewdrive') return !normalizedRecord.includes('seat')&&!normalizedRecord.includes('connection')&&(normalizedRecord.includes('slewingdrive')||normalizedRecord.includes('slewdrive'));
    if(normalizedItem==='limitswitch') return !normalizedRecord.includes('holder')&&!normalizedRecord.includes('trigger')&&!normalizedRecord.includes('frame')&&normalizedRecord.includes('limitswitch');
    if(normalizedItem==='soltrk') return normalizedRecord.includes('soltrk')&&!normalizedRecord.includes('holder')&&!normalizedRecord.includes('bracket');
    if(normalizedItem==='soltrkholder') return normalizedRecord.includes('soltrk')&&(normalizedRecord.includes('holder')||normalizedRecord.includes('bracket'));
    if(normalizedItem==='junctionbox') return normalizedRecord.includes('junctionbox')&&!normalizedRecord.includes('holder')&&!normalizedRecord.includes('bracket');
    if(normalizedItem==='junctionboxholder') return normalizedRecord.includes('junctionbox')&&(normalizedRecord.includes('holder')||normalizedRecord.includes('bracket'));
    return true;
  }
  function findPartMasterMatch(partMaster,keywords,calculatedItem='',categoryFallback=''){
    keywords=(keywords||[]).map(v=>String(v||'')).filter(v=>v.trim());
    if(!keywords.length) return null;
    const joined=[...keywords,calculatedItem].join(' ');
    const requestedCodes=joined.toLowerCase().match(/k\d{6}/g)||[];
    if(requestedCodes.length){
      for(const record of partMaster){
        const tagNorm=normalizeText(record.TAG),partNorm=normalizeText(record.Part);
        if(requestedCodes.some(code=>code===tagNorm||code===partNorm) && recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback)) return record;
      }
      for(const record of partMaster){
        const tagText=`${record.TAG||''} ${record.Part||''}`.toLowerCase();
        if(requestedCodes.some(code=>tagText.includes(code)) && recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback)) return record;
      }
    }
    const normalizedItem=normalizeText(calculatedItem);
    if(normalizedItem){
      for(const record of partMaster){ if(normalizeText(record.Part)===normalizedItem && recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback)) return record; }
    }
    if(requestedCodes.length) return null;
    if(itemIsFastener(calculatedItem,categoryFallback)){
      const fastKeywords=keywords.map(normalizeText).filter((nk,i)=>nk&&!/^k\d{6}$/.test(keywords[i].toLowerCase()));
      if(!fastKeywords.length) return null;
      for(const record of partMaster){
        if(!recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback)) continue;
        const norm=normalizeText(partMasterRecordText(record));
        if(fastKeywords.every(keyword=>norm.includes(keyword))) return record;
      }
      return null;
    }
    const generic=new Set(['module','rail','bearing','post','beam','tube','main','drive','holder','switch','box']);
    const normalizedKeywords=keywords.map(normalizeText).filter((nk,i)=>nk&&!generic.has(nk)&&!/^k\d{6}$/.test(keywords[i].toLowerCase()));
    let best=null,bestScore=0;
    for(const record of partMaster){
      if(!recordIsValidForCalculatedItem(record,calculatedItem,categoryFallback)) continue;
      const norm=normalizeText(partMasterRecordText(record));
      const score=normalizedKeywords.reduce((sum,kw)=>sum+(norm.includes(kw)?1:0),0);
      if(score>bestScore){bestScore=score;best=record;}
    }
    return bestScore>0?best:null;
  }

  // Steel Structure defaults. Fill only the Material and Weight values below.
  const BOM_DEFAULT_METADATA = Object.freeze({
    mainpost:Object.freeze({Material:'1.0045 (S355JR)',Weight:84.16}),
    slewdriveseat:Object.freeze({Material:'1.0045 (S355JR)',Weight:9.62}),
    bearingpost:Object.freeze({Material:'1.8902 (S420JR)',Weight:25.26}),
    drivepile:Object.freeze({Material:'1.0045 (S355JR)',Weight:84.16}),
    bearingpile:Object.freeze({Material:'1.8902 (S420JR)',Weight:25.26}),
    bearingadapter:Object.freeze({Material:'1.0045 (S355JR)',Weight:5.39}),
    mainbeama:Object.freeze({Material:'1.8902 (S420GD)',Weight:138.63}),
    mainbeamb:Object.freeze({Material:'1.8902 (S420GD)',Weight:130.85}),
    mainbeamclong:Object.freeze({Material:'1.8902 (S420GD)',Weight:122.4}),
    mainbeamcshort:Object.freeze({Material:'1.8902 (S420GD)',Weight:89.51}),
    maintubea:Object.freeze({Material:'1.8902 (S420GD)',Weight:138.63}),
    maintubeb:Object.freeze({Material:'1.8902 (S420GD)',Weight:130.85}),
    maintubeclong:Object.freeze({Material:'1.8902 (S420GD)',Weight:122.4}),
    maintubecshort:Object.freeze({Material:'1.8902 (S420GD)',Weight:89.51}),
    torquetubea:Object.freeze({Material:'1.8902 (S420GD)',Weight:138.63}),
    torquetubeb:Object.freeze({Material:'1.8902 (S420GD)',Weight:130.85}),
    torquetubeclong:Object.freeze({Material:'1.8902 (S420GD)',Weight:122.4}),
    torquetubecshort:Object.freeze({Material:'1.8902 (S420GD)',Weight:89.51}),
    slewdriveconnection:Object.freeze({Material:'1.0529 (S350GD)',Weight:7.1}),
    hatrail:Object.freeze({Material:'1.8902 (S420GD)',Weight:2.19}),
    zrail:Object.freeze({Material:'1.8902 (S420GD)',Weight:1.84}),
    modulerailfixingpart:Object.freeze({Material:'1.0529 (S350GD)',Weight:0.19}),
    modulerailsupportplate:Object.freeze({Material:'1.0045 (S355JR)',Weight:0.24}),
    modulerailelevationplate:Object.freeze({Material:'1.0038 (S235JR)',Weight:0.23}),
    limitswitchholder:Object.freeze({Material:'DX51D',Weight:0.55}),
    limitswitchtrigger:Object.freeze({Material:'DX51D',Weight:0.36}),
    soltrkholder:Object.freeze({Material:'DX51D',Weight:1.12}),
    junctionboxholder:Object.freeze({Material:'DX51D',Weight:0.21}),
    anemometerholderplate:Object.freeze({Material:'DX51D',Weight:0.22}),
  });
  function defaultBomMetadata(record,calculatedItem=''){
    const calculatedKey=normalizeText(calculatedItem),partKey=normalizeText(record?.Part??record?.['Part Name']);
    let defaults=BOM_DEFAULT_METADATA[calculatedKey]||BOM_DEFAULT_METADATA[partKey];
    if(!defaults&&partKey.startsWith('soltrk')&&partKey.endsWith('holder'))defaults=BOM_DEFAULT_METADATA.soltrkholder;
    return defaults||(recordIsFastener(record)?{Material:'-',Weight:'-'}:{Material:'',Weight:''});
  }
  function normalizePartMasterData(columns,rows){
    const normalizedColumns=Array.isArray(columns)&&columns.length?[...columns]:[...PART_COLUMNS];
    for(const column of ['Material','Weight'])if(!normalizedColumns.some(existing=>normalizeText(existing)===normalizeText(column)))normalizedColumns.push(column);
    const normalizedRows=(Array.isArray(rows)?rows:[]).map(raw=>{
      const source=raw&&typeof raw==='object'?raw:{},record={...source},defaults=defaultBomMetadata(record);
      for(const column of normalizedColumns)if(!Object.prototype.hasOwnProperty.call(record,column))record[column]=['Material','Weight'].includes(column)?defaults[column]:'';
      return record;
    }).filter(record=>record.Part||record.TAG||record.Description);
    return {columns:normalizedColumns,rows:normalizedRows};
  }
  function bomRowKey(record){
    const tag=normalizeText(record?.TAG);
    if(tag) return `tag:${tag}`;
    const part=normalizeText(record?.Part ?? record?.['Part Name']);
    if(part) return `part:${part}`;
    return `description:${normalizeText(record?.Description)}`;
  }
  function normalizeSoltrkVersion(value){ return String(value||'2.0').trim()==='3.0'?'3.0':'2.0'; }
  function scheduleRowIdentity(row){return String(row?._schedule_key||`${asInt(row?.['PV Modules per Tracker'],0)}:default`);}
  function torqueTubeJointCountForRow(row){
    // Each tracker has one inner joint on each side: A–B for long trackers,
    // or Slew Drive Connection–B for short trackers. C adds one joint per side.
    return 2
      +(asNumber(row?.['Main Tube C Required Length North'],0)>0?1:0)
      +(asNumber(row?.['Main Tube C Required Length South'],0)>0?1:0);
  }
  function torqueTubeConnectionFastenersForRow(row){
    return 4*torqueTubeJointCountForRow(row)*asInt(row?.['Number of Trackers'],0);
  }
  function distributeEquipmentQuantities(project,rows,overrideKey,automaticFormula,wholePlantAutomaticTotal=null){
    if(!rows.length) return {};
    const automatic=rows.map(row=>Math.max(0,asInt(automaticFormula(row),0)));
    const override=project?.equipment_quantity_overrides?.[overrideKey];
    const hasOverride=override!==undefined && override!==null && override!=='';
    if(!hasOverride && wholePlantAutomaticTotal===null) return Object.fromEntries(rows.map((row,index)=>[scheduleRowIdentity(row),automatic[index]]));
    const total=Math.max(0,asInt(hasOverride?override:wholePlantAutomaticTotal,0));
    let weights=wholePlantAutomaticTotal===null?[...automatic]:rows.map(row=>Math.max(0,asInt(row['Number of Trackers'],0)));
    let weightTotal=weights.reduce((sum,value)=>sum+value,0);
    if(weightTotal<=0){weights=rows.map(row=>Math.max(0,asInt(row['Number of Trackers'],0)));weightTotal=weights.reduce((sum,value)=>sum+value,0);}
    if(weightTotal<=0){weights=rows.map(()=>1);weightTotal=weights.length;}
    const raw=weights.map(weight=>weightTotal?total*weight/weightTotal:0);
    const distributed=raw.map(Math.floor);
    let remainder=total-distributed.reduce((sum,value)=>sum+value,0);
    const order=raw.map((value,index)=>({index,fraction:value-distributed[index]})).sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
    for(let index=0;index<remainder;index++) distributed[order[index%order.length].index]++;
    return Object.fromEntries(rows.map((row,index)=>[scheduleRowIdentity(row),distributed[index]]));
  }
  function equipmentQuantityAllocation(project,rows=[]){
    const activeRows=(Array.isArray(rows)?rows:[]).filter(row=>asInt(row?.['Number of Trackers'],0)>0);
    const totalTrackers=activeRows.reduce((sum,row)=>sum+asInt(row['Number of Trackers'],0),0);
    const automaticSoltrk=activeRows.reduce((sum,row)=>sum+ceilHalf(asInt(row['Number of Trackers'])),0);
    const automaticJunctionBox=activeRows.reduce((sum,row)=>sum+Math.floor(asInt(row['Number of Trackers'])/2),0);
    const soltrkByPv=distributeEquipmentQuantities(project,activeRows,'soltrk',row=>ceilHalf(asInt(row['Number of Trackers'])));
    const junctionBoxByPv=distributeEquipmentQuantities(project,activeRows,'junction_box',row=>Math.floor(asInt(row['Number of Trackers'])/2));
    const plantAutomaticByKey={},plantByKey={},plantTotalsByKey={};
    for(const item of PLANT_ELECTRICAL_ITEMS){
      const automaticTotal=Math.ceil(totalTrackers/item.perTrackers);
      const byRow=distributeEquipmentQuantities(project,activeRows,item.key,row=>asInt(row['Number of Trackers']),automaticTotal);
      plantAutomaticByKey[item.key]=automaticTotal;
      plantByKey[item.key]=byRow;
      plantTotalsByKey[item.key]=Object.values(byRow).reduce((sum,value)=>sum+asInt(value),0);
    }
    return {
      automaticSoltrk,
      automaticJunctionBox,
      soltrk:Object.values(soltrkByPv).reduce((sum,value)=>sum+asInt(value),0),
      junctionBox:Object.values(junctionBoxByPv).reduce((sum,value)=>sum+asInt(value),0),
      soltrkByPv,
      junctionBoxByPv,
      totalTrackers,
      plantAutomaticByKey,
      plantByKey,
      plantTotalsByKey,
    };
  }
  function contextEquipmentQty(context,key,row){ return asInt(context?.[`${key}ByPv`]?.[scheduleRowIdentity(row)],0); }
  function contextPlantEquipmentQty(context,key,row){ return asInt(context?.plantByKey?.[key]?.[scheduleRowIdentity(row)],0); }
  function applyBomMetadata(row,calculatedItem,sourceRecord=null){
    const defaults=defaultBomMetadata(row,calculatedItem),source=sourceRecord&&typeof sourceRecord==='object'?sourceRecord:{};
    row.Material=Object.prototype.hasOwnProperty.call(source,'Material')?source.Material:defaults.Material;
    row.Weight=Object.prototype.hasOwnProperty.call(source,'Weight')?source.Weight:defaults.Weight;
    row._bom_key=bomRowKey(row);
  }

  // V3.40 automatic BOM definitions, kept in the same order as bom_definitions.py.
  const BOM_DEFINITIONS = [
    ['Drive Pile',r=>asInt(r['Number of Trackers']),['drive pile','main post','hea 140'],'Structure / Posts','Total Trackers QTY'],
    ['Slew Drive Seat',r=>2*asInt(r['Number of Trackers']),['slew drive seat','slew seat'],'Drive / Slew','2 × Drive Pile'],
    ['Bearing Pile',r=>asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['bearing pile','bearing post','lateral pile','c 160'],'Structure / Posts','Calculated from bearing distance rules'],
    ['Bearing Adapter',r=>asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['bearing adapter','adapter bearing','lateral pile head'],'Drive / Bearing','Bearing Pile'],
    ['Torque Tube A',r=>r['Tracker Type']==='Long'?2*asInt(r['Number of Trackers']):0,['torque tube a','main tube a','main beam a','120x120'],'Torque Tubes','Long trackers only; 2 per tracker'],
    ['Torque Tube B',r=>2*asInt(r['Number of Trackers']),['torque tube b','main tube b','main beam b','110x110'],'Torque Tubes','2 per tracker'],
    ['Torque Tube C - Long',r=>((asNumber(r['Main Tube C Required Length North'])>0&&String(r['Main Tube C Stock Suggestion North']).includes('11800')?1:0)+(asNumber(r['Main Tube C Required Length South'])>0&&String(r['Main Tube C Stock Suggestion South']).includes('11800')?1:0))*asInt(r['Number of Trackers']),['torque tube c','main tube c','main beam c','100x100','11800','long'],'Torque Tubes','Counted only when required length > 0; per tracker side; odd trackers may have different north/south C length'],
    ['Torque Tube C - Short',r=>((asNumber(r['Main Tube C Required Length North'])>0&&String(r['Main Tube C Stock Suggestion North']).includes('8700')?1:0)+(asNumber(r['Main Tube C Required Length South'])>0&&String(r['Main Tube C Stock Suggestion South']).includes('8700')?1:0))*asInt(r['Number of Trackers']),['torque tube c','main tube c','main beam c','100x100','8700','short'],'Torque Tubes','Counted only when required length > 0; per tracker side; odd trackers may have different north/south C length'],
    ['Slew Drive Connection',r=>r['Tracker Type']!=='Long'?2*asInt(r['Number of Trackers']):0,['slew drive connection','tube connection','beam connection'],'Main Tubes','Short trackers only; 2 per tracker'],
    ['Hat rail',r=>Math.max(asInt(r['PV Modules per Tracker'])-2,0)*asInt(r['Number of Trackers']),['hat rail','hatrail','pv rail 790x75'],'Module Rails / Support','PV Modules - 2 per tracker'],
    ['Z rail',r=>4*asInt(r['Number of Trackers']),['z rail','zrail','end pv rail'],'Module Rails / Support','4 per tracker'],
    ['Module Rail Fixing Part',r=>(Math.max(asInt(r['PV Modules per Tracker'])-2,0)+4+1)*asInt(r['Number of Trackers']),['module rail fixing','rail fixing','fixing part','rail lower clamp','lower clamp'],'Module Rails / Support','Hat Rail + Z Rail + 1 per tracker'],
    // Previous K001099 / PLUSS00173BZ00 calculation (kept for future restoration):
    // ['Module Rail Support Plate',r=>asInt(r['Module Support Plates / Tracker'])*asInt(r['Number of Trackers']),['k001099','module support plate','support plate','module rail support plate'],'Module Rails / Support','Existing formula kept: rail-by-rail bearing influence, taper, and main tube height compensation'],
    // Temporary calculation: PV modules - 2 + 2 × Bearing 110 + 6 × Bearing 100.
    ['Module Rail Support Plate',r=>asInt(r['Module Support Plates / Tracker'])*asInt(r['Number of Trackers']),['k001099','module support plate','support plate','module rail support plate'],'Module Rails / Support','Temporary formula for K001099 / PLUSS00173BZ00: (PV modules − 2) + (2 × Bearing 110) + (6 × Bearing 100), per tracker'],
    ['Module Rail Elevation Plate',r=>2*asInt(r['Bearing 100 / Tracker'])*asInt(r['Number of Trackers']),['k001573','module elevation plate','elevation plate','module rail elevation plate'],'Module Rails / Support','2 × Bearing 100'],
    ['Limit Switch Holder',r=>asInt(r['Number of Trackers']),['limit switch holder'],'Steel Structure','Main Post'],
    ['Limit Switch Trigger',r=>asInt(r['Number of Trackers']),['limit switch trigger','limit switch frame'],'Steel Structure','Main Post'],
    ['SOLTRK Holder / External Plate',(r,c)=>contextEquipmentQty(c,'soltrk',r),c=>c.soltrkVersion==='3.0'?['k001568']:['k001505'],'Steel Structure / Substructure','1 × SOLTRK'],
    ['SOLTRK 3.0 Internal Plate',(r,c)=>c.soltrkVersion==='3.0'?contextEquipmentQty(c,'soltrk',r):0,['k001579'],'Steel Structure / Substructure','1 × SOLTRK 3.0'],
    ['SOLTRK 3.0 Logo Plate',(r,c)=>c.soltrkVersion==='3.0'?contextEquipmentQty(c,'soltrk',r):0,['k001569'],'Steel Structure / Substructure','1 × SOLTRK 3.0'],
    ['Junction Box Holder',(r,c)=>contextEquipmentQty(c,'junctionBox',r),['k001511','junction box holder','junction holder','j-box holder'],'Steel Structure','1 × Junction Box'],
    ['k001538 - Anemometer Bracket',(r,c)=>contextPlantEquipmentQty(c,'anemometer',r),['k001538','anemometer bracket','anemometer holder plate'],'Steel Structure','1 × selected Anemometer for the whole plant'],
    ['Bearing 120',r=>asInt(r['Bearing 120 / Tracker'])*asInt(r['Number of Trackers']),['bearing 120','gsqb 120','120 bearing'],'Drive / Bearing','Calculated from bearing post positions on 120 beam zone'],
    ['Bearing 110',r=>asInt(r['Bearing 110 / Tracker'])*asInt(r['Number of Trackers']),['bearing 110','gsqb 110','110 bearing'],'Drive / Bearing','Calculated from bearing post positions on 110 beam zone'],
    ['Bearing 100',r=>asInt(r['Bearing 100 / Tracker'])*asInt(r['Number of Trackers']),['bearing 100','gsqb 100','100 bearing'],'Drive / Bearing','Calculated from bearing post positions on 100 beam zone'],
    ['PV Module',r=>asInt(r['PV Modules per Tracker'])*asInt(r['Number of Trackers']),['pv module','solar module'],'PV Module','PV Modules per Tracker × Number of Trackers'],
    ['Slew Drive',r=>asInt(r['Number of Trackers']),['slewing drive','slew drive'],'Slew Drive','Main Post'],
    ['Limit Switch',r=>2*asInt(r['Number of Trackers']),['limit switch'],'Electrical','2 × Main Post'],
    ['SOLTRK',(r,c)=>contextEquipmentQty(c,'soltrk',r),c=>c.soltrkVersion==='3.0'?['k001549']:['k001534'],'Electrical','Editable total; automatic default is round up (Main Post / 2)'],
    ['Junction Box',(r,c)=>contextEquipmentQty(c,'junctionBox',r),['junction box','j-box','junction'],'Electrical','Editable total; automatic default is round down (Tracker / 2)'],
    ['k001390 - Cable gland pg13.5',r=>2*asInt(r['Number of Trackers']),['k001390','cable gland','pg13.5'],'Electrical','2 × Tracker'],
    ['k001405 - Safeguard-M48V-8-13_rev03',(r,c)=>contextPlantEquipmentQty(c,'k001405',r),['k001405','safeguard','m48v'],'Electrical','One per 48 trackers across the whole plant; project total may be overridden'],
    ['k001406 - Safeguard-S48V-8-13_rev03',(r,c)=>contextPlantEquipmentQty(c,'k001406',r),['k001406','safeguard','s48v'],'Electrical','One per 48 trackers across the whole plant; project total may be overridden'],
    ['k001525 - Higeco GWC V4 4DIN',(r,c)=>contextPlantEquipmentQty(c,'k001525',r),['k001525','higeco','gwc','4din','power supply'],'Electrical','One per 100 trackers across the whole plant; project total may be overridden'],
    ['k001552 - Scada Power supply HDR-30-24',(r,c)=>contextPlantEquipmentQty(c,'k001552',r),['k001552','scada','power supply','hdr-30-24'],'Electrical','One per 100 trackers across the whole plant; project total may be overridden'],
    ['k001542 - Scada enclosure GW40028',(r,c)=>contextPlantEquipmentQty(c,'k001542',r),['k001542','scada','enclosure','gw40028','electrical enclosure'],'Electrical','One per 48 trackers across the whole plant; project total may be overridden'],
    ['Anemometer for Cold Weather (above 400)',(r,c)=>c.anemometer.key==='cold'?contextPlantEquipmentQty(c,'anemometer',r):0,['k001536','anemometer','nuovaceva','0103011303'],'Electrical','Elevation ≥ 400 m ASL: one per 48 trackers across the whole plant; project total may be overridden'],
    ['Anemometer for Normal Weather',(r,c)=>c.anemometer.key==='normal'?contextPlantEquipmentQty(c,'anemometer',r):0,['k001596','anemometer','nuovaceva','0103010805'],'Electrical','Elevation < 400 m ASL: one per 48 trackers across the whole plant; project total may be overridden'],
    ['k001164 - DIN 933 ISO 4017 - M20 × 55',r=>8*asInt(r['Number of Trackers']),['k001164','din 933','iso 4017','m20','55'],'Fasteners / Slew Drive Seat - Main Post','8 × Main Post'],
    ['k001010 - DIN 934 ISO 4032 - M20',r=>8*asInt(r['Number of Trackers']),['k001010','din 934','iso 4032','m20'],'Fasteners / Slew Drive Seat - Main Post','8 × Main Post'],
    ['k001154 - DIN 125 ISO 7089 - A21 (M20)',r=>16*asInt(r['Number of Trackers']),['k001154','din 125','iso 7089','a21','m20'],'Fasteners / Slew Drive Seat - Main Post','16 × Main Post'],
    ['k001163 - DIN 127B - A20',r=>8*asInt(r['Number of Trackers']),['k001163','din 127b','a20'],'Fasteners / Slew Drive Seat - Main Post','8 × Main Post'],
    ['k001231 - DIN 933 ISO 4017 - M18 × 80',r=>4*asInt(r['Number of Trackers']),['k001231','din 933','iso 4017','m18','80'],'Fasteners / Slew Drive Seat - Slew Drive','4 × Main Post'],
    ['k001228 - DIN 934 ISO 4032 - M18',r=>4*asInt(r['Number of Trackers']),['k001228','din 934','iso 4032','m18'],'Fasteners / Slew Drive','4 × Main Post'],
    ['k001238 - DIN 7349 ISO 8738 - A19 (M18)',r=>4*asInt(r['Number of Trackers']),['k001238','din 7349','iso 8738','a19','m18'],'Fasteners / Slew Drive Seat - Slew Drive','4 × Main Post'],
    ['k001230 - DIN 127B - A18',r=>4*asInt(r['Number of Trackers']),['k001230','din 127b','a18'],'Fasteners / Slew Drive Seat - Slew Drive','4 × Main Post'],
    ['DIN 7967 - M18',r=>2*asInt(r['Number of Trackers']),['din 7967','m18'],'Fasteners / Slew Drive Seat - Slew Drive','2 × Main Post'],
    ['DIN 936 ISO 4035 - M18',r=>2*asInt(r['Number of Trackers']),['din 936','iso 4035','m18'],'Fasteners / Slew Drive Seat - Slew Drive','2 × Main Post'],
    ['k001129 - DIN 912 ISO 4762 - M14 × 180 - 40',r=>2*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001129','din 912','iso 4762','m14','180'],'Fasteners / Bearing Adapter','2 × Bearing Adapter'],
    ['k001125 - DIN 933 ISO 4017 - M14 × 35',r=>4*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001125','din 933','iso 4017','m14','35'],'Fasteners / Bearing Adapter','4 × Bearing Adapter'],
    ['k001124 - DIN 934 ISO 4032 - M14',r=>4*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001124','din 934','iso 4032','m14'],'Fasteners / Bearing Adapter','4 × Bearing Adapter'],
    ['k001401 - DIN 7985 ISO 7045 - M4 × 40',r=>4*asInt(r['Number of Trackers']),['k001401','din 7985','iso 7045','m4','40'],'Fasteners / Limit Switch','4 × Main Post'],
    ['k001130 - DIN 9021 ISO 7093 - 16 (M14)',r=>4*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001130','din 9021','iso 7093','m14','16'],'Fasteners / Bearing Adapter','4 × Bearing Adapter'],
    ['k001123 - DIN 6796 ISO 10683 - A15 (M14)',r=>4*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001123','din 6796','iso 10683','a15','m14'],'Fasteners / Bearing Adapter','4 × Bearing Adapter'],
    ['k001137 - Din 982 ISO 7040 - M14',r=>2*asInt(r['Bearing Posts / Tracker'])*asInt(r['Number of Trackers']),['k001137','din 982','iso 7040','m14'],'Fasteners / Bearing Adapter','2 × Bearing Adapter'],
    ['k001385 - DIN 933 ISO 4017 - M16 × 30',r=>16*asInt(r['Number of Trackers']),['k001385','din 933','iso 4017','m16','30'],'Fasteners / Main Tubes','16 × Main Post'],
    ['k001127 - DIN 125 ISO 7089 - A17 (M16)',r=>22*asInt(r['Number of Trackers']),['k001127','din 125','iso 7089','a17','m16'],'Fasteners / Main Tubes','22 × Tracker'],
    ['k001166 - DIN 127B - A16',r=>16*asInt(r['Number of Trackers']),['k001166','din 127b','a16'],'Fasteners / Main Tubes','16 × Main Post'],
    ['k001388 - DIN 93x Special Thread - M12 × 150 - 46',r=>torqueTubeConnectionFastenersForRow(r),['k001388','din 93x','m12','150'],'Fasteners / Torque Tubes','4 × each active tube joint: inner joint on each side, plus each B–C joint'],
    ['k001157 - DIN 9021 ISO 7093 - 13 (M12)',r=>2*torqueTubeConnectionFastenersForRow(r),['k001157','din 9021','iso 7093','m12','13'],'Fasteners / Torque Tubes','2 × k001388'],
    ['k001013 - DIN 982 ISO 7040 - M12',r=>torqueTubeConnectionFastenersForRow(r),['k001013','din 982','iso 7040','m12'],'Fasteners / Torque Tubes','1 × k001388'],
    ['k001151 - DIN 93x Special Thread - M8 × 150 - 50',r=>8*asInt(r['Number of Trackers']),['k001151','din 93x','m8','150'],'Fasteners / Module Rails','2 × Z Rail'],
    ['k001239 - DIN 522 - 19 × 39 × 3 (M18)',r=>4*asInt(r['Number of Trackers']),['k001239','din 522','19','39','m18'],'Fasteners / Slew Drive','4 × Tracker'],
    ['k001576 - Square Washer 38×38×9.5×6 (M8)',r=>2*Math.max(asInt(r['PV Modules per Tracker'])-2,0)*asInt(r['Number of Trackers']),['k001576','square washer','38×38','38x38','hat rail'],'Fasteners / Hat rail','2 × Hat rail'],
    ['k001235 - DIN 522 - 8.5 × 18 × 3 (M8)',r=>8*asInt(r['Number of Trackers']),['k001235','din 522','8.5','18','m8'],'Fasteners / Module Rails','2 × Z rail'],
    ['k001074 - DIN 982 ISO 7040 - M8',r=>2*(Math.max(asInt(r['PV Modules per Tracker'])-2,0)+4)*asInt(r['Number of Trackers']),['k001074','din 982','iso 7040','m8'],'Fasteners / Module Rails','2 × Rail'],
    ['k001575 - DIN 603 ISO 8677 - M8 × 150 - 50',r=>2*Math.max(asInt(r['PV Modules per Tracker'])-2,0)*asInt(r['Number of Trackers']),['k001575','din 603','iso 8677','m8'],'Fasteners / Hat Rails','2 × Hat Rail'],
    ['k001503 - DIN 976-1 - M6 × 1000',(r,c)=>ceilUp((2*(contextEquipmentQty(c,'soltrk',r)+contextEquipmentQty(c,'junctionBox',r)))/5),['k001503','din 976','m6','1000'],'Fasteners / SOLTRK + Junction Box Holders','Round up ((2 × (SOLTRK Holder + Junction Box Holder Plate)) / 5) per array configuration'],
    ['k001502 - DIN 9021 ISO 7093 - A6',(r,c)=>4*(contextEquipmentQty(c,'soltrk',r)+contextEquipmentQty(c,'junctionBox',r)),['k001502','din 9021','iso 7093','a6'],'Fasteners / SOLTRK + Junction Box Holders','4 × (SOLTRK Holder + Junction Box Holder Plate)'],
    ['k001501 - DIN 986 - M6',(r,c)=>2*(contextEquipmentQty(c,'soltrk',r)+contextEquipmentQty(c,'junctionBox',r)),['k001501','din 986','m6'],'Fasteners / SOLTRK + Junction Box Holders','2 × (SOLTRK Holder + Junction Box Holder Plate)'],
    ['k001504 - DIN 982 ISO 7040 - M6 - A2K',(r,c)=>2*(contextEquipmentQty(c,'soltrk',r)+contextEquipmentQty(c,'junctionBox',r)),['k001504','din 982','iso 7040','m6','a2k'],'Fasteners / SOLTRK + Junction Box Holders','2 × (SOLTRK Holder + Junction Box Holder Plate)'],
    ['k001509 - DIN 9021 ISO 7093 - A 4.3 (M4)',(r,c)=>(c.soltrkVersion==='2.0'?4*contextEquipmentQty(c,'soltrk',r):0)+4*asInt(r['Number of Trackers'])+4*contextEquipmentQty(c,'junctionBox',r),['k001509','din 9021','iso 7093','a4.3','m4'],'Fasteners / SOLTRK + Junction Box Holders + Limit Switch','SOLTRK 2.0: 4 × SOLTRK; all versions: 2 × Limit Switch + 4 × Junction Box Holder Plate'],
    ['k001510 - DIN 912 ISO 4762 - M4 × 25',(r,c)=>c.soltrkVersion==='2.0'?4*contextEquipmentQty(c,'soltrk',r):0,['k001510','din 912','iso 4762','m4','25'],'Fasteners / SOLTRK','SOLTRK 2.0 only: 4 × SOLTRK'],
    ['k001402 - DIN 982 ISO 7040 - M4',(r,c)=>4*contextEquipmentQty(c,'soltrk',r)+4*asInt(r['Number of Trackers']),['k001402','din 982','iso 7040','m4'],'Fasteners / SOLTRK + Limit Switch','4 × SOLTRK + 2 × Limit Switch'],
    ['k001454 - DIN 7985 ISO 7045 - M5 × 16',(r,c)=>4*contextEquipmentQty(c,'junctionBox',r)+(c.soltrkVersion==='3.0'?4*contextEquipmentQty(c,'soltrk',r):0),['k001454','din 7985','iso 7045','m5','16'],'Fasteners / Junction Box + SOLTRK 3.0','4 × Junction Box + (SOLTRK 3.0: 4 × SOLTRK)'],
    ['k001513 - DIN 982 ISO 7040 - M5',(r,c)=>4*contextEquipmentQty(c,'junctionBox',r)+(c.soltrkVersion==='3.0'?4*contextEquipmentQty(c,'soltrk',r):0)+3*contextPlantEquipmentQty(c,'anemometer',r),['k001513','din 982','iso 7040','m5'],'Fasteners / Junction Box + SOLTRK 3.0 External Plate + Anemometer','4 × Junction Box + (SOLTRK 3.0: 4 × SOLTRK 3.0 External Plate) + 3 × selected Anemometer'],
    ['k001539 - DIN 7985 ISO 7045 - M5 × 20',(r,c)=>3*contextPlantEquipmentQty(c,'anemometer',r),['k001539','din 7985','iso 7045','m5','20'],'Fasteners / Anemometer','3 × selected Anemometer'],
    ['k001479 - Tube Spacer',r=>2*torqueTubeConnectionFastenersForRow(r),['k001479','tube spacer','m12','16','12.7','13.3'],'Fasteners / Main Tube - Main Tube','2 × k001388'],
  ];

  function buildProjectBom(project,activeSchedule,partMaster,partMasterColumns=PART_COLUMNS){
    const selectedRows=activeSchedule.filter(r=>asInt(r['Number of Trackers'])>0).slice().sort((a,b)=>asInt(b['PV Modules per Tracker'])-asInt(a['PV Modules per Tracker']));
    const selectedPvs=[...new Set(selectedRows.map(r=>asInt(r['PV Modules per Tracker'])))];
    const qtyColumns=selectedPvs.map(pv=>`${pv}-PV Qty`);
    const baseColumns=(partMasterColumns||PART_COLUMNS).filter(col=>!['note','notes','material','weight'].includes(normalizeText(col)));
    const displayBaseColumns=baseColumns.map(col=>col==='Part'?'Part Name':col);
    const contingencyEnabled=project?.contingency_enabled===true;
    const contingencyPercent=Math.min(100,Math.max(0,asNumber(project?.fastener_contingency_percent,0)));
    const metadataEnabled=project?.bom_metadata_enabled!==false;
    const columns=['No.',...displayBaseColumns,...(metadataEnabled?['Material','Weight']:[]),...qtyColumns,'Total Qty',...(contingencyEnabled?['Contingency (%)']:[])];
    const previewColumns=['No.',...displayBaseColumns,'Calculation Note'];
    const rows=[];
    const errors=[];
    const notesByTag={},notesByPart={};
    const equipmentAllocation=equipmentQuantityAllocation(project,selectedRows);
    const bomContext={
      soltrkVersion:normalizeSoltrkVersion(project?.soltrk_version),
      anemometer:getAnemometerSelection(project),
      soltrkByPv:equipmentAllocation.soltrkByPv,
      junctionBoxByPv:equipmentAllocation.junctionBoxByPv,
      plantByKey:equipmentAllocation.plantByKey,
    };

    for(const [calculatedItem,formula,keywords,categoryFallback,note,unit='pcs'] of BOM_DEFINITIONS){
      const quantitiesByPv={};
      selectedRows.forEach(scheduleRow=>{
        const pv=asInt(scheduleRow['PV Modules per Tracker']);
        quantitiesByPv[pv]=asNumber(quantitiesByPv[pv],0)+asNumber(formula(scheduleRow,bomContext),0);
      });
      const resolvedKeywords=typeof keywords==='function'?keywords(bomContext):keywords;
      const postKind=calculatedItem==='Drive Pile'?'Drive Pile':(calculatedItem==='Bearing Pile'?'Bearing Pile':'');
      const postSelection=postKind&&global.LumaPostConfiguration
        ? global.LumaPostConfiguration.selection(project,postKind)
        : null;
      const postResolution=postSelection
        ? global.LumaPostConfiguration.resolveResult(partMaster,postSelection)
        : null;
      const match=postResolution
        ? postResolution.part
        : findPartMasterMatch(partMaster,resolvedKeywords,calculatedItem,categoryFallback);
      if(!match){
        if(postResolution?.status==='ambiguous') errors.push(global.LumaPostConfiguration.ambiguityMessage());
        else if(postSelection) errors.push(global.LumaPostConfiguration.missingMessage(postSelection));
        continue; // The Part Master is authoritative; never invent or substitute a part.
      }
      if(note){
        const tagKey=normalizeText(match.TAG),partKey=normalizeText(match.Part);
        const displayNote=displayTerminology(note);
        if(tagKey) notesByTag[tagKey]=displayNote;
        if(partKey) notesByPart[partKey]=displayNote;
        const identityText=[calculatedItem,...resolvedKeywords].join(' ');
        for(const code of identityText.toLowerCase().match(/k\d{6}/g)||[]) notesByTag[normalizeText(code)]=displayNote;
        const calculatedPartKey=normalizeText(calculatedItem); if(calculatedPartKey && !notesByPart[calculatedPartKey]) notesByPart[calculatedPartKey]=displayNote;
      }
      const totalQty=Object.values(quantitiesByPv).reduce((sum,v)=>sum+asNumber(v,0),0);
      const normalizedCalculatedItem=normalizeText(calculatedItem);
      const matchTag=normalizeText(match.TAG);
      const plantItem=PLANT_ELECTRICAL_ITEMS.find(item=>
        matchTag===normalizeText(item.key==='anemometer'?bomContext.anemometer.tag:item.tag));
      const quantityOverrideKey=normalizedCalculatedItem==='soltrk'?'soltrk':(normalizedCalculatedItem==='junctionbox'?'junction_box':(plantItem?.key||''));
      if(totalQty<=0 && !quantityOverrideKey) continue;
      const row={};
      for(const column of baseColumns) row[column]=match[column] ?? '';
      if(Object.prototype.hasOwnProperty.call(row,'Part')){
        const readableFastenerName=recordIsFastener(match)?fastenerPartNameFromDescription(match.Description):null;
        row['Part Name']=readableFastenerName||row.Part;
      }
      selectedPvs.forEach(pv=>{
        const value=asNumber(quantitiesByPv[pv],0);
        row[`${pv}-PV Qty`]=value?niceNumber(value):'';
      });
      row['Total Qty']=niceNumber(totalQty);
      row['Calculation Note']=displayTerminology(note);
      applyBomMetadata(row,calculatedItem,match);
      if(quantityOverrideKey) row._quantity_override_key=quantityOverrideKey;
      rows.push(row);
    }

    const manualValues=project.manual_parts || {};
    const manualList=Array.isArray(manualValues)?manualValues:Object.values(manualValues);
    for(const values of manualList){
      if(!values || !values.include) continue;
      const qty=asNumber(values.qty,0); if(qty<=0) continue;
      const itemName=String(values.Item || values.item || '').trim() || String(values.Description || values.description || '').trim() || 'Manual Standard Part';
      const row={}; for(const column of baseColumns) row[column]='';
      if('Part' in row){row.Part=itemName;row['Part Name']=itemName;}
      if('TAG' in row) row.TAG=values.TAG ?? values.tag ?? '';
      if('Description' in row) row.Description=values.Description ?? values.description ?? '';
      if('Part Number' in row) row['Part Number']=values['Part Number'] ?? values.partNumber ?? '';
      if('Category' in row) row.Category=values.Category ?? values.category ?? '';
      if('Unit' in row) row.Unit=values.Unit ?? values.unit ?? '';
      qtyColumns.forEach(column=>row[column]='');
      row['Total Qty']=niceNumber(qty);
      row['Calculation Note']='Manual standard part entered by user';
      applyBomMetadata(row,itemName,values);
      rows.push(row);
    }
    rows.forEach((row,index)=>{
      row['No.']=index+1;
      if(contingencyEnabled){
        const isFastener=recordIsFastener(row);
        row['Contingency (%)']=isFastener?niceNumber(contingencyPercent):0;
        if(isFastener && contingencyPercent>0){
          const adjustedTotal=asNumber(row['Total Qty'],0)*(1+contingencyPercent/100);
          const floatingPointTolerance=Number.EPSILON*Math.max(1,Math.abs(adjustedTotal))*4;
          row['Total Qty']=Math.ceil(adjustedTotal-floatingPointTolerance);
        }
      }
      for(const column of columns){ if(row[column]===null||row[column]===undefined||row[column]==='') row[column]=['Material','Weight'].includes(column)?'':0; }
    });
    return {columns,previewColumns,rows,notesByTag,notesByPart,errors,valid:errors.length===0};
  }

  function buildPartMasterPreview(partMaster,bomResult){
    return partMaster.map((record,index)=>{
      const row={'No.':index+1,'Part Name':record.Part??'',TAG:record.TAG??'',Description:record.Description??'','Part Number':record['Part Number']??'',Category:record.Category??'',Unit:record.Unit??'',Material:record.Material??'',Weight:record.Weight??''};
      const tag=normalizeText(record.TAG),part=normalizeText(record.Part);
      row['Calculation Note']=displayTerminology(bomResult.notesByTag[tag] ?? bomResult.notesByPart[part] ?? record['Calculation Note'] ?? '');
      row._part_master_index=index;
      return row;
    });
  }

  function calculateProject(project,partMaster,partMasterColumns=PART_COLUMNS){
    const schedule=buildSchedule(project);
    const active=schedule.filter(row=>asInt(row['Number of Trackers'])>0);
    const bearing=buildBearingLayoutTable(active);
    const support=buildModuleSupportLayoutTable(active);
    const bom=buildProjectBom(project,active,partMaster,partMasterColumns);
    const partMasterPreview=buildPartMasterPreview(partMaster,bom);
    const totalTrackers=schedule.reduce((sum,r)=>sum+asInt(r['Number of Trackers']),0);
    const totalModules=schedule.reduce((sum,r)=>sum+asInt(r['PV Modules Total']),0);
    const totalPower=schedule.reduce((sum,r)=>sum+asNumber(r['Estimated Power (MWp)']),0);
    return {schedule,active,bearing,support,bom,partMasterPreview,engineeringErrors:bom.errors||[],kpis:{totalTrackers,totalModules,totalPower,bomItems:bom.rows.length,mode:getBomModeText(project)}};
  }

  global.LumaEngine={
    PART_COLUMNS,DEFAULT_INPUTS,BOM_DEFINITIONS,BOM_DEFAULT_METADATA,ANEMOMETER_ELEVATION_THRESHOLD_M,ANEMOMETER_OPTIONS,PLANT_ELECTRICAL_ITEMS,MODULE_RAIL_COMPATIBLE_LONGITUDINAL_DISTANCES_MM,HAT_RAIL_OVERLAP_MIN_CLEARANCE_MM,HAT_RAIL_BEARING_PILE_MIN_CLEARANCE_MM,
    normalizeText,displayTerminology,asNumber,asInt,niceNumber,firstNonEmpty,ceilHalf,ceilUp,
    fastenerPartNameFromDescription,normalizePartMasterData,defaultTrackerQuantities,defaultManualParts,defaultBearingRule,normalizeBearingRule,BEARING_RULE_MODES,normalizeBearingMode,bearingRuleVariantKey,normalizeBearingRuleVariants,
    getDesignInputs,calculateAutoPvModuleGap,moduleRailCompatibility,getAnemometerSelection,cadBlocksAreAvailable,getBomModeText,getSpanLimits,estimateSpanCountForLength,
    calculateTrackerGeometry,getBearingRuleVariantsForPv,getBearingRuleForPv,getPositionsFromRule,classifyBearing,classifyBeamZoneForPosition,calculateEstimatedBearingPositions,calculateBearingLayoutForTracker,
    generateModuleRailPositionsForSide,clearanceFromInterval,torqueTubeOverlapZonesForSide,calculateHatRailInstallationClearances,closestRailIndicesAroundPosition,calculateModuleSupportPlatesForTracker,buildSchedule,buildBearingLayoutTable,buildModuleSupportLayoutTable,
    recordIsFastener,itemIsFastener,recordIsValidForCalculatedItem,findPartMasterMatch,bomRowKey,normalizeSoltrkVersion,scheduleRowIdentity,torqueTubeJointCountForRow,equipmentQuantityAllocation,buildProjectBom,buildPartMasterPreview,calculateProject,
  };
})(globalThis);
