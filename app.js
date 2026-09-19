'use strict';

const E = LumaEngine;
const APP_NAME = 'LUMA BOM Manager';
const APP_VERSION = 'Version 4.00';
const APP_RELEASE_DATE = '17.09.2026';
const APP_AUTHOR = 'Behzad Eydiyoon';
const WORKSPACE_FORMAT_VERSION = '1.0';
const RECOVERY_KEY = 'luma_bom_manager_v3_43_browser_recovery';
const ACTIVE_TAB_KEY = 'luma_bom_manager_v3_43_active_tab';
const LEGACY_RECOVERY_KEYS = ['luma_bom_manager_v3_42_browser_recovery','luma_bom_manager_v3_41_browser_recovery','luma_bom_manager_v3_40_browser_recovery','luma_bom_manager_v3_30_browser_recovery','luma_bom_manager_v3_21_browser_recovery'];
const LEGACY_ACTIVE_TAB_KEYS = ['luma_bom_manager_v3_42_active_tab','luma_bom_manager_v3_41_active_tab','luma_bom_manager_v3_40_active_tab','luma_bom_manager_v3_30_active_tab','luma_bom_manager_v3_21_active_tab'];

const TABS = [
  ['Inputs','tabInputs'],
  ['Array Table','tabArray'],
  ['Selected Arrays','tabSelected'],
  ['Bearing Layout','tabBearing'],
  ['PV Module Support plate','tabSupport'],
  ['Project BOM','tabBom'],
  ['Tracker Sketch','tabSketch'],
  ['Analysis','tabAnalysis'],
  ['Quotation','tabQuotation'],
  // ['Calculation Logic','tabLogic'], // Hidden: Part Master Calculation Note is sufficient for now.
];
const ADMINISTRATION_TAB = ['Administration','tabAdministration'];
const SKETCH_MAGNIFICATION_LEVELS = Object.freeze([1.5,2,2.5,3,3.5,4]);

const ANALYSIS_CURRENCIES = LumaCurrencyData.OPTIONS;
const VAT_OPTIONS = Object.freeze([
  {value:0,label:'0%'},
  {value:0.10,label:'10%'},
  {value:0.22,label:'22%'},
]);

const DEFAULT_ITEM_UNIT_PRICES_EUR = Object.freeze({
  k001141:177.25,
  k001147:9.95,
  k081150:166.83,
  k030870:114.7,
  k031180:155.62,
  k001152:103.65,
  k050346:103.65, // Current Part Master equivalent of supplied k001152.
  k050376:112.64,
  k001120:33.61,
  k060326:33.61, // Current Part Master equivalent of supplied k001120.
  k060356:36.7,
  k001098:4.13,
  k001145:3.58,
  k001099:0.43,
  k001101:0.35,
  k001119:10.32,
  k001162:28.5,
  k001389:4,
  k001397:2.5,
  k001151:0.13693,
  k001576:0.232,
  k001235:0.01685,
  k001074:0.00957,
  k001113:0.02098,
  k001114:0.00406,
  k001388:0.3402,
  k001157:0.03336,
  k001013:0.02592,
  k001385:0.1474,
  k001166:0.0225,
  k001127:0.01976,
  k001125:0.12972,
  k001123:0.17,
  k001130:0.05456,
  k001124:0.0264,
  k001164:0.32051,
  k001154:0.03141,
  k001010:0.066,
  k001163:0.0378,
  k001238:0.35,
  k001239:0.068,
  k001230:0.0252,
  k001228:0.0527,
  k001231:0.35637,
  k001129:0.798,
  k001137:0.04672,
  k001144:183.26,
  k001116:9.75,
  k001135:10.2,
  k001136:10.38,
  k001549:330,
  k001568:6,
  k001511:2,
  k001509:0.01,
  k001510:0.01,
  k001402:0.01,
  k001401:0.01,
  k001503:1,
  k001502:0.00531,
  k001504:0.01,
  k001501:0.01,
  k001454:0.01,
  k001513:0.01,
  k001393:7,
  k001390:1.5,
  k001525:800,
  k001404:35,
  k001405:1906.84,
  k001406:1546.84,
  k001538:3.8,
  k001539:0.01,
  k001542:16.2715,
  k001536:184,
  k001596:58.4,
  k001552:10.55,
  k001479:0.72,
});

const SELECTED_ARRAY_COLUMNS = [
  'PV Modules per Tracker','Bearing Rule Mode','Number of Trackers','Tracker Type','Span Type','Bearing Rule Source','Modules / Side','PV Gaps / Side','Tracker Length (mm)','Calculated End Gap','First Piece Name','First Piece Length','Main Tube B Length','Main Tube C Required Length','Main Tube C Stock Suggestion','Bearing Posts / Tracker','Bearing 120 / Tracker','Bearing 110 / Tracker','Bearing 100 / Tracker','Module Support Plates / Tracker','Bearing Status'
];
const BEARING_COLUMNS = [
  'PV Modules per Tracker','Bearing Rule Mode','Number of Trackers','Bearing Rule Source','Span Type','Pair No.','Side','Gap from Previous (mm)','Distance from Main Post (mm)','Absolute Distance (mm)','Beam Zone','Bearing Type','Status','Total Bearing Qty'
];
const SUPPORT_DETAIL_COLUMNS = [
  'PV Modules per Tracker','Bearing Rule Mode','Number of Trackers','Side','Rail No.','Rail Type','Signed Distance from Mid Plane (mm)','Distance from Mid Plane (mm)','Beam Zone','Final Plates / Rail / Side','Total Plates','Influence Bearing','Influence Bearing Distance','Reason'
];
const PART_PREVIEW_COLUMNS = ['No.','Part Name','TAG','Description','Part Number','Category','Unit','Material','Weight','Calculation Note'];
const PART_EDITABLE_COLUMNS = new Set(['Part Name','TAG','Description','Part Number','Category','Material','Weight']);

const CHANGELOG = {
  '1.00': ['Initial Release'],
  '2.00': ['Excel reference dependency removed','Internal Part Master added','Editable Part Master fields added','Save, load, and reset Part Master lists added','Project BOM quantity columns added by selected array type','No. column added to Project BOM and Part Master','Empty Project BOM cells changed to 0','Last exported session loading added','Dynamic Tracker Sketch tab added','Manual Standard Parts section added','Calculation Logic tab improved for troubleshooting'],
  '2.10': ['BOM and related formulas updated','Changelog Button added'],
  '2.20': ['BOM and related formulas updated','Tracker Sketch updated'],
  '3.00': ['CAD Blocks Availability selector added','BOM based on CAD Block / estimation mode added','Max Span Length estimation logic added for 2-Span, 4-Span, 6-Span, and 8-Span trackers','Sidebar Mode text simplified to CAD Block / Estimation','Estimation mode now shows Symmetrical as fixed text instead of a mode dropdown','Main Tube C counting corrected for small trackers in estimation mode'],
  '3.10': [
    'Major project-management, calculation, BOM, export, and user-interface update','Multi-project workspace support added','New Project, Duplicate Project, Rename Project, and Delete Project functions added','Project Code added for easier project identification and exported file naming','Save Workspace, Save As, Open Workspace, and New Workspace functions added','Unsaved-change indication and automatic workspace recovery added','Keyboard shortcuts added for common project and workspace actions','Project Search added to search projects by Project Name or Project Code','Export All/Selected Projects added with one separate Excel workbook per project','High-resolution Tracker Sketch export added at 3600 × 2100 pixels and 300 DPI','CAD Block and Estimation calculation modes improved','2-Span, 4-Span, 6-Span, and 8-Span automatic estimation improved','Bearing-position and bearing-type calculations improved','PV Module Support Plate calculations improved','Odd and asymmetrical tracker calculations improved with separate North and South side handling','Main Tube C calculation, quantity, stock selection, and drawing corrected','Main Tube C calculations for small trackers corrected','Custom bearing-rule locking removed so bearing-distance rules remain directly editable','Confirmation added before deleting a custom bearing-distance rule','Deleted custom bearing rules automatically return to the default bearing rule','PV Module Gap lock kept as an independent control','k001127 quantity updated to 22 × Tracker','Junction Box quantity changed to floor(Tracker / 2)','Junction Box Holder k001511 changed to floor(Tracker / 2)','k001454 changed to 4 × floor(Tracker / 2)','k001509 changed to 4 × Tracker + 4 × floor(Tracker / 2)','Anemometer-related BOM quantities and per-array rounding improved','Safeguard and SCADA-related BOM calculations and rounding improved','Related electrical and fastener BOM calculations improved','Calculation Note column restored in the Part Master tab','Calculation Notes remain visible even when the current part quantity is zero','Project BOM kept clean without Calculation Note columns','Sidebar layout improved and unnecessary descriptive text removed','Outer sidebar scrolling removed and fixed compact sidebar layout added','Active Project KPI display improved','Export controls changed to compact Active Project and All Projects buttons','Changelog button changed to the same compact half-width layout','Project Search box improved with a magnifying-glass indicator','Notebook tabs changed so selection is indicated by color only without changing tab size or position','Overall button spacing, sidebar organization, and application appearance improved'
  ],
  '3.11': ['Added delete button to part master tab','Added optional fastener contingency percentage column to Project BOM'],
  '3.20': ['Added optional Weight, Material and Contingency columns' , 'Added PV module longitudinal holes distance in input tab','Added a dropdown to select SOLTRK version','Modified the SOLTRK and Junction Box rows to allow manual editing.'
  ],
  '3.30': ['Added Analysis tab with steel-structure weight, material filtering, per-material price registration, multi-currency costs, and kg/kW','Temporarily changed k001099 calculation to Hat rail + Z rail','Updated k001509 to include 4 × Junction Box Holder Plate for both SOLTRK versions','Updated k001503 to DIN 976-1 - M6 × 1000 and ceil(previous result / 5)','Updated k001513 to include 4 × SOLTRK 3.0 Holder Plate in SOLTRK 3.0 mode','Added version-specific SOLTRK and Holder items: 2.0 uses k001534/k001505; 3.0 uses k001549/k001568'],
  '3.40': ['Added the workspace name display and compact New, Open, Rename, and Save icon toolbar','Replaced Workspace Save As with Rename and made Sample the default workspace name','Added destination selection for workspace, Excel, Part Master, and tracker-sketch saves when supported by the browser','Redesigned Analysis as a home page with six destination pages and icon Back navigation','Added persistent unit-price registers for Electrical, Major Components, and Fasteners','Added eight installation-section fastener packages with quantity per package and required quantity','Added separate persistent Material Mode and Part Mode pricing to Steel Structure Cost','Made the Analysis home and Total Project Cost follow the selected steel pricing mode and report missing steel material or weight data','Added editable Material and Weight columns to Part Master and made them read-only in Project BOM','Changed Part Master Save to one filename-and-location dialog with Active Project Name + Part Master as the default filename','Kept inline table editors active when repositioning the caret with the mouse','Added a responsive phone and tablet layout with a collapsible menu, scrollable tabs, stacked forms, touch-sized controls, mobile dialogs, and local table scrolling','Aligned the PV Module Gap input and lock button with the standard input column','Changed k001539 to Anemometer Bracket × 3'],
  '3.41': ['Added Plant Elevation ASL input in meters with the selected anemometer shown beside it','Automatically selects k001536 at 400 m ASL or higher and k001596 below 400 m ASL','Added the normal-weather anemometer to the Part Master and both anemometer prices in EUR','Added elevation and selected-anemometer information to Excel exports'],
  '3.42': ['Added the supplied EUR unit costs as editable default prices throughout Analysis','Displayed default prices in gray and kept user-entered overrides in the standard text color','Made deleting a user override restore its default price','Mapped the supplied legacy main-post and bearing-post price tags to their current Part Master equivalents'],
  '3.43': ['Added a toggleable magnifying lens to Tracker Sketch','Added selectable 1.5×, 2×, 2.5×, 3×, 3.5×, and 4× magnification','Kept vector labels and dimensions sharp inside the magnifier'],
  '4.00': [
    'Added Supabase sign-in, invitation account setup, password recovery and change, session restoration, hCaptcha protection, and user profiles',
    'Added database-enforced user and admin roles with an Administration area for suppliers, supplier price lists, Part Master, logistics, personnel costs, and overhead',
    'Expanded Analysis with supplier-based pricing, logistics, personnel and overhead costs, PV module procurement selection, and final pricing with contingency, margin, and VAT',
    'Connected Quotation fields to the LaTeX template and added PDF generation with progress feedback and save-location selection',
    'Improved Project BOM controls for SOLTRK versions and editable equipment quantities, including plant-wide electrical quantities and SOLTRK 3.0 plates',
    'Updated torque-tube joint fastener calculations and Tube Spacer k001479 to 2 × k001388 in the Fasteners category',
    'Improved Analysis and Part Master tables and added complete cell borders and category-colored rows to the exported Project BOM'
  ]
};
const CHANGELOG_DATES = {'1.00':'26.05.2026','2.00':'08.06.2026','2.10':'16.06.2026','2.20':'17.06.2026','3.00':'08.07.2026','3.10':'22.07.2026','3.11':'27.07.2026','3.20':'18.08.2026','3.30':'19.08.2026','3.40':'20.08.2026','3.41':'24.08.2026','3.42':'25.08.2026','3.43':'25.08.2026','4.00':'17.09.2026'};
const USER_MANUAL_URL = 'https://ksisolar.sharepoint.com/:b:/s/Engineering/IQA8CGStyAACQ7K8hFJe4jJ6Ad-f3cKvwnyZnM2lhb7yq0I?e=L8zsa5';

let workspace = null;
let current = null;
let partMaster = [];
let partMasterColumns = [...PART_MASTER_COLUMNS];
let partMasterLoadError = '';
let partMasterLoading = false;
let workspaceStructureDirty = false;
let selectedBomRows = new Set();
let customRuleSelectedKey = null;
let uiState = {
  customRule:{pv:'14',mode:'Symmetrical',quantity:'0',symmetrical_distance:'8320',semi_pair_count:3,asym_post_count:3,semi_pair_gaps:['8320','7350','6500','',''],asym_north_gaps:['8320','7350','6500','',''],asym_south_gaps:['8320','7350','6500','','']},
  projectBomSearch:'',partMasterSearch:'',analysisPage:'home',analysisPriceEditor:{},analysisItemPriceEditor:{},showPv:true,showSupport:true,showRails:true,showBeams:true,sketchMagnifierEnabled:false,sketchMagnification:2,
};
let fixedScrollTarget = null;
let fixedScrollSyncing = false;
let mobileMenuPreviousFocus = null;
let manualPartCounter = 2;
let sketchMagnifierPointer = null;

function uuid(){
  if(globalThis.crypto?.randomUUID) return crypto.randomUUID().replaceAll('-','');
  return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2);
}
function clone(value){ return structuredClone(value); }
function escapeHtml(value){ return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function safeFilename(value){ return String(value||'LUMA_BOM').trim().replace(/[\\/:*?"<>|]/g,'_') || 'LUMA_BOM'; }
function formatDateTime(date=new Date()){
  const p=n=>String(n).padStart(2,'0');
  return `${p(date.getDate())}.${p(date.getMonth()+1)}.${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
function storageGet(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key,value){try{localStorage.setItem(key,value);return true;}catch{return false;}}
function storageRemove(key){try{localStorage.removeItem(key);}catch{}}
function firstStorageEntry(keys){for(const key of keys){const value=storageGet(key);if(value!==null)return {key,value};}return null;}
function mobileNavigationEnabled(){return typeof window.matchMedia==='function'&&window.matchMedia('(max-width: 1024px)').matches;}
function setMobileNavigationOpen(open,restoreFocus=true){
  const sidebar=document.getElementById('appSidebar'),scrim=document.getElementById('sidebarScrim'),toggle=document.getElementById('mobileMenuBtn'),main=document.getElementById('mainContent');if(!sidebar||!scrim||!toggle||!main)return;
  const wasOpen=document.body.classList.contains('mobile-nav-open'),shouldOpen=!!open&&mobileNavigationEnabled();if(shouldOpen&&!wasOpen)mobileMenuPreviousFocus=document.activeElement;
  document.body.classList.toggle('mobile-nav-open',shouldOpen);scrim.hidden=!shouldOpen;toggle.setAttribute('aria-expanded',String(shouldOpen));toggle.setAttribute('aria-label',shouldOpen?'Close menu':'Open menu');
  if(mobileNavigationEnabled()){sidebar.setAttribute('aria-hidden',String(!shouldOpen));sidebar.inert=!shouldOpen;main.inert=shouldOpen;}else{sidebar.removeAttribute('aria-hidden');sidebar.inert=false;main.inert=false;}
  if(shouldOpen)requestAnimationFrame(()=>document.getElementById('mobileMenuCloseBtn')?.focus());else if(restoreFocus&&mobileMenuPreviousFocus instanceof HTMLElement&&mobileNavigationEnabled())mobileMenuPreviousFocus.focus();
}
function syncMobileNavigation(){
  if(mobileNavigationEnabled())setMobileNavigationOpen(document.body.classList.contains('mobile-nav-open'),false);else setMobileNavigationOpen(false,false);
}
function handleMobileNavigationKeydown(event){
  if(!document.body.classList.contains('mobile-nav-open'))return;
  if(event.key==='Escape'){event.preventDefault();setMobileNavigationOpen(false);return;}
  if(event.key!=='Tab')return;
  const sidebar=document.getElementById('appSidebar'),focusable=[...sidebar.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(element=>element.getClientRects().length);
  if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function showToast(message,duration=2200){
  document.querySelector('.toast')?.remove();
  const toast=document.createElement('div');toast.className='toast';toast.textContent=message;document.body.append(toast);setTimeout(()=>toast.remove(),duration);
}
function setPartMasterStatus(message='',kind=''){
  const status=document.getElementById('partMasterStatus');if(!status)return;
  status.textContent=message;status.className=`part-master-status ${kind}`.trim();status.hidden=!message;
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function chooseSaveLocation(filename,description,accept){
  if(typeof window.showSaveFilePicker==='function'){
    try{
      const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description,accept}]});
      return {handle,picker:true,cancelled:false};
    }catch(err){
      if(err?.name==='AbortError')return {handle:null,picker:true,cancelled:true};
      console.warn('The location picker is unavailable; using the browser download instead.',err);
    }
  }
  return {handle:null,picker:false,cancelled:false};
}
async function writeBlobToSaveLocation(blob,filename,location){
  if(location?.cancelled)return {saved:false,cancelled:true,picker:!!location.picker};
  if(location?.handle){
    try{const writable=await location.handle.createWritable();await writable.write(blob);await writable.close();return {saved:true,picker:true};}
    catch(err){console.warn('The selected file could not be written; using the browser download instead.',err);}
  }
  downloadBlob(blob,filename);return {saved:true,picker:false};
}
async function saveBlobWithLocation(blob,filename,description,accept){
  const location=await chooseSaveLocation(filename,description,accept);return writeBlobToSaveLocation(blob,filename,location);
}
async function saveBlobToDirectory(blob,filename,directoryHandle){
  const handle=await directoryHandle.getFileHandle(filename,{create:true});const writable=await handle.createWritable();await writable.write(blob);await writable.close();
}
function getActiveProject(){ return workspace?.projects?.[workspace.active_project_id] || null; }
function isAnalysisCurrency(value){return LumaCurrencyData.CODES.includes(value);}
function normalizeAnalysisMaterialPrices(raw){
  const normalized={};
  for(const [key,value] of Object.entries(raw&&typeof raw==='object'?raw:{})){
    const record=value&&typeof value==='object'?value:{};
    const material=String(record.material??key).trim();
    const price=Number(record.price_per_kg??record.price);
    if(!material||!Number.isFinite(price)||price<0)continue;
    normalized[material]={material,price_per_kg:price,currency:isAnalysisCurrency(record.currency)?record.currency:'USD'};
  }
  return normalized;
}
function normalizeAnalysisItemPrices(raw){
  const normalized={};
  for(const [key,value] of Object.entries(raw&&typeof raw==='object'?raw:{})){
    const record=value&&typeof value==='object'?value:{};const price=Number(record.price_per_unit??record.price);if(!key||!Number.isFinite(price)||price<0)continue;
    normalized[String(key)]={price_per_unit:price,currency:isAnalysisCurrency(record.currency)?record.currency:'USD'};
  }
  return normalized;
}
function defaultAnalysisItemPrice(row){
  const tag=E.normalizeText(row?.TAG),price=DEFAULT_ITEM_UNIT_PRICES_EUR[tag];
  return Number.isFinite(price)?{price_per_unit:price,currency:'EUR'}:null;
}
function normalizeSteelPricingMode(value){return value==='part'?'part':'material';}
function normalizeVatRate(value){return window.LumaCommercialCostCalculator.normalizeVatRate(value);}
function normalizeCommercialContingencyPercent(value){return window.LumaCommercialCostCalculator.normalizeProjectPercentage(value,5);}
function normalizePenaltyPercent(value){return window.LumaCommercialCostCalculator.normalizeProjectPercentage(value,'');}
function normalizeMarginPercent(value){return window.LumaCommercialCostCalculator.normalizeProjectPercentage(value,'');}
function normalizePersonnelYearlyTarget(value){if(value===undefined||value===null)return window.LumaPersonnelCostCalculator.DEFAULT_YEARLY_TARGET_MW;if(String(value).trim()==='')return '';const number=Number(value);return Number.isFinite(number)?number:'';}
function isPvModuleIncluded(project=getActiveProject()){return project?.analysis_pv_module_included===true;}
function isAnalysisSectionIncluded(page,project=getActiveProject()){return page!=='pv_module'||isPvModuleIncluded(project);}
function normalizeAnalysisSupplierSelections(value){
  const source=value&&typeof value==='object'?value:{};
  const legacyElectrical=String(source.electrical||'');
  return {posts:String(source.posts||''),substructure:String(source.substructure||source.steel||''),bearing:String(source.bearing||''),slew_drive:String(source.slew_drive||''),pv_module:String(source.pv_module||''),limit_switch:String(source.limit_switch||legacyElectrical),soltrk:String(source.soltrk||legacyElectrical),junction_box:String(source.junction_box||legacyElectrical),cable_gland:String(source.cable_gland||legacyElectrical),safeguard:String(source.safeguard||legacyElectrical),anemometer:String(source.anemometer||legacyElectrical),power_supply:String(source.power_supply||legacyElectrical),electrical_enclosure:String(source.electrical_enclosure||legacyElectrical),fasteners:String(source.fasteners||'')};
}
function makeProject(name='Sample Project',code='SAMPLE'){
  return {
    project_id:uuid(),project_name:name,project_code:code,
    inputs:clone(E.DEFAULT_INPUTS),tracker_quantities:E.defaultTrackerQuantities(),bearing_rules:{},manual_parts:E.defaultManualParts(),
    contingency_enabled:false,fastener_contingency_percent:0,bom_metadata_enabled:true,soltrk_version:'2.0',bom_overrides:{},equipment_quantity_overrides:{},
    analysis_material_filter:'ALL',analysis_material_prices:{},analysis_item_prices:{},default_item_prices_initialized:true,analysis_steel_pricing_mode:'material',analysis_steel_part_prices:{},analysis_supplier_selections:normalizeAnalysisSupplierSelections(),analysis_pv_module_included:false,personnel_yearly_target_mw:window.LumaPersonnelCostCalculator.DEFAULT_YEARLY_TARGET_MW,commercial_contingency_percent:5,penalty_percent:'',margin_percent:'',vat_rate:0,quotation:window.LumaQuotation?.normalize?.()||{},
    selected_logic_pv:'',selected_sketch_pv:'',is_dirty:false,
  };
}
function makeDefaultWorkspace(){
  const project=makeProject('Sample Project','SAMPLE');
  return {format_version:WORKSPACE_FORMAT_VERSION,workspace_name:'Sample',active_project_id:project.project_id,projects:{[project.project_id]:project}};
}
function serializeWorkspace(){
  const projects={};
  for(const [id,p] of Object.entries(workspace.projects)){
    projects[id]={project_id:p.project_id,project_name:p.project_name,project_code:p.project_code,inputs:clone(p.inputs),tracker_quantities:clone(p.tracker_quantities),bearing_rules:clone(p.bearing_rules),manual_parts:clone(p.manual_parts),contingency_enabled:p.contingency_enabled===true,fastener_contingency_percent:Math.min(100,Math.max(0,E.asNumber(p.fastener_contingency_percent,0))),bom_metadata_enabled:p.bom_metadata_enabled!==false,soltrk_version:E.normalizeSoltrkVersion(p.soltrk_version),bom_overrides:clone(p.bom_overrides||{}),equipment_quantity_overrides:clone(p.equipment_quantity_overrides||{}),analysis_material_filter:p.analysis_material_filter||'ALL',analysis_material_prices:clone(p.analysis_material_prices||{}),analysis_item_prices:clone(p.analysis_item_prices||{}),default_item_prices_initialized:p.default_item_prices_initialized===true,analysis_steel_pricing_mode:normalizeSteelPricingMode(p.analysis_steel_pricing_mode),analysis_steel_part_prices:clone(p.analysis_steel_part_prices||{}),analysis_supplier_selections:normalizeAnalysisSupplierSelections(p.analysis_supplier_selections),analysis_pv_module_included:isPvModuleIncluded(p),personnel_yearly_target_mw:normalizePersonnelYearlyTarget(p.personnel_yearly_target_mw),commercial_contingency_percent:normalizeCommercialContingencyPercent(p.commercial_contingency_percent),penalty_percent:normalizePenaltyPercent(p.penalty_percent),margin_percent:normalizeMarginPercent(p.margin_percent),vat_rate:normalizeVatRate(p.vat_rate),quotation:clone(p.quotation||{}),selected_logic_pv:p.selected_logic_pv||'',selected_sketch_pv:p.selected_sketch_pv||''};
  }
  return {format_version:WORKSPACE_FORMAT_VERSION,workspace_name:workspace.workspace_name,active_project_id:workspace.active_project_id,projects,saved_at:formatDateTime(),application_version:APP_VERSION};
}
function bearingConfigurationSelectionKey(pv,mode){return `${Number(pv)}|${E.bearingRuleVariantKey(mode)}`;}
function parseBearingConfigurationSelectionKey(value){const [pv,key]=String(value||'').split('|');return {pv:Number(pv),key};}
function bearingRuleStoreFromVariants(variants){
  return Object.fromEntries(variants.map(variant=>{const {key,...record}=variant;return [key,record];}));
}
function updateTrackerQuantityFromBearingRules(project,pv){
  const variants=E.getBearingRuleVariantsForPv(project,pv);
  project.tracker_quantities[String(pv)]=variants.reduce((sum,variant)=>sum+Math.max(0,E.asInt(variant.quantity,0)),0);
}
function normalizeProjectBearingRules(rawRules,trackerQuantities){
  const rules={};
  for(const [pv,value] of Object.entries(rawRules||{})){
    const variants=E.normalizeBearingRuleVariants(value,trackerQuantities[String(pv)]??0);
    if(!variants.length)continue;
    rules[String(pv)]=bearingRuleStoreFromVariants(variants);
    trackerQuantities[String(pv)]=variants.reduce((sum,variant)=>sum+Math.max(0,E.asInt(variant.quantity,0)),0);
  }
  return rules;
}
function normalizeProject(raw,id){
  const p=makeProject(String(raw?.project_name||'Untitled Project'),String(raw?.project_code||raw?.inputs?.project_code||''));
  p.project_id=String(raw?.project_id||id||uuid());
  const rawInputs=raw?.inputs||{};p.inputs={...clone(E.DEFAULT_INPUTS),...rawInputs}; delete p.inputs.project_code;
  p.inputs.drive_pile_depth_mm=String(rawInputs.drive_pile_depth_mm??rawInputs.foundation_depth_mm??E.DEFAULT_INPUTS.drive_pile_depth_mm);
  p.inputs.bearing_pile_depth_mm=String(rawInputs.bearing_pile_depth_mm??rawInputs.foundation_depth_mm??E.DEFAULT_INPUTS.bearing_pile_depth_mm);
  delete p.inputs.foundation_depth_mm;
  if(!raw?.inputs?.foundation_method)p.inputs.foundation_method=String(raw?.inputs?.foundation_type||'Ramming')==='Ramming'?'Ramming':'Foundation';
  p.inputs.foundation_type=p.inputs.foundation_method;
  const legacyDestination=String(rawInputs.destination_country??rawInputs.project_country??'').trim();
  p.inputs.project_country_type=rawInputs.project_country_type||((legacyDestination&&globalThis.LumaCountryData.canonicalEuropeanCountry(legacyDestination)!=='Italy')?'Other European Country':'Italy');
  if(p.inputs.project_country_type==='Italy'){p.inputs.project_country='Italy';p.inputs.destination_country='Italy';}
  else{const canonicalDestination=globalThis.LumaCountryData.canonicalEuropeanCountry(legacyDestination);p.inputs.destination_country=canonicalDestination||legacyDestination;p.inputs.project_country=p.inputs.destination_country;}
  p.inputs.delivery_point=rawInputs.delivery_point==='Warehouse'?'Warehouse':'Site';
  p.tracker_quantities={...E.defaultTrackerQuantities(),...(raw?.tracker_quantities||{})};
  p.bearing_rules=normalizeProjectBearingRules(raw?.bearing_rules,p.tracker_quantities);p.manual_parts=clone(raw?.manual_parts||E.defaultManualParts());
  p.contingency_enabled=raw?.contingency_enabled===true;
  p.fastener_contingency_percent=Math.min(100,Math.max(0,E.asNumber(raw?.fastener_contingency_percent,0)));
  p.bom_metadata_enabled=raw?.bom_metadata_enabled!==false;
  p.soltrk_version=E.normalizeSoltrkVersion(raw?.soltrk_version);p.bom_overrides=clone(raw?.bom_overrides||{});p.equipment_quantity_overrides=clone(raw?.equipment_quantity_overrides||{});
  p.analysis_material_filter=String(raw?.analysis_material_filter||'ALL');p.analysis_material_prices=normalizeAnalysisMaterialPrices(raw?.analysis_material_prices);
  const savedItemPrices=normalizeAnalysisItemPrices(raw?.analysis_item_prices),needsDefaultPriceMigration=raw?.default_item_prices_initialized!==true;
  if(needsDefaultPriceMigration){
    for(const item of Object.values(E.ANEMOMETER_OPTIONS)){
      const key=`tag:${E.normalizeText(item.tag)}`,saved=savedItemPrices[key];
      if(saved&&saved.currency===item.currency&&saved.price_per_unit===item.price)delete savedItemPrices[key];
    }
  }
  p.analysis_item_prices=savedItemPrices;p.default_item_prices_initialized=true;p._default_item_price_migrated=needsDefaultPriceMigration;
  p.analysis_steel_pricing_mode=normalizeSteelPricingMode(raw?.analysis_steel_pricing_mode);p.analysis_steel_part_prices=normalizeAnalysisItemPrices(raw?.analysis_steel_part_prices);p.analysis_supplier_selections=normalizeAnalysisSupplierSelections(raw?.analysis_supplier_selections);p.analysis_pv_module_included=raw?.analysis_pv_module_included===true;p.personnel_yearly_target_mw=normalizePersonnelYearlyTarget(raw?.personnel_yearly_target_mw);p.commercial_contingency_percent=normalizeCommercialContingencyPercent(raw?.commercial_contingency_percent);p.penalty_percent=normalizePenaltyPercent(raw?.penalty_percent);p.margin_percent=normalizeMarginPercent(raw?.margin_percent);p.vat_rate=normalizeVatRate(raw?.vat_rate);
  p.quotation=window.LumaQuotation?.normalize?.(raw?.quotation)||clone(raw?.quotation||{});
  const legacyPrice=Number(raw?.analysis_price_per_kg);if(!Object.keys(p.analysis_material_prices).length&&p.analysis_material_filter!=='ALL'&&Number.isFinite(legacyPrice)&&legacyPrice>0)p.analysis_material_prices[p.analysis_material_filter]={material:p.analysis_material_filter,price_per_kg:legacyPrice,currency:isAnalysisCurrency(raw?.analysis_currency)?raw.analysis_currency:'USD'};
  p.selected_logic_pv=String(raw?.selected_logic_pv||'');p.selected_sketch_pv=String(raw?.selected_sketch_pv||'');p.is_dirty=false;
  return p;
}
function loadWorkspacePayload(raw,recovery=false){
  if(!raw || typeof raw!=='object' || !raw.projects || typeof raw.projects!=='object' || !Object.keys(raw.projects).length) throw new Error('The workspace does not contain any projects.');
  const projects={};for(const [id,r] of Object.entries(raw.projects)){const p=normalizeProject(r,id);projects[p.project_id]=p;}
  let active=String(raw.active_project_id||'');if(!projects[active]) active=Object.keys(projects)[0];
  // Legacy workspace Part Master payloads are intentionally ignored. Supabase
  // is the sole authoritative source for engineering master data.
  workspace={format_version:String(raw.format_version||WORKSPACE_FORMAT_VERSION),workspace_name:String(raw.workspace_name||'Sample'),active_project_id:active,projects};
  partMasterColumns=[...PART_MASTER_COLUMNS];workspaceStructureDirty=!!recovery;Object.values(workspace.projects).forEach(p=>p.is_dirty=!!recovery||p._default_item_price_migrated===true);selectedBomRows.clear();
  manualPartCounter=Math.max(2,...Object.keys(projects).flatMap(()=>[]));
  recalculate();renderAll(true);saveRecovery();
}
function markDirty(structure=false){
  const p=getActiveProject();if(p) p.is_dirty=true;if(structure) workspaceStructureDirty=true;saveRecovery();refreshProjectList();
}
function clearDirtyFlags(){Object.values(workspace.projects).forEach(p=>p.is_dirty=false);workspaceStructureDirty=false;refreshProjectList();saveRecovery();}
function saveRecovery(){
  if(!workspace)return;const dirty=workspaceStructureDirty||Object.values(workspace.projects||{}).some(p=>p.is_dirty);if(!dirty){storageRemove(RECOVERY_KEY);return;}storageSet(RECOVERY_KEY,JSON.stringify(serializeWorkspace()));
}
function ensureAutoPvGap(){
  const p=getActiveProject();if(!p) return;
  if(p.inputs.pv_gap_locked){p.inputs.pv_module_gap=String(E.niceNumber(E.calculateAutoPvModuleGap(p)));}
}
function recalculate(){
  const p=getActiveProject();if(!p){current=null;return;}
  ensureAutoPvGap();current=E.calculateProject(p,partMaster,partMasterColumns);
}

function closeModal(){
  document.getElementById('modalBackdrop').hidden=true;
  document.getElementById('modalBody').innerHTML='';
  document.getElementById('modalActions').innerHTML='';
}
function openModal(title,html,buttons=[]){
  if(document.body.classList.contains('mobile-nav-open'))setMobileNavigationOpen(false);
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=html;
  const actions=document.getElementById('modalActions');actions.innerHTML='';
  for(const button of buttons){
    const el=document.createElement('button');el.textContent=button.text;
    if(button.className) el.className=button.className;
    el.addEventListener('click',()=>button.onClick?.(el));actions.appendChild(el);
  }
  document.getElementById('modalBackdrop').hidden=false;
}
function formRowHtml(label,id,value='',type='text'){
  return `<div class="modal-form-row"><label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="${type}" value="${escapeHtml(value)}"></div>`;
}
function projectCodeExists(code,exceptId=''){
  const target=String(code||'').trim().toLowerCase();
  return Object.values(workspace.projects).some(p=>p.project_id!==exceptId && String(p.project_code||'').trim().toLowerCase()===target);
}
function refreshProjectList(){
  const list=document.getElementById('projectList');if(!list||!workspace)return;
  const query=String(document.getElementById('projectSearch')?.value||'').trim().toLowerCase();
  const selected=workspace.active_project_id;list.innerHTML='';
  for(const p of Object.values(workspace.projects)){
    const search=`${p.project_code} ${p.project_name}`.toLowerCase();if(query && !search.includes(query))continue;
    const opt=document.createElement('option');opt.value=p.project_id;
    opt.textContent=`${p.project_code || '(No Code)'} | ${p.project_name}${p.is_dirty?' *':''}`;
    if(p.project_id===selected)opt.selected=true;list.appendChild(opt);
  }
}
function updateWorkspaceName(){
  const label=document.getElementById('workspaceName');if(!label||!workspace)return;const name=String(workspace.workspace_name||'Sample');label.textContent=name;label.title=name;
}
function updateHeaderAndKpis(){
  const p=getActiveProject();if(!p||!current)return;
  document.getElementById('currentProjectHeader').textContent=`Current Project: ${p.project_code || '(No Code)'} — ${p.project_name}`;
  document.getElementById('kpiTrackers').textContent=Number(current.kpis.totalTrackers).toLocaleString();
  document.getElementById('kpiModules').textContent=Number(current.kpis.totalModules).toLocaleString();
  document.getElementById('kpiPower').textContent=`${Number(current.kpis.totalPower).toLocaleString(undefined,{minimumFractionDigits:3,maximumFractionDigits:3})} MWp`;
  document.getElementById('kpiBomItems').textContent=Number(current.kpis.bomItems).toLocaleString();
  document.getElementById('kpiMode').textContent=current.kpis.mode;
}
function newWorkspace(){
  openModal('New Workspace',
    formRowHtml('Workspace Name','newWorkspaceName','Sample')+
    formRowHtml('First Project Name','newWorkspaceProjectName','Sample Project')+
    formRowHtml('Project Code','newWorkspaceProjectCode','PROJECT-001'),[
      {text:'Cancel',onClick:closeModal},
      {text:'Create',onClick:()=>{
        const wsName=document.getElementById('newWorkspaceName').value.trim()||'Sample';
        const name=document.getElementById('newWorkspaceProjectName').value.trim()||'Sample Project';
        const code=document.getElementById('newWorkspaceProjectCode').value.trim()||'PROJECT-001';
        const p=makeProject(name,code);workspace={format_version:WORKSPACE_FORMAT_VERSION,workspace_name:wsName,active_project_id:p.project_id,projects:{[p.project_id]:p}};
        partMasterColumns=[...PART_MASTER_COLUMNS];workspaceStructureDirty=true;selectedBomRows.clear();customRuleSelectedKey=null;closeModal();renderAll(true);markDirty(true);
      }}
    ]);
}
function openWorkspace(){document.getElementById('workspaceFileInput').click();}
function renameWorkspace(){
  openModal('Rename Workspace',formRowHtml('Workspace Name','renameWorkspaceName',workspace.workspace_name||'Sample'),[
    {text:'Cancel',onClick:closeModal},
    {text:'Rename',onClick:()=>{const name=document.getElementById('renameWorkspaceName').value.trim();if(!name){showToast('Enter a workspace name.');return;}workspace.workspace_name=name;workspaceStructureDirty=true;updateWorkspaceName();saveRecovery();closeModal();showToast('Workspace renamed.');}}
  ]);
}
async function saveWorkspace(){
  const filename=`${safeFilename(workspace.workspace_name)}.luma`;const payload=serializeWorkspace();const result=await saveBlobWithLocation(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),filename,'LUMA workspace',{'application/json':['.luma']});
  if(!result.saved)return;clearDirtyFlags();showToast(result.picker?'Workspace saved.':'Workspace downloaded.');
}
function nextProjectNumber(){
  let n=1;const codes=new Set(Object.values(workspace.projects).map(p=>String(p.project_code||'').toUpperCase()));while(codes.has(`PROJECT-${String(n).padStart(3,'0')}`))n++;return n;
}
function newProject(){
  const n=nextProjectNumber();openModal('New Project',formRowHtml('Project Name','newProjectName',`Untitled Project ${n}`)+formRowHtml('Project Code','newProjectCode',`PROJECT-${String(n).padStart(3,'0')}`),[
    {text:'Cancel',onClick:closeModal},{text:'Create',onClick:()=>{
      const name=document.getElementById('newProjectName').value.trim()||`Untitled Project ${n}`;const code=document.getElementById('newProjectCode').value.trim();
      if(!code){showToast('Project Code is required.');return;}if(projectCodeExists(code)){showToast('Project Code must be unique.');return;}
      const p=makeProject(name,code);p.is_dirty=true;workspace.projects[p.project_id]=p;workspace.active_project_id=p.project_id;workspaceStructureDirty=true;selectedBomRows.clear();document.getElementById('projectSearch').value='';closeModal();renderAll(true);saveRecovery();
    }}]);
}
function duplicateProject(){
  const source=getActiveProject();if(!source)return;
  let name=`${source.project_name} - Copy`;let base=`${source.project_code || 'PROJECT'}-COPY`;let code=base,n=2;while(projectCodeExists(code)){code=`${base}-${n++}`;}
  const copy=clone(source);copy.project_id=uuid();copy.project_name=name;copy.project_code=code;copy.is_dirty=true;workspace.projects[copy.project_id]=copy;workspace.active_project_id=copy.project_id;workspaceStructureDirty=true;selectedBomRows.clear();document.getElementById('projectSearch').value='';renderAll(true);saveRecovery();
}
function renameProject(){
  const p=getActiveProject();if(!p)return;
  openModal('Rename Project',formRowHtml('Project Name','renameProjectName',p.project_name),[
    {text:'Cancel',onClick:closeModal},{text:'Rename',onClick:()=>{const v=document.getElementById('renameProjectName').value.trim();if(!v)return;p.project_name=v;p.is_dirty=true;workspaceStructureDirty=true;closeModal();renderAll(true);saveRecovery();}}
  ]);
}
function deleteProject(){
  const ids=Object.keys(workspace.projects);if(ids.length<=1){showToast('The workspace must contain at least one project.');return;}
  const p=getActiveProject();if(!p)return;if(!confirm(`Delete project "${p.project_name}"?\n\nThis action cannot be undone after saving.`))return;
  delete workspace.projects[p.project_id];workspace.active_project_id=Object.keys(workspace.projects)[0];workspaceStructureDirty=true;selectedBomRows.clear();document.getElementById('projectSearch').value='';renderAll(true);saveRecovery();
}
function selectProject(projectId){
  if(!workspace.projects[projectId])return;workspace.active_project_id=projectId;selectedBomRows.clear();customRuleSelectedKey=null;
  const q=document.getElementById('projectSearch').value.trim().toLowerCase();const p=getActiveProject();if(q&&!`${p.project_code} ${p.project_name}`.toLowerCase().includes(q))document.getElementById('projectSearch').value='';renderAll(true);saveRecovery();
}
function resetCurrentProject(){
  const p=getActiveProject();if(!p)return;
  if(!confirm('Reset all inputs, tracker quantities, bearing rules, and manual parts for the current project?\n\nThis action cannot be undone after saving.'))return;
  p.inputs=clone(E.DEFAULT_INPUTS);p.tracker_quantities=E.defaultTrackerQuantities();p.bearing_rules={};p.manual_parts=E.defaultManualParts();p.contingency_enabled=false;p.fastener_contingency_percent=0;p.bom_metadata_enabled=true;p.soltrk_version='2.0';p.bom_overrides={};p.equipment_quantity_overrides={};p.analysis_material_filter='ALL';p.analysis_material_prices={};p.analysis_item_prices={};p.default_item_prices_initialized=true;p.analysis_steel_pricing_mode='material';p.analysis_steel_part_prices={};p.analysis_supplier_selections=normalizeAnalysisSupplierSelections();p.analysis_pv_module_included=false;p.personnel_yearly_target_mw=window.LumaPersonnelCostCalculator.DEFAULT_YEARLY_TARGET_MW;p.commercial_contingency_percent=5;p.penalty_percent='';p.margin_percent='';p.vat_rate=0;p.quotation=window.LumaQuotation?.normalize?.()||{};p.selected_logic_pv='';p.selected_sketch_pv='';p.is_dirty=true;selectedBomRows.clear();customRuleSelectedKey=null;uiState.analysisPage='home';uiState.customRule={pv:'14',mode:'Symmetrical',quantity:'0',symmetrical_distance:'8320',semi_pair_count:3,asym_post_count:3,semi_pair_gaps:['8320','7350','6500','',''],asym_north_gaps:['8320','7350','6500','',''],asym_south_gaps:['8320','7350','6500','','']};renderAll(true);saveRecovery();
}
function renderTabs(){
  const tabs=document.getElementById('tabs'),visibleTabs=window.LumaAuth?.isAdmin?.()?[...TABS,ADMINISTRATION_TAB]:TABS;
  const renderedIds=[...tabs.children].map(button=>button.dataset.target);const visibleIds=visibleTabs.map(([,id])=>id);
  if(renderedIds.join('|')!==visibleIds.join('|')){
    tabs.replaceChildren();
    for(const [label,id] of visibleTabs){const b=document.createElement('button');b.textContent=label;b.dataset.target=id;b.addEventListener('click',()=>activateTab(id));tabs.appendChild(b);}
  }
  const activeEntry=firstStorageEntry([ACTIVE_TAB_KEY,...LEGACY_ACTIVE_TAB_KEYS]);let active=activeEntry?.value||'tabInputs';if(!visibleTabs.some(([,id])=>id===active)){active='tabInputs';storageSet(ACTIVE_TAB_KEY,active);}else if(activeEntry?.key!==ACTIVE_TAB_KEY)storageSet(ACTIVE_TAB_KEY,active);LEGACY_ACTIVE_TAB_KEYS.forEach(storageRemove);activateTab(active,false);
}
function activateTab(id,store=true){
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
  if(store)storageSet(ACTIVE_TAB_KEY,id);
  if(mobileNavigationEnabled())requestAnimationFrame(()=>document.querySelector(`#tabs button[data-target="${id}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'}));
  if(id==='tabSketch')drawSketch();if(id==='tabAnalysis')renderAnalysis();if(id==='tabQuotation')renderQuotation();requestAnimationFrame(()=>requestAnimationFrame(updateFixedHorizontalScroll));
}
function inputRow(label,key,value,extra=''){
  return `<div class="form-row"><label for="input_${key}">${escapeHtml(label)}</label><input id="input_${key}" data-input-key="${key}" value="${escapeHtml(value)}" ${extra}><span></span></div>`;
}
function tripleInputRow(label,keys,values){
  const placeholders=['400','790','1400'];
  return `<div class="form-row"><label for="input_${keys[0]}">${escapeHtml(label)}</label><div class="triple-input-row">${keys.map((key,index)=>`<input id="input_${key}" data-input-key="${key}" data-max-digits="4" inputmode="numeric" maxlength="4" placeholder="${placeholders[index]}" aria-label="${escapeHtml(label)} ${index+1}" value="${escapeHtml(values[index]??'')}">`).join('')}</div><span></span></div>`;
}
function moduleRailCompatibilityMarkup(project){
  const result=E.moduleRailCompatibility(project),status=result.compatible?'compatible':'incompatible';
  const heading=result.compatible?'Compatible with Module Rail':'Not Compatible with Module Rail';
  const detail=result.compatible?`${result.compatibleDistance} mm mounting holes detected.`:'Enter 400 or 790 mm in at least one field.';
  return `<output id="moduleRailCompatibility" class="module-rail-compatibility ${status}" role="status" aria-live="polite"><strong>${heading}</strong><span>${detail}</span></output>`;
}
function updateModuleRailCompatibilityDisplay(project){
  const existing=document.getElementById('moduleRailCompatibility');if(!existing)return;
  const wrapper=document.createElement('div');wrapper.innerHTML=moduleRailCompatibilityMarkup(project);existing.replaceWith(wrapper.firstElementChild);
}
function selectRow(label,key,value,options){
  return `<div class="form-row"><label for="input_${key}">${escapeHtml(label)}</label><select id="input_${key}" data-input-key="${key}">${options.map(option=>{const optionValue=typeof option==='object'?option.value:option,optionLabel=typeof option==='object'?option.label:option;return `<option value="${escapeHtml(optionValue)}" ${String(optionValue)===String(value)?'selected':''}>${escapeHtml(optionLabel)}</option>`;}).join('')}</select><span></span></div>`;
}
function projectDestinationOptions(value){
  const canonical=globalThis.LumaCountryData.canonicalEuropeanCountry(value),options=[{value:'',label:'Select European Country'}];
  if(value&&!canonical)options.push({value:String(value),label:`Legacy value: ${String(value)}`});
  return [...options,...globalThis.LumaCountryData.OTHER_EUROPEAN_COUNTRIES];
}
function pairedSelectRow(items){
  return `<div class="form-row form-row-paired"><div class="paired-inputs">${items.map(({label,key,value,options})=>`<div class="paired-field"><label for="input_${key}">${escapeHtml(label)}</label><select id="input_${key}" data-input-key="${key}">${options.map(option=>{const optionValue=typeof option==='object'?option.value:option,optionLabel=typeof option==='object'?option.label:option;return `<option value="${escapeHtml(optionValue)}" ${String(optionValue)===String(value)?'selected':''}>${escapeHtml(optionLabel)}</option>`;}).join('')}</select></div>`).join('')}</div></div>`;
}
function anemometerSelectionText(project){
  const item=E.getAnemometerSelection(project);return `${item.part} · ${item.tag} · ${Number(item.price).toFixed(2)} ${currencyDisplay(item.currency)}`;
}
function anemometerInputRow(project){
  return `<div class="form-row anemometer-input-row"><label for="input_elevation_asl">Plant Elevation ASL (m)</label><input id="input_elevation_asl" data-input-key="elevation_asl" type="number" step="1" inputmode="decimal" value="${escapeHtml(project.inputs.elevation_asl)}"><output id="selectedAnemometer" class="anemometer-selection" for="input_elevation_asl"><span>Selected anemometer</span><strong>${escapeHtml(anemometerSelectionText(project))}</strong></output></div>`;
}
function updateAnemometerSelectionDisplay(project){
  const output=document.querySelector('#selectedAnemometer strong');if(output)output.textContent=anemometerSelectionText(project);
}
function bindStandardInputs(container){
  container.querySelectorAll('[data-input-key]').forEach(el=>{
    const event=el.tagName==='SELECT'?'change':'input';el.addEventListener(event,()=>{
      const p=getActiveProject();const key=el.dataset.inputKey;if(key.startsWith('__'))return;p.inputs[key]=el.value;
      if(el.dataset.maxDigits){el.value=el.value.replace(/\D/g,'').slice(0,Number(el.dataset.maxDigits));p.inputs[key]=el.value;}
      if(['pv_module_width','pv_module_hole_distance','hat_rail_hole_distance'].includes(key) && p.inputs.pv_gap_locked){p.inputs.pv_module_gap=String(E.niceNumber(E.calculateAutoPvModuleGap(p)));const gap=document.getElementById('input_pv_module_gap');if(gap)gap.value=p.inputs.pv_module_gap;}
      if(key==='foundation_method')p.inputs.foundation_type=p.inputs.foundation_method;
      if(key==='project_country_type'){
        if(p.inputs.project_country_type==='Italy'){p.inputs.project_country='Italy';p.inputs.destination_country='Italy';}
        else if(globalThis.LumaCountryData.canonicalEuropeanCountry(p.inputs.destination_country)==='Italy'){p.inputs.project_country='';p.inputs.destination_country='';}
      }
      if(key==='destination_country'){const canonical=globalThis.LumaCountryData.canonicalEuropeanCountry(el.value);p.inputs.destination_country=canonical||el.value;p.inputs.project_country=p.inputs.destination_country;}
      if(key.startsWith('pv_module_longitudinal_hole_distance_'))updateModuleRailCompatibilityDisplay(p);
      markDirty();refreshOutputsOnly();
      if(['foundation_method','drive_pile_depth_mm','bearing_pile_depth_mm','main_post_profile','bearing_post_profile','project_country_type'].includes(key))renderInputsTab();
    });
  });
}
function renderInputsTab(){
  const p=getActiveProject(),i=p.inputs,root=document.getElementById('tabInputs');
  root.innerHTML=`
    <div class="input-section"><h2 class="section-title">Project Inputs</h2>
      ${inputRow('Project Name','__project_name',p.project_name)}
      ${inputRow('Project Code','__project_code',p.project_code)}
      ${selectRow('Project Country','project_country_type',i.project_country_type,['Italy','Other European Country'])}
      ${i.project_country_type==='Other European Country'?selectRow('European Country','destination_country',i.destination_country,projectDestinationOptions(i.destination_country)):''}
      ${selectRow('Delivery Point','delivery_point',i.delivery_point,['Site','Warehouse'])}
      ${anemometerInputRow(p)}
      ${inputRow('Final Layout','final_layout_document_number',i.final_layout_document_number,'type="text" placeholder="Enter Document Number"')}
      ${inputRow('PV Module Datasheet','pv_module_datasheet_document_number',i.pv_module_datasheet_document_number,'type="text" placeholder="Enter Document Number"')}
      <div class="form-row"><label>CAD Blocks Availability</label><div class="radio-row">
        <label class="radio-label"><input type="radio" name="cadAvailability" value="Yes" ${String(i.cad_blocks_available).toLowerCase()==='yes'?'checked':''}> Yes</label>
        <label class="radio-label"><input type="radio" name="cadAvailability" value="No" ${String(i.cad_blocks_available).toLowerCase()==='no'?'checked':''}> No</label>
      </div><span></span></div>
    </div>
    <div class="input-section"><h2 class="section-title">PV Module Inputs</h2>
      ${inputRow('PV Module Capacity (Wp)','pv_power',i.pv_power)}
      ${inputRow('PV Module Width (mm)','pv_module_width',i.pv_module_width)}
      ${inputRow('PV Module Length (mm)','pv_module_length',i.pv_module_length)}
      ${inputRow('PV Module Transverse Hole Distance (mm)','pv_module_hole_distance',i.pv_module_hole_distance)}
      ${tripleInputRow('PV Module Longitudinal Hole Distance (mm)',['pv_module_longitudinal_hole_distance_1','pv_module_longitudinal_hole_distance_2','pv_module_longitudinal_hole_distance_3'],[i.pv_module_longitudinal_hole_distance_1,i.pv_module_longitudinal_hole_distance_2,i.pv_module_longitudinal_hole_distance_3])}
      <div class="form-row module-rail-compatibility-row">${moduleRailCompatibilityMarkup(p)}</div>
      ${inputRow('Hat Rail Hole Distance (mm)','hat_rail_hole_distance',i.hat_rail_hole_distance)}
      ${inputRow('Z Rail Design Offset (mm)','z_rail_offset',i.z_rail_offset)}
      <div class="form-row"><label for="input_pv_module_gap">PV Module Gap (mm)</label><div class="lock-row"><input id="input_pv_module_gap" value="${escapeHtml(i.pv_module_gap)}" ${i.pv_gap_locked?'readonly':''}><button id="pvGapLock" class="lock-switch ${i.pv_gap_locked?'':'unlocked'}" title="Locked mode: PV Module Gap = PV Module Transverse Hole Distance + Hat Rail Hole Distance - PV Module Width"><span>${i.pv_gap_locked?'LOCK':'UNLOCK'}</span></button></div><span></span></div>
      ${inputRow('Motor Gap (mm)','motor_gap',i.motor_gap)}
      ${inputRow('Target End Gap (mm)','target_end_gap',i.target_end_gap)}
    </div>
    <div class="input-section"><h2 class="section-title">Foundation Input</h2>
      ${selectRow('Method','foundation_method',i.foundation_method,['Ramming','Foundation'])}
      ${selectRow('Drive Pile Depth (mm)','drive_pile_depth_mm',i.drive_pile_depth_mm,window.LumaPostConfiguration.depthOptions(partMaster,'Drive Pile'))}
      ${selectRow('Drive Pile Type','main_post_profile',i.main_post_profile,window.LumaPostConfiguration.profileOptions(partMaster,'Drive Pile'))}
      ${selectRow('Bearing Pile Depth (mm)','bearing_pile_depth_mm',i.bearing_pile_depth_mm,window.LumaPostConfiguration.depthOptions(partMaster,'Bearing Pile'))}
      ${selectRow('Bearing Pile Type','bearing_post_profile',i.bearing_post_profile,window.LumaPostConfiguration.profileOptions(partMaster,'Bearing Pile'))}
    </div>
    <div class="input-section"><h2 class="section-title">Torque Tube Inputs</h2>
      ${inputRow('Overlap A/B (mm)','overlap_ab',i.overlap_ab)}
      ${inputRow('Overlap B/C (mm)','overlap_bc',i.overlap_bc)}
      ${inputRow('Torque Tube A Length - Long Tracker (mm)','main_beam_a_length',i.main_beam_a_length)}
      ${inputRow('Slew Drive Connection Length - Short Tracker (mm)','main_beam_connection_length',i.main_beam_connection_length)}
      ${inputRow('Torque Tube B Length (mm)','main_beam_b_length',i.main_beam_b_length)}
      ${inputRow('Torque Tube C Short Length (mm)','main_beam_c_short_length',i.main_beam_c_short_length)}
      ${inputRow('Torque Tube C Long Length (mm)','main_beam_c_long_length',i.main_beam_c_long_length)}
      ${inputRow('Mid Plane to Beginning of Torque Tube A / Connection (mm)','mid_plane_to_beam_a',i.mid_plane_to_beam_a)}
    </div>
    <div class="input-section"><h2 class="section-title compact">Bearing Pile Distance by Array Type</h2><p class="subtitle">Add the bearing modes used for each PV array type. The same PV size can have several modes, each with its own number of trackers.</p><div id="bearingConfig"></div></div>
    <div class="input-section"><h2 class="section-title compact">Manual Standard Parts</h2><p class="subtitle">Use these rows for standard parts that cannot be calculated automatically, such as Datalogger and Safeguard.</p><div id="manualParts"></div></div>`;
  bindStandardInputs(root);
  document.getElementById('input___project_name').addEventListener('input',e=>{p.project_name=e.target.value;markDirty();updateHeaderAndKpis();refreshProjectList();saveRecovery();});
  document.getElementById('input___project_code').addEventListener('change',e=>{const v=e.target.value.trim();if(!v||projectCodeExists(v,p.project_id)){showToast('Project Code must be non-empty and unique.');e.target.value=p.project_code;return;}p.project_code=v;markDirty();updateHeaderAndKpis();refreshProjectList();});
  document.getElementById('input_elevation_asl').addEventListener('input',()=>updateAnemometerSelectionDisplay(p));
  document.querySelectorAll('input[name="cadAvailability"]').forEach(r=>r.addEventListener('change',()=>{p.inputs.cad_blocks_available=r.value;if(r.value==='No')uiState.customRule.mode='Symmetrical';markDirty();renderAll(true);}));
  const gap=document.getElementById('input_pv_module_gap');gap.addEventListener('input',()=>{if(!p.inputs.pv_gap_locked){p.inputs.pv_module_gap=gap.value;markDirty();refreshOutputsOnly();}});
  document.getElementById('pvGapLock').addEventListener('click',()=>{p.inputs.pv_gap_locked=!p.inputs.pv_gap_locked;if(p.inputs.pv_gap_locked)p.inputs.pv_module_gap=String(E.niceNumber(E.calculateAutoPvModuleGap(p)));markDirty();renderInputsTab();refreshOutputsOnly();});
  renderBearingConfig();renderManualParts();
}

function syncCustomRuleFromProject(pv,mode=uiState.customRule.mode){
  const p=getActiveProject(),normalizedMode=E.normalizeBearingMode(mode),variants=E.getBearingRuleVariantsForPv(p,pv),key=E.bearingRuleVariantKey(normalizedMode),saved=variants.find(rule=>rule.key===key),r=E.normalizeBearingRule(saved||E.defaultBearingRule(p.inputs));
  const quantity=saved?saved.quantity:(variants.length?0:E.asInt(p.tracker_quantities[String(pv)],0));
  uiState.customRule={pv:String(pv),mode:normalizedMode,quantity:String(quantity),symmetrical_distance:String(E.niceNumber(r.symmetrical_distance)),semi_pair_count:Math.max(1,Math.min(5,r.semi_pair_count||1)),asym_post_count:Math.max(1,Math.min(5,r.asym_post_count||1)),semi_pair_gaps:Array.from({length:5},(_,x)=>x<r.semi_pair_gaps.length?String(E.niceNumber(r.semi_pair_gaps[x])):''),asym_north_gaps:Array.from({length:5},(_,x)=>x<r.asym_north_gaps.length?String(E.niceNumber(r.asym_north_gaps[x])):''),asym_south_gaps:Array.from({length:5},(_,x)=>x<r.asym_south_gaps.length?String(E.niceNumber(r.asym_south_gaps[x])):'')};
}
function customRuleEditorHtml(){
  const r=uiState.customRule;let html='';
  if(r.mode==='Symmetrical'){
    html+=`<div class="form-row"><label>Identical Distance Between Bearing Piles (mm)</label><input id="crSym" value="${escapeHtml(r.symmetrical_distance)}"><span></span></div>`;
  }else if(r.mode==='Semi-symmetrical'){
    html+=`<div class="form-row"><label>Number of Bearing Pile Pairs</label><select id="crSemiCount">${[1,2,3,4,5].map(v=>`<option ${v===Number(r.semi_pair_count)?'selected':''}>${v}</option>`).join('')}</select><span></span></div>`;
    for(let pair=1;pair<=Number(r.semi_pair_count);pair++){
      const label=pair===1?'Drive Pile to Pair ±1 (mm)':`Pair ±${pair-1} to Pair ±${pair} (mm)`;html+=`<div class="form-row"><label>${label}</label><input data-cr-semi="${pair-1}" value="${escapeHtml(r.semi_pair_gaps[pair-1]||'')}"><span></span></div>`;
    }
  }else{
    html+=`<div class="form-row"><label>Number of Bearing Piles Per Side</label><select id="crAsymCount">${[1,2,3,4,5].map(v=>`<option ${v===Number(r.asym_post_count)?'selected':''}>${v}</option>`).join('')}</select><span></span></div><h3 class="section-title compact" style="font-size:15px">North Side</h3>`;
    for(let pair=1;pair<=Number(r.asym_post_count);pair++){const label=pair===1?'Drive Pile to North 1 (mm)':`North ${pair-1} to North ${pair} (mm)`;html+=`<div class="form-row"><label>${label}</label><input data-cr-north="${pair-1}" value="${escapeHtml(r.asym_north_gaps[pair-1]||'')}"><span></span></div>`;}
    html+='<h3 class="section-title compact" style="font-size:15px">South Side</h3>';
    for(let pair=1;pair<=Number(r.asym_post_count);pair++){const label=pair===1?'Drive Pile to South 1 (mm)':`South ${pair-1} to South ${pair} (mm)`;html+=`<div class="form-row"><label>${label}</label><input data-cr-south="${pair-1}" value="${escapeHtml(r.asym_south_gaps[pair-1]||'')}"><span></span></div>`;}
  }
  return html;
}
function ruleToTableValues(pv,rule){
  const r=E.normalizeBearingRule(rule);if(r.mode==='Symmetrical')return [`${pv}-PV`,r.mode,r.quantity,'Auto',E.niceNumber(r.symmetrical_distance),'Same as North'];
  if(r.mode==='Semi-symmetrical')return [`${pv}-PV`,r.mode,r.quantity,r.semi_pair_gaps.length,r.semi_pair_gaps.map(E.niceNumber).join(', '),'Same as North'];
  return [`${pv}-PV`,r.mode,r.quantity,r.asym_north_gaps.length,r.asym_north_gaps.map(E.niceNumber).join(', '),r.asym_south_gaps.map(E.niceNumber).join(', ')];
}
function renderBearingConfig(){
  const root=document.getElementById('bearingConfig');if(!root)return;const p=getActiveProject();const cad=E.cadBlocksAreAvailable(p);
  if(cad){
    root.innerHTML=`<div class="bearing-top"><label>Array Type</label><select id="crPv">${Array.from({length:43},(_,i)=>i+14).map(v=>`<option ${String(v)===String(uiState.customRule.pv)?'selected':''}>${v}</option>`).join('')}</select><label>Mode</label><select id="crMode">${E.BEARING_RULE_MODES.map(v=>`<option ${v===uiState.customRule.mode?'selected':''}>${v}</option>`).join('')}</select><label>Number of Trackers</label><input id="crQty" type="number" min="0" step="1" value="${escapeHtml(uiState.customRule.quantity)}"></div><div id="bearingEditor" class="bearing-editor">${customRuleEditorHtml()}</div><div class="action-row"><button id="crAdd">Add / Update Configuration</button><button id="crLoad">Load Selected Configuration</button><button id="crDelete">Delete Selected Configuration</button></div><div id="bearingSummary"></div>`;
    document.getElementById('crPv').addEventListener('change',e=>{const pv=e.target.value;syncCustomRuleFromProject(pv,uiState.customRule.mode);const key=bearingConfigurationSelectionKey(pv,uiState.customRule.mode);customRuleSelectedKey=E.getBearingRuleVariantsForPv(p,pv).some(rule=>bearingConfigurationSelectionKey(pv,rule.mode)===key)?key:null;renderBearingConfig();});
    document.getElementById('crMode').addEventListener('change',e=>{const mode=e.target.value,pv=uiState.customRule.pv;syncCustomRuleFromProject(pv,mode);const key=bearingConfigurationSelectionKey(pv,mode);customRuleSelectedKey=E.getBearingRuleVariantsForPv(p,pv).some(rule=>bearingConfigurationSelectionKey(pv,rule.mode)===key)?key:null;renderBearingConfig();});
    bindCustomRuleFields();
    document.getElementById('crAdd').addEventListener('click',()=>{
      readCustomRuleFields();const r=uiState.customRule;const pv=Number(r.pv);const semiCount=Math.max(1,Math.min(5,Number(r.semi_pair_count)||1));const asymCount=Math.max(1,Math.min(5,Number(r.asym_post_count)||1));
      const key=E.bearingRuleVariantKey(r.mode),record={locked:false,mode:r.mode,quantity:Math.max(0,E.asInt(r.quantity,0)),symmetrical_distance:E.asNumber(r.symmetrical_distance,0),semi_pair_count:semiCount,asym_post_count:asymCount,semi_pair_gaps:r.semi_pair_gaps.slice(0,semiCount).map(v=>E.asNumber(v,0)),asym_north_gaps:r.asym_north_gaps.slice(0,asymCount).map(v=>E.asNumber(v,0)),asym_south_gaps:r.asym_south_gaps.slice(0,asymCount).map(v=>E.asNumber(v,0))};const variants=E.getBearingRuleVariantsForPv(p,pv).filter(rule=>rule.key!==key);variants.push({...E.normalizeBearingRule(record),key});p.bearing_rules[String(pv)]=bearingRuleStoreFromVariants(variants);updateTrackerQuantityFromBearingRules(p,pv);customRuleSelectedKey=bearingConfigurationSelectionKey(pv,r.mode);markDirty();refreshOutputsOnly();renderBearingSummaryOnly();showToast(`${pv}-PV ${r.mode} configuration updated.`);
    });
    document.getElementById('crLoad').addEventListener('click',()=>{if(!customRuleSelectedKey){showToast('Select a custom bearing configuration from the table first.');return;}const selected=parseBearingConfigurationSelectionKey(customRuleSelectedKey),rule=E.getBearingRuleVariantsForPv(p,selected.pv).find(item=>item.key===selected.key);if(!rule){showToast('The selected configuration is no longer available.');return;}syncCustomRuleFromProject(selected.pv,rule.mode);renderBearingConfig();});
    document.getElementById('crDelete').addEventListener('click',()=>{if(!customRuleSelectedKey){showToast('Select a custom bearing configuration from the table first.');return;}const selected=parseBearingConfigurationSelectionKey(customRuleSelectedKey),variants=E.getBearingRuleVariantsForPv(p,selected.pv),removed=variants.find(rule=>rule.key===selected.key);if(!removed){showToast('The selected configuration is no longer available.');return;}if(!confirm(`Delete the ${removed.mode} configuration for ${selected.pv}-PV?`))return;const remaining=variants.filter(rule=>rule.key!==selected.key);if(remaining.length){p.bearing_rules[String(selected.pv)]=bearingRuleStoreFromVariants(remaining);updateTrackerQuantityFromBearingRules(p,selected.pv);}else{delete p.bearing_rules[String(selected.pv)];p.tracker_quantities[String(selected.pv)]=removed.quantity;}customRuleSelectedKey=null;syncCustomRuleFromProject(selected.pv,removed.mode);markDirty();refreshOutputsOnly();renderBearingConfig();});
    renderBearingSummaryOnly();
  }else{
    const maxSpan=iValue('max_span_length',p.inputs.max_span_length);const limits=E.getSpanLimits(p);root.innerHTML=`<div class="bearing-top"><label>Array Type</label><select disabled><option>${escapeHtml(uiState.customRule.pv)}</option></select><label>Mode</label><strong>Symmetrical</strong><label>Max Span Length (mm)</label><input id="estMaxSpan" value="${escapeHtml(maxSpan)}"></div><p class="subtitle">Estimation mode: span means the distance between two bearing piles. Tracker span type is selected from total tracker length.</p><div class="table-wrap framed"><table><thead><tr><th>Tracker Type</th><th>Max Tracker Length (mm)</th><th>Bearing Piles</th></tr></thead><tbody>${[2,4,6,8].map(s=>`<tr><td>${s}-Span</td><td>${escapeHtml(E.niceNumber(limits[s]))}</td><td>${s} Bearing Piles</td></tr>`).join('')}</tbody></table></div><div id="bearingSummary"></div>`;
    document.getElementById('estMaxSpan').addEventListener('input',e=>{p.inputs.max_span_length=e.target.value;markDirty();refreshOutputsOnly();renderBearingSummaryOnly();});renderBearingSummaryOnly();
  }
}
function iValue(_key,value){return value==null?'':String(value);}
function bindCustomRuleFields(){
  const r=uiState.customRule;document.getElementById('crQty')?.addEventListener('input',e=>r.quantity=e.target.value);document.getElementById('crSym')?.addEventListener('input',e=>r.symmetrical_distance=e.target.value);
  document.getElementById('crSemiCount')?.addEventListener('change',e=>{r.semi_pair_count=Number(e.target.value);renderBearingConfig();});
  document.getElementById('crAsymCount')?.addEventListener('change',e=>{r.asym_post_count=Number(e.target.value);renderBearingConfig();});
  document.querySelectorAll('[data-cr-semi]').forEach(el=>el.addEventListener('input',()=>r.semi_pair_gaps[Number(el.dataset.crSemi)]=el.value));
  document.querySelectorAll('[data-cr-north]').forEach(el=>el.addEventListener('input',()=>r.asym_north_gaps[Number(el.dataset.crNorth)]=el.value));
  document.querySelectorAll('[data-cr-south]').forEach(el=>el.addEventListener('input',()=>r.asym_south_gaps[Number(el.dataset.crSouth)]=el.value));
}
function readCustomRuleFields(){
  const r=uiState.customRule;const qty=document.getElementById('crQty');if(qty)r.quantity=qty.value;const sym=document.getElementById('crSym');if(sym)r.symmetrical_distance=sym.value;
  const sc=document.getElementById('crSemiCount');if(sc)r.semi_pair_count=Number(sc.value);const ac=document.getElementById('crAsymCount');if(ac)r.asym_post_count=Number(ac.value);
  document.querySelectorAll('[data-cr-semi]').forEach(el=>r.semi_pair_gaps[Number(el.dataset.crSemi)]=el.value);document.querySelectorAll('[data-cr-north]').forEach(el=>r.asym_north_gaps[Number(el.dataset.crNorth)]=el.value);document.querySelectorAll('[data-cr-south]').forEach(el=>r.asym_south_gaps[Number(el.dataset.crSouth)]=el.value);
}
function renderBearingSummaryOnly(){
  const root=document.getElementById('bearingSummary');if(!root||!current)return;const p=getActiveProject();
  if(E.cadBlocksAreAvailable(p)){
    const rows=[];for(const pv of Object.keys(p.bearing_rules).sort((a,b)=>Number(a)-Number(b)))for(const rule of E.getBearingRuleVariantsForPv(p,pv))rows.push(ruleToTableValues(Number(pv),rule));
    root.innerHTML=makeArrayTable(['Array Type','Mode','Number of Trackers','Posts / Pairs','North / Pair Distances','South Distances'],rows,{rawArrays:true});
    wireTableRowClicks(root,rows,(tr,row)=>{root.querySelectorAll('tbody tr').forEach(x=>x.classList.remove('row-selected'));tr.classList.add('row-selected');customRuleSelectedKey=bearingConfigurationSelectionKey(Number(String(row[0]).replace('-PV','')),row[1]);});
    root.querySelectorAll('tbody tr[data-row-index]').forEach(tr=>tr.addEventListener('dblclick',()=>{const row=rows[Number(tr.dataset.rowIndex)],pv=Number(String(row[0]).replace('-PV',''));customRuleSelectedKey=bearingConfigurationSelectionKey(pv,row[1]);syncCustomRuleFromProject(pv,row[1]);renderBearingConfig();}));
    if(customRuleSelectedKey){[...root.querySelectorAll('tbody tr')].forEach(tr=>{const pv=Number(String(tr.cells[0]?.textContent||'').replace('-PV','')),mode=tr.cells[1]?.textContent;if(bearingConfigurationSelectionKey(pv,mode)===customRuleSelectedKey)tr.classList.add('row-selected');});}
  }else{
    const rows=current.schedule.map(row=>[`${row['PV Modules per Tracker']}-PV`,'Symmetrical',E.niceNumber(E.asNumber(p.inputs.max_span_length,7900)),E.niceNumber(row['Tracker Length (mm)']),row['Span Type'],row['Bearing Posts / Tracker']]);
    root.innerHTML=makeArrayTable(['Array Type','Mode','Max Span Length (mm)','Tracker Length (mm)','Tracker Type','Bearing Piles'],rows,{rawArrays:true});
  }
}
function nextManualKey(){
  const p=getActiveProject();let n=1;while(p.manual_parts[`manual_${n}`])n++;return `manual_${n}`;
}
function renderManualParts(){
  const root=document.getElementById('manualParts');if(!root)return;const p=getActiveProject();const fields=['Item','qty','TAG','Description','Part Number','Category','Unit'];
  const rows=Object.entries(p.manual_parts).map(([key,v])=>`<tr data-manual-key="${escapeHtml(key)}"><td><input type="checkbox" data-manual="selected" ${v.selected?'checked':''}></td><td><input type="checkbox" data-manual="include" ${v.include?'checked':''}></td>${fields.map(f=>`<td><input data-manual="${escapeHtml(f)}" value="${escapeHtml(v[f]??'')}"></td>`).join('')}</tr>`).join('');
  root.innerHTML=`<div class="table-wrap"><table class="manual-table"><thead><tr>${['Select','Include','Item','Qty','TAG','Description','Part Number','Category','Unit'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><div class="action-row"><button id="manualAdd">Add Row</button><button id="manualDelete">Delete Selected Row</button></div>`;
  root.querySelectorAll('[data-manual-key]').forEach(tr=>{const key=tr.dataset.manualKey;tr.querySelectorAll('[data-manual]').forEach(el=>{const field=el.dataset.manual;const ev=el.type==='checkbox'?'change':'input';el.addEventListener(ev,()=>{p.manual_parts[key][field]=el.type==='checkbox'?el.checked:el.value;markDirty();if(field!=='selected')refreshOutputsOnly();});});});
  document.getElementById('manualAdd').addEventListener('click',()=>{const key=nextManualKey();p.manual_parts[key]={selected:false,include:false,Item:'',qty:'0',TAG:'',Description:'','Part Number':'',Category:'',Unit:'',_default:false};markDirty();renderManualParts();refreshOutputsOnly();});
  document.getElementById('manualDelete').addEventListener('click',()=>{const selected=Object.entries(p.manual_parts).filter(([,v])=>v.selected);if(!selected.length){showToast('Select at least one manual standard part row to delete.');return;}let removed=0,kept=0;for(const [key,v] of selected){if(v._default){v.selected=false;kept++;}else{delete p.manual_parts[key];removed++;}}if(kept&&!removed)showToast('Default Safeguard and Datalogger rows are kept. You can clear or disable them instead.');markDirty();renderManualParts();refreshOutputsOnly();});
}

function displayValue(value){return value===null||value===undefined?'':String(E.niceNumber(value));}
function makeArrayTable(columns,rows,options={}){
  const rawArrays=!!options.rawArrays;
  const html=`<div class="table-wrap ${options.framed?'framed':''}"><table><thead><tr>${columns.map(c=>`<th class="${c==='Reason'?'wrap':''}">${escapeHtml(E.displayTerminology(c))}</th>`).join('')}</tr></thead><tbody>${rows.map((row,ri)=>`<tr data-row-index="${ri}">${columns.map((c,ci)=>{const v=rawArrays?row[ci]:row?.[c];const cls=c==='Reason'?'wrap':(c==='Status'||c==='Bearing Status'?(String(v)==='OK'?'status-ok':'status-warning'):'');return `<td class="${cls}">${escapeHtml(displayValue(E.displayTerminology(v)))}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
  if(!options.clickRow)return html;
  const holder=document.createElement('div');holder.innerHTML=html;holder.querySelectorAll('tbody tr').forEach(tr=>{const row=rows[Number(tr.dataset.rowIndex)];tr.addEventListener('click',()=>options.clickRow(tr,row));});return holder.innerHTML;
}
function analysisTableColumns(columns){
  return ['No.',...(columns||[]).filter(column=>String(column)!=='No.')];
}
function makeAnalysisTable(columns,rows){
  const dataColumns=analysisTableColumns(columns),sourceRows=Array.isArray(rows)?rows:[];
  const headers=dataColumns.map((column,index)=>`<th aria-sort="none"><button class="analysis-sort-button" type="button" data-analysis-sort-index="${index}">${escapeHtml(E.displayTerminology(column))} <span aria-hidden="true">↕</span></button></th>`).join('');
  const filters=dataColumns.map((column,index)=>index===0?'<th></th>':`<th><input data-analysis-filter-index="${index}" placeholder="Filter" aria-label="Filter ${escapeHtml(E.displayTerminology(column))}"></th>`).join('');
  const body=sourceRows.map((row,rowIndex)=>`<tr data-analysis-row data-analysis-original-index="${rowIndex}"><td data-analysis-number>${rowIndex+1}</td>${dataColumns.slice(1).map(column=>`<td>${escapeHtml(displayValue(E.displayTerminology(row?.[column])))}</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap analysis-table-wrap"><table class="analysis-data-table" data-analysis-table><thead><tr>${headers}</tr><tr class="analysis-table-filter-row">${filters}</tr></thead><tbody>${body}<tr data-analysis-empty-row ${sourceRows.length?'hidden':''}><td class="empty-table-message" colspan="${dataColumns.length}">${sourceRows.length?'No records match the current filters.':'No records available.'}</td></tr></tbody></table></div>`;
}
function analysisComparableNumber(value){
  const normalized=String(value??'').trim().replace(/,/g,'');return /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(normalized)?Number(normalized):null;
}
function analysisFilterMatches(value,filter){
  const query=String(filter||'').trim();if(!query)return true;
  const comparison=query.match(/^(<=|>=|=|<|>)\s*([-+]?\d*\.?\d+(?:e[-+]?\d+)?)$/i),number=analysisComparableNumber(value);
  if(comparison&&number!==null){const expected=Number(comparison[2]);return comparison[1]==='='?number===expected:comparison[1]==='<'?number<expected:comparison[1]==='>'?number>expected:comparison[1]==='<='?number<=expected:number>=expected;}
  return String(value??'').toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
function refreshAnalysisTable(table){
  if(!table)return;const filters=[...table.querySelectorAll('[data-analysis-filter-index]')],rows=[...table.querySelectorAll('tbody tr[data-analysis-row]')];let visible=0;
  for(const row of rows){const matches=filters.every(input=>analysisFilterMatches(row.cells[Number(input.dataset.analysisFilterIndex)]?.textContent,input.value));row.hidden=!matches;if(matches){visible++;const numberCell=row.querySelector('[data-analysis-number]');if(numberCell)numberCell.textContent=visible;}}
  const empty=table.querySelector('[data-analysis-empty-row]');if(empty){empty.hidden=visible>0;empty.querySelector('td').textContent=rows.length?'No records match the current filters.':'No records available.';}
}
function wireAnalysisTables(root){
  if(!root||root.dataset.analysisTablesWired==='true')return;root.dataset.analysisTablesWired='true';
  root.addEventListener('input',event=>{if(!event.target.matches('[data-analysis-filter-index]'))return;refreshAnalysisTable(event.target.closest('[data-analysis-table]'));requestAnimationFrame(updateFixedHorizontalScroll);});
  root.addEventListener('click',event=>{const button=event.target.closest('[data-analysis-sort-index]');if(!button||!root.contains(button))return;const table=button.closest('[data-analysis-table]'),index=Number(button.dataset.analysisSortIndex),same=table.dataset.analysisSortIndex===String(index),direction=same&&table.dataset.analysisSortDirection==='asc'?'desc':'asc';table.dataset.analysisSortIndex=String(index);table.dataset.analysisSortDirection=direction;
    table.querySelectorAll('[data-analysis-sort-index]').forEach(other=>{const active=other===button,span=other.querySelector('span'),header=other.closest('th');if(span)span.textContent=active?(direction==='asc'?'▲':'▼'):'↕';if(header)header.setAttribute('aria-sort',active?(direction==='asc'?'ascending':'descending'):'none');});
    const body=table.tBodies[0],rows=[...body.querySelectorAll('tr[data-analysis-row]')];rows.sort((left,right)=>{let a=index===0?Number(left.dataset.analysisOriginalIndex):left.cells[index]?.textContent||'',b=index===0?Number(right.dataset.analysisOriginalIndex):right.cells[index]?.textContent||'';const aNumber=analysisComparableNumber(a),bNumber=analysisComparableNumber(b);let result=aNumber!==null&&bNumber!==null?aNumber-bNumber:String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'});if(result===0)result=Number(left.dataset.analysisOriginalIndex)-Number(right.dataset.analysisOriginalIndex);return direction==='asc'?result:-result;});rows.forEach(row=>body.insertBefore(row,body.querySelector('[data-analysis-empty-row]')));refreshAnalysisTable(table);});
}
function analysisProjectBomColumns(extraColumns=[]){
  const columns=(current?.bom?.columns||[]).filter(column=>String(column)!=='No.'),seen=new Set(columns);for(const column of extraColumns)if(!seen.has(column)){seen.add(column);columns.push(column);}return columns;
}
const ANALYSIS_POST_ONLY_COLUMNS=Object.freeze([
  'Post Kind',
  'Foundation Method',
  'Foundation Depth mm',
  'Profile Type',
  'Profile Details',
  'Overall Length mm',
]);
function analysisDetailBomColumns(page,extraColumns=[]){
  const columns=analysisProjectBomColumns(extraColumns);if(page!=='substructure'&&page!=='packaging')return columns;
  const postOnlyColumns=new Set(ANALYSIS_POST_ONLY_COLUMNS);return columns.filter(column=>!postOnlyColumns.has(column));
}
function analysisProjectBomRow(source,extraValues={}){
  const row={};for(const column of (current?.bom?.columns||[])){if(column==='No.')continue;let value=source?.[column];if(column==='Part Name'&&(value===undefined||value===null||value===''))value=source?.Part;row[column]=value??'';}return Object.assign(row,extraValues);
}
function wireTableRowClicks(root,rows,handler){
  root.querySelectorAll('tbody tr[data-row-index]').forEach(tr=>tr.addEventListener('click',()=>handler(tr,rows[Number(tr.dataset.rowIndex)])));
}
function keepInlineEditorActive(input){
  input.addEventListener('click',event=>event.stopPropagation());input.addEventListener('dblclick',event=>event.stopPropagation());
}
function renderArrayTable(){
  const root=document.getElementById('tabArray');const cols=['PV / Tracker','Number of Trackers','Tracker Type','Span Type','Bearing Rule','Bearing Mode','PV Gaps / Side','Tracker Length (mm)','Torque Tube C','Bearing Piles / Tracker','Bearing 120','Bearing 110','Bearing 100','K001099 / Tracker','Status'];
  const rows=current.schedule.map(r=>{
    const cNorth=E.asNumber(r['Main Tube C Required Length North'],0),cSouth=E.asNumber(r['Main Tube C Required Length South'],0);let c='Not required';
    if(cNorth>0||cSouth>0)c=`${displayValue(r['Main Tube C Required Length'])} (${r['Main Tube C Stock Suggestion']})`;
    return [r['PV Modules per Tracker'],r['Number of Trackers'],r['Tracker Type'],r['Span Type'],r['Bearing Rule Source'],r['Bearing Rule Mode'],r['PV Gaps / Side'],r['Tracker Length (mm)'],c,r['Bearing Posts / Tracker'],r['Bearing 120 / Tracker'],r['Bearing 110 / Tracker'],r['Bearing 100 / Tracker'],r['Module Support Plates / Tracker'],r['Bearing Status']];
  });
  root.innerHTML=`<h2 class="table-title">Plant Array Table</h2><p class="table-subtitle">Double-click the Number of Trackers cell to edit quantity.</p>${makeArrayTable(cols,rows,{rawArrays:true})}`;
  const trs=root.querySelectorAll('tbody tr');trs.forEach((tr,index)=>{const cell=tr.cells[1];cell.style.background='#FFF5E4';cell.title='Double-click to edit';cell.addEventListener('dblclick',()=>editArrayQtyCell(cell,current.schedule[index]));});
}
function editArrayQtyCell(cell,scheduleRow){
  if(cell.querySelector('input'))return;const p=getActiveProject(),pv=E.asInt(scheduleRow['PV Modules per Tracker']),ruleKey=String(scheduleRow._bearing_rule_key||''),old=E.asInt(scheduleRow['Number of Trackers'],0);cell.innerHTML=`<input class="qty-input" type="number" min="0" step="1" value="${escapeHtml(old)}">`;const input=cell.querySelector('input');keepInlineEditorActive(input);input.focus();input.select();let done=false;
  const save=()=>{if(done)return;done=true;let v=Number(input.value);if(!Number.isFinite(v)||v<0)v=0;v=Math.trunc(v);if(ruleKey){const variants=E.getBearingRuleVariantsForPv(p,pv).map(rule=>rule.key===ruleKey?{...rule,quantity:v}:rule);p.bearing_rules[String(pv)]=bearingRuleStoreFromVariants(variants);updateTrackerQuantityFromBearingRules(p,pv);}else p.tracker_quantities[String(pv)]=v;markDirty();refreshOutputsOnly();};input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){done=true;renderArrayTable();}});input.addEventListener('blur',save);
}
function renderSelectedArrays(){
  document.getElementById('tabSelected').innerHTML=makeArrayTable(SELECTED_ARRAY_COLUMNS,current.active);
}
function renderBearingLayout(){document.getElementById('tabBearing').innerHTML=makeArrayTable(BEARING_COLUMNS,current.bearing);}
function renderSupport(){
  const summary=current.active.map(r=>({'PV Modules per Tracker':r['PV Modules per Tracker'],'Bearing Rule Mode':r['Bearing Rule Mode'],'Number of Trackers':r['Number of Trackers'],'PV Module Support Plate / Single Tracker':r['Module Support Plates / Tracker'],'Total PV Module Support Plate Qty':E.asInt(r['Module Support Plates / Tracker'])*E.asInt(r['Number of Trackers'])}));
  const sc=['PV Modules per Tracker','Bearing Rule Mode','Number of Trackers','PV Module Support Plate / Single Tracker','Total PV Module Support Plate Qty'];
  document.getElementById('tabSupport').innerHTML=`<h2 class="table-title">PV Module Support Plate Quantity by Selected Array</h2>${makeArrayTable(sc,summary)}<h2 class="table-title" style="margin-top:14px">Detailed rail-by-rail calculation</h2>${makeArrayTable(SUPPORT_DETAIL_COLUMNS,current.support)}`;
}
function rowMatchesSearch(row,text){
  const words=String(text||'').trim().split(/\s+/).map(E.normalizeText).filter(Boolean);if(!words.length)return true;const combined=E.normalizeText(Object.values(row||{}).filter(v=>v!==null&&v!==undefined).join(' '));return words.every(w=>combined.includes(w));
}
function bomProjectSettingsHtml(project,allocation){
  const contingencyPercent=Math.min(100,Math.max(0,E.asNumber(project.fastener_contingency_percent,0))),version=E.normalizeSoltrkVersion(project.soltrk_version),overrides=project.equipment_quantity_overrides||{};
  const plantControls=E.PLANT_ELECTRICAL_ITEMS.map(item=>{
    const tag=item.key==='anemometer'?E.getAnemometerSelection(project).tag:item.tag;
    return `<label for="bomPlant_${item.key}"><span>${escapeHtml(item.label)} (${escapeHtml(tag)})</span><small>1 per ${item.perTrackers} trackers</small><input id="bomPlant_${item.key}" type="number" min="0" step="1" placeholder="Auto (${escapeHtml(allocation.plantAutomaticByKey[item.key])})" value="${escapeHtml(overrides[item.key]??'')}"></label>`;
  }).join('');
  return `<div class="bom-controls" aria-label="Project BOM controls"><label for="bomSoltrkVersion"><span>SOLTRK Version</span><select id="bomSoltrkVersion">${['2.0','3.0'].map(value=>`<option value="${value}" ${value===version?'selected':''}>SOLTRK ${value}</option>`).join('')}</select></label><label class="bom-check" for="bomContingencyEnabled"><span>Contingency</span><span class="bom-check-control"><input id="bomContingencyEnabled" type="checkbox" ${project.contingency_enabled?'checked':''}><span>Fasteners</span></span></label><label for="bomContingencyPercent"><span>Fasteners (%)</span><input id="bomContingencyPercent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(E.niceNumber(contingencyPercent))}" ${project.contingency_enabled?'':'disabled'}></label><label class="bom-check" for="bomMetadataEnabled"><span>Material / Weight</span><span class="bom-check-control"><input id="bomMetadataEnabled" type="checkbox" ${project.bom_metadata_enabled!==false?'checked':''}><span>Show columns</span></span></label><label for="bomSoltrkOverride"><span>SOLTRK Override</span><input id="bomSoltrkOverride" type="number" min="0" step="1" placeholder="Auto (${escapeHtml(allocation.automaticSoltrk)})" value="${escapeHtml(overrides.soltrk??'')}"></label><label for="bomJunctionBoxOverride"><span>Junction Box Override</span><input id="bomJunctionBoxOverride" type="number" min="0" step="1" placeholder="Auto (${escapeHtml(allocation.automaticJunctionBox)})" value="${escapeHtml(overrides.junction_box??'')}"></label></div><div class="bom-controls bom-plant-controls" aria-label="Plant electrical quantities"><h3>Plant Electrical Quantities</h3>${plantControls}</div><p class="bom-control-note">Blank fields use automatic quantities. Plant electrical totals are rounded once across all trackers; zero is allowed. Fastener contingency changes final totals only.</p>`;
}
function bindBomProjectControls(project){
  document.getElementById('bomContingencyEnabled').addEventListener('change',event=>{project.contingency_enabled=event.target.checked;markDirty();refreshOutputsOnly();});
  document.getElementById('bomContingencyPercent').addEventListener('change',event=>{const value=Number(event.target.value);if(!Number.isFinite(value)||value<0||value>100){showToast('Fasteners contingency must be between 0 and 100.');event.target.value=E.niceNumber(project.fastener_contingency_percent);return;}project.fastener_contingency_percent=value;markDirty();refreshOutputsOnly();});
  document.getElementById('bomMetadataEnabled').addEventListener('change',event=>{project.bom_metadata_enabled=event.target.checked;markDirty();refreshOutputsOnly();});
  document.getElementById('bomSoltrkVersion').addEventListener('change',event=>{project.soltrk_version=E.normalizeSoltrkVersion(event.target.value);selectedBomRows.clear();markDirty();refreshOutputsOnly();});
  const bindOverride=(elementId,key,label)=>document.getElementById(elementId).addEventListener('change',event=>{const raw=event.target.value.trim();project.equipment_quantity_overrides=project.equipment_quantity_overrides||{};if(raw===''){delete project.equipment_quantity_overrides[key];markDirty();refreshOutputsOnly();return;}const value=Number(raw);if(!Number.isInteger(value)||value<0){showToast(`${label} override must be blank or a non-negative whole number.`);event.target.value=project.equipment_quantity_overrides[key]??'';return;}project.equipment_quantity_overrides[key]=value;markDirty();refreshOutputsOnly();});
  bindOverride('bomSoltrkOverride','soltrk','SOLTRK');
  bindOverride('bomJunctionBoxOverride','junction_box','Junction Box');
  for(const item of E.PLANT_ELECTRICAL_ITEMS)bindOverride(`bomPlant_${item.key}`,item.key,item.label);
}
function renderBom(){
  const root=document.getElementById('tabBom'),p=getActiveProject();const filtered=current.bom.rows.filter(r=>rowMatchesSearch(r,uiState.projectBomSearch));
  const allocation=E.equipmentQuantityAllocation(p,current.active);
  root.innerHTML=`<h2 class="table-title">Project BOM</h2><p class="table-subtitle">Aggregated, read-only LUMA BOM. Select a row to highlight it; use the controls below for project-level options.</p>${bomProjectSettingsHtml(p,allocation)}<div class="search-row"><label>Search:</label><input id="bomSearchInput" value="${escapeHtml(uiState.projectBomSearch)}" placeholder="Search Project BOM by Part, TAG, Description, Category, quantity..."><button id="bomSearchBtn">Search</button><button id="bomClearBtn">Clear</button></div>${makeArrayTable(current.bom.columns,filtered)}`;
  if((current.engineeringErrors||[]).length)root.insertAdjacentHTML('afterbegin',`<div class="analysis-warning" role="alert"><strong>BOM blocked:</strong> ${current.engineeringErrors.map(escapeHtml).join('<br>')}</div>`);
  bindBomProjectControls(p);const table=root.querySelector('.table-wrap table');if(table)table.classList.add('bom-table');
  root.querySelectorAll('tbody tr').forEach((tr,displayIndex)=>{
    const row=filtered[displayIndex],key=row._bom_key;
    tr.dataset.bomIdentity=key;tr.tabIndex=0;tr.setAttribute('aria-selected',String(selectedBomRows.has(key)));tr.classList.toggle('is-selected',selectedBomRows.has(key));
    const selectRow=event=>{if(event.type==='click'&&event.detail>1)return;if(event.ctrlKey||event.metaKey){selectedBomRows.has(key)?selectedBomRows.delete(key):selectedBomRows.add(key);}else{selectedBomRows.clear();selectedBomRows.add(key);}root.querySelectorAll('.bom-table tbody tr').forEach((tableRow,index)=>{const selected=selectedBomRows.has(filtered[index]._bom_key);tableRow.classList.toggle('is-selected',selected);tableRow.setAttribute('aria-selected',String(selected));});};
    tr.addEventListener('click',selectRow);tr.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRow(event);}});
  });
  const search=()=>{uiState.projectBomSearch=document.getElementById('bomSearchInput').value;renderBom();updateFixedHorizontalScroll();};document.getElementById('bomSearchBtn').addEventListener('click',search);document.getElementById('bomSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')search();});document.getElementById('bomClearBtn').addEventListener('click',()=>{uiState.projectBomSearch='';renderBom();updateFixedHorizontalScroll();});
}
function logicOptions(){return current.active.length?current.active:current.schedule;}
function ensureLogicSelection(){
  const p=getActiveProject(),opts=logicOptions().map(r=>String(r['PV Modules per Tracker']));if(!opts.includes(String(p.selected_logic_pv)))p.selected_logic_pv=opts[0]||'';
}
function buildLogicText(){
  ensureLogicSelection();const p=getActiveProject(),pv=Number(p.selected_logic_pv);const row=current.schedule.find(r=>Number(r['PV Modules per Tracker'])===pv);if(!row)return 'No calculation available.';
  const d=E.getDesignInputs(p),bearingRule=E.getBearingRuleForPv(p,pv),anemometer=E.getAnemometerSelection(p),n=E.niceNumber;const lines=[];
  lines.push('CALCULATION LOGIC','='.repeat(90),'',`Selected PV Modules / Tracker = ${pv}`,`Tracker Type = ${row['Tracker Type']}`,`Bearing Rule Source = ${row['Bearing Rule Source']}`,`Bearing Rule Mode = ${bearingRule.mode||''}`,`BOM Mode = ${E.getBomModeText(p)}`,`Span Type = ${row['Span Type']||'CAD Block'}`,`Plant Elevation ASL = ${n(p.inputs.elevation_asl)} m`,`Selected Anemometer = ${anemometer.part} (${anemometer.tag})`,'');
  lines.push('1) PV MODULE GAP CALCULATION','-'.repeat(90),'PV Module Gap = PV Module Transverse Hole Distance + Hat Rail Hole Distance - PV Module Width',`= ${n(d.pv_module_hole_distance)} + ${n(d.hat_rail_hole_distance)} - ${n(d.pv_module_width)}`,`= ${n(d.pv_module_gap)} mm`,`Gap locked = ${p.inputs.pv_gap_locked?'Yes':'No'}`,'');
  lines.push('2) TRACKER LENGTH CALCULATION','-'.repeat(90),'Required side envelope = Motor Gap / 2 + Modules × PV Module Width + PV gaps × PV Module Gap + Target End Gap',`Required North Side = ${n(row['Required North Side'])} mm`,`Required South Side = ${n(row['Required South Side'])} mm`, '');
  if(E.cadBlocksAreAvailable(p))lines.push('CAD Block tracker length = North structural end + South structural end',`= ${n(row['Main Tube C End North from Midplane'])} + ${n(row['Main Tube C End South from Midplane'])}`,`= ${n(row['Tracker Length (mm)'])} mm`,'');
  else lines.push('Estimation tracker length = Required North Side + Required South Side',`= ${n(row['Required North Side'])} + ${n(row['Required South Side'])}`,`= ${n(row['Tracker Length (mm)'])} mm`,'');
  lines.push('3) BEARING TYPE CALCULATION','-'.repeat(90));
  if(E.cadBlocksAreAvailable(p))lines.push('CAD Blocks Availability = Yes. The app first checks whether this PV type has a custom bearing rule.','If yes, it uses the custom rule. If no, it uses the default CAD-block bearing rule.','');
  else lines.push('CAD Blocks Availability = No. The app estimates the span type from total tracker length.','Max tracker length = Span count × Max Span + 2 × Max Span × 0.35.','The selected span type defines the bearing post quantity: 2, 4, 6, or 8 bearing posts.','');
  lines.push('Each bearing post position is calculated from the mid-plane / main post.','Then the absolute position is compared with main tube zones.','','If |position| <= Zone A End, bearing type = Bearing 120','Else if |position| <= Zone B End, bearing type = Bearing 110','Else if |position| <= Zone C End, bearing type = Bearing 100','',`Zone A End = ${n(row['Zone A End (120)'])} mm`,`Zone B End = ${n(row['Zone B End (110)'])} mm`,`Zone C End = ${n(row['Main Tube C End from Midplane'])} mm`,'');
  // Previous K001099 calculation log (kept for future restoration):
  // const first=d.motor_gap/2+(d.pv_module_width-d.pv_module_hole_distance)/2+d.z_rail_offset;
  // lines.push('4) MODULE SUPPORT PLATE K001099 CALCULATION','-'.repeat(90),'Rail positions are calculated from mid-plane on one side, then mirrored to the other side.','','First rail position:','Motor Gap / 2 + (PV Module Width - PV Module Transverse Hole Distance) / 2 + Z Rail Offset',`= ${n(d.motor_gap)} / 2 + (${n(d.pv_module_width)} - ${n(d.pv_module_hole_distance)}) / 2 + ${n(d.z_rail_offset)}`,`= ${n(first)} mm`,'','Second rail position increment:','PV Module Transverse Hole Distance + Hat Rail Hole Distance / 2 - Z Rail Offset','','Next rail increment:','PV Module Transverse Hole Distance + Hat Rail Hole Distance','','Support plate rules:','Base condition: each module rail has minimum 1 support plate.','Bearing 110: closest left/right rails get 2 plates.','Bearing 100: closest left/right rails get 4 plates.','Taper rule: 4 → 3 → 2 → 1, or 2 → 1.','Beam height compensation:','A/120 level = 0, B/110 level = 1, C/100 level = 2.','Corrected formula:','Final plates = max(1, taper plates + rail beam level - bearing beam level)','The bearing beam level is used as the reference, not the nearest rail beam level.','',`Module Support Plates / Side = ${n(row['Module Support Plates / Side'])}`,`Module Support Plates / Tracker = ${n(row['Module Support Plates / Tracker'])}`);
  const baseModuleQty=Math.max(E.asInt(row['PV Modules per Tracker'])-2,0),bearing110=E.asInt(row['Bearing 110 / Tracker']),bearing100=E.asInt(row['Bearing 100 / Tracker']);
  lines.push('4) MODULE SUPPORT PLATE K001099 / PLUSS00173BZ00 CALCULATION','-'.repeat(90),'TEMPORARY CALCULATION NOTE:','PV Module Support Plate / Tracker = (PV modules − 2) + (2 × Bearing 110) + (6 × Bearing 100).','',`PV modules − 2 = ${n(baseModuleQty)}`,`2 × Bearing 110 = 2 × ${n(bearing110)} = ${n(2*bearing110)}`,`6 × Bearing 100 = 6 × ${n(bearing100)} = ${n(6*bearing100)}`,`Module Support Plates / Tracker = ${n(baseModuleQty)} + ${n(2*bearing110)} + ${n(6*bearing100)} = ${n(row['Module Support Plates / Tracker'])}`,`Module Support Plates / Side = ${n(row['Module Support Plates / Side'])}`);
  return E.displayTerminology(lines.join('\n'));
}
function renderLogic(){
  ensureLogicSelection();const p=getActiveProject(),opts=logicOptions();const root=document.getElementById('tabLogic');root.innerHTML=`<div class="logic-top"><label>Show logic for PV / Tracker:</label><select id="logicPv">${opts.map(r=>{const v=String(r['PV Modules per Tracker']);return `<option ${v===String(p.selected_logic_pv)?'selected':''}>${v}</option>`;}).join('')}</select></div><div class="logic-box">${escapeHtml(buildLogicText())}</div>`;
  document.getElementById('logicPv').addEventListener('change',e=>{p.selected_logic_pv=e.target.value;p.is_dirty=true;saveRecovery();renderLogic();});
}
function sketchOptions(){return current.active.length?current.active:current.schedule;}
function sketchRowKey(row){return String(row?._schedule_key||`${E.asInt(row?.['PV Modules per Tracker'],0)}:default`);}
function sketchRowLabel(row){return `${row['PV Modules per Tracker']}-PV — ${row['Bearing Rule Mode']||'Symmetrical'}`;}
function ensureSketchSelection(){const p=getActiveProject(),rows=sketchOptions(),keys=rows.map(sketchRowKey);if(keys.includes(String(p.selected_sketch_pv)))return;const legacyPv=Number(p.selected_sketch_pv),legacyRow=Number.isFinite(legacyPv)?rows.find(row=>E.asInt(row['PV Modules per Tracker'])===legacyPv):null;p.selected_sketch_pv=legacyRow?sketchRowKey(legacyRow):(keys[0]||'');}
function trackerSketchSupportPlateQuantity(rail){
  let quantity=E.asInt(rail?.['Final Plates / Rail / Side'],0);const railType=String(rail?.['Rail Type']||''),influence=String(rail?.['Influence Bearing']||'');
  if(railType==='Z Rail')quantity+=1;
  if(railType==='Hat Rail'&&influence.includes('Bearing 100'))quantity=Math.max(0,quantity-1);
  return quantity;
}
function svgEsc(v){return escapeHtml(v);}
function buildSketchSvg(row,width=1200,height=700){
  const n=E.niceNumber;const centerY=height/2+15,leftMargin=90,rightMargin=230;
  const zoneA=E.asNumber(row['Zone A End (120)'],0),zoneB=E.asNumber(row['Zone B End (110)'],0),zoneCN=E.asNumber(row['Main Tube C End North from Midplane']??row['Main Tube C End from Midplane'],0),zoneCS=E.asNumber(row['Main Tube C End South from Midplane']??row['Main Tube C End from Midplane'],0),cStart=E.asNumber(row['Main Tube C Start from Midplane']??row['Base Until C']??zoneB,zoneB),cEndN=E.asNumber(row['Main Tube C Actual End North from Midplane']??cStart,cStart),cEndS=E.asNumber(row['Main Tube C Actual End South from Midplane']??cStart,cStart),cReqN=E.asNumber(row['Main Tube C Required Length North'],0),cReqS=E.asNumber(row['Main Tube C Required Length South'],0),hasC=cReqN>0||cReqS>0,total=Math.max(zoneCN+zoneCS,E.asNumber(row['Tracker Length (mm)'],1),1),usable=Math.max(300,width-leftMargin-rightMargin),scale=usable/total,centerX=leftMargin+zoneCS*scale,x=mm=>centerX+mm*scale;
  const overlapAb=E.asNumber(row['Overlap A/B (mm)'],0),overlapBc=E.asNumber(row['Overlap B/C (mm)'],0),overlapAbStart=E.asNumber(row['A/B Overlap Start from Midplane'],Math.max(0,zoneA-overlapAb)),overlapBcStart=E.asNumber(row['B/C Overlap Start from Midplane'],Math.max(0,zoneB-overlapBc));
  const parts=[];const rect=(x1,y1,x2,y2,fill,stroke='#111827',sw=1,opacity=1)=>parts.push(`<rect x="${Math.min(x1,x2)}" y="${Math.min(y1,y2)}" width="${Math.abs(x2-x1)}" height="${Math.abs(y2-y1)}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${sw}"/>`);const line=(x1,y1,x2,y2,stroke,w=1)=>parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`);const text=(xx,yy,t,size=10,fill='#111827',weight='normal',anchor='middle')=>parts.push(`<text x="${xx}" y="${yy}" font-family="Calibri,Arial,sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="middle">${svgEsc(t)}</text>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>`);
  text(20,22,`Tracker Sketch Preview - ${row['PV Modules per Tracker']} PV`,16,'#111827','bold','start');text(20,46,`Bearing Rule: ${row['Bearing Rule Source']} | ${row['Bearing Rule Mode']||'Symmetrical'}`,10,'#52616B','normal','start');
  const rails=row._module_support_rows||row._module_support_rows_right||[];const bySide={North:rails.filter(r=>(r.Side||'North')==='North').sort((a,b)=>E.asNumber(a['Distance from Mid Plane (mm)'])-E.asNumber(b['Distance from Mid Plane (mm)'])),South:rails.filter(r=>(r.Side||'North')==='South').sort((a,b)=>E.asNumber(a['Distance from Mid Plane (mm)'])-E.asNumber(b['Distance from Mid Plane (mm)']))};
  if(uiState.showPv){const top=centerY-70,bottom=centerY-28;for(const side of ['North','South']){const rr=bySide[side];for(let i=0;i<rr.length-1;i++){const p1=E.asNumber(rr[i]['Signed Distance from Mid Plane (mm)']),p2=E.asNumber(rr[i+1]['Signed Distance from Mid Plane (mm)']),x1=x(p1),x2=x(p2);rect(x1,top,x2,bottom,'#F3F4F6','#9CA3AF');const w=Math.max(Math.abs(x2-x1),1),sz=Math.max(7,Math.min(11,Math.floor(w/14)));text((x1+x2)/2,(top+bottom)/2,String(i+1),sz,'#374151','bold');}}}
  if(uiState.showBeams){
    const y1=centerY-8,y2=centerY+8;rect(x(-zoneB),y1,x(-zoneA),y2,'#BFDBFE','#1D4ED8');rect(x(-zoneA),y1,x(0),y2,'#C7F9CC','#15803D');if(cReqS>0)rect(x(-cEndS),y1,x(-cStart),y2,'#FDE68A','#B45309');rect(x(0),y1,x(zoneA),y2,'#C7F9CC','#15803D');rect(x(zoneA),y1,x(zoneB),y2,'#BFDBFE','#1D4ED8');if(cReqN>0)rect(x(cStart),y1,x(cEndN),y2,'#FDE68A','#B45309');
    if(overlapAb>0){rect(x(-zoneA),y1-4,x(-overlapAbStart),y2+4,'#FCA5A5','#B91C1C',1.5,.72);rect(x(overlapAbStart),y1-4,x(zoneA),y2+4,'#FCA5A5','#B91C1C',1.5,.72);}
    if(overlapBc>0&&cReqS>0)rect(x(-zoneB),y1-4,x(-overlapBcStart),y2+4,'#FCA5A5','#B91C1C',1.5,.72);
    if(overlapBc>0&&cReqN>0)rect(x(overlapBcStart),y1-4,x(zoneB),y2+4,'#FCA5A5','#B91C1C',1.5,.72);
  }else line(x(-zoneCS),centerY,x(zoneCN),centerY,'#D1D5DB',1);
  const postTop=centerY+12,postBottom=centerY+105;line(centerX,centerY-22,centerX,postBottom+12,'#111827',3);for(const b of row._bearing_rows||[]){const pos=E.asNumber(b['Distance from Main Post (mm)']);line(x(pos),postTop,x(pos),postBottom,'#374151',2);}
  const hasClearanceWarnings=rails.some(r=>r['Rail Type']==='Hat Rail'&&r['Clearance Status']==='Warning');
  if(uiState.showRails){for(const r of rails){const pos=E.asNumber(r['Signed Distance from Mid Plane (mm)']??r['Distance from Mid Plane (mm)']),warning=r['Rail Type']==='Hat Rail'&&r['Clearance Status']==='Warning';line(x(pos),centerY-82,x(pos),centerY+24,warning?'#DC2626':'#F28C28',warning?6:4);if(warning)text(x(pos),centerY-112,'!',15,'#DC2626','bold');}}
  if(uiState.showSupport){for(const r of rails){const pos=E.asNumber(r['Signed Distance from Mid Plane (mm)']??r['Distance from Mid Plane (mm)']);text(x(pos),centerY-96,String(trackerSketchSupportPlateQuantity(r)),10,'#DC2626','bold');}}
  const dimY=centerY+135;line(x(-zoneCS),dimY,x(zoneCN),dimY,'#2563EB',1.5);line(x(-zoneCS),dimY-5,x(-zoneCS),dimY+5,'#2563EB');line(x(zoneCN),dimY-5,x(zoneCN),dimY+5,'#2563EB');text(centerX,dimY+16,`Tracker length: ${n(total)} mm`,10,'#2563EB','bold');if(Number(row['PV Modules per Tracker'])%2===1)text(centerX,dimY+34,`Odd PV layout: North side ${row['Modules / North Side']} modules, South side ${row['Modules / South Side']} modules`,9,'#B45309','bold');
  const distances=[...new Set((row._bearing_rows||[]).map(b=>Math.abs(E.asNumber(b['Distance from Main Post (mm)']))).filter(v=>v>0))].sort((a,b)=>a-b);distances.forEach((dist,idx)=>{const y=dimY+52+idx*18;if(y>height-26)return;for(const sign of [-1,1]){const ex=x(sign*dist);line(centerX,y,ex,y,'#2563EB',1);line(ex,y-4,ex,y+4,'#2563EB',1);}line(centerX,y-4,centerX,y+4,'#2563EB',1);text(centerX,y-8,`±${n(dist)} mm`,8,'#2563EB','bold');});
  const lx=width-rightMargin+35;let ly=57;rect(lx-12,40,width-20,330,'#FFFFFF','#D1D5DB');text(lx,ly,'Legend',12,'#111827','bold','start');ly=95;
  const legend=(color,label,kind='line',outline='#111827')=>{if(kind==='rect')rect(lx,ly-6,lx+24,ly+6,color,outline);else if(kind==='text')text(lx+12,ly,'#',10,color,'bold');else line(lx,ly,lx+24,ly,color,5);text(lx+34,ly,label,9,'#111827','normal','start');ly+=26;};
  if(uiState.showPv)legend('#F3F4F6','PV module','rect','#9CA3AF');if(uiState.showRails)legend('#F28C28','Module rail');if(uiState.showRails&&hasClearanceWarnings)legend('#DC2626','Hat Rail clearance warning');if(uiState.showSupport)legend('#DC2626','Support plate quantity','text');if(uiState.showBeams){legend('#C7F9CC','Torque Tube A / 120','rect','#15803D');legend('#BFDBFE','Torque Tube B / 110','rect','#1D4ED8');if(hasC)legend('#FDE68A','Torque Tube C / 100','rect','#B45309');legend('#FCA5A5','Torque Tube overlap','rect','#B91C1C');}legend('#374151','Drive Pile reference');parts.push('</svg>');return parts.join('');
}
function removeSketchMagnifierLens(clearPointer=true){
  document.getElementById('sketchMagnifierLens')?.remove();if(clearPointer)sketchMagnifierPointer=null;
}
function updateSketchMagnifier(event){
  if(!uiState.sketchMagnifierEnabled)return;const box=document.getElementById('sketchBox'),source=box?.querySelector('svg');if(!box||!source)return;
  const sourceRect=source.getBoundingClientRect(),clientX=Number(event.clientX),clientY=Number(event.clientY);
  if(!Number.isFinite(clientX)||!Number.isFinite(clientY)||clientX<sourceRect.left||clientX>sourceRect.right||clientY<sourceRect.top||clientY>sourceRect.bottom){removeSketchMagnifierLens();return;}
  sketchMagnifierPointer={clientX,clientY};let lens=document.getElementById('sketchMagnifierLens');
  if(!lens){
    lens=document.createElement('div');lens.id='sketchMagnifierLens';lens.className='sketch-magnifier-lens';lens.setAttribute('aria-hidden','true');lens.innerHTML='<div class="sketch-magnifier-content"></div><span class="sketch-magnifier-badge"></span>';document.body.appendChild(lens);
  }
  const content=lens.querySelector('.sketch-magnifier-content');let clone=content.querySelector('svg');
  if(lens._source!==source||!clone){content.replaceChildren();clone=source.cloneNode(true);clone.removeAttribute('id');content.appendChild(clone);lens._source=source;}
  const level=SKETCH_MAGNIFICATION_LEVELS.includes(Number(uiState.sketchMagnification))?Number(uiState.sketchMagnification):2,lensRadius=(content.getBoundingClientRect().width||230)/2,sourceX=clientX-sourceRect.left,sourceY=clientY-sourceRect.top;
  lens.style.left=`${clientX}px`;lens.style.top=`${clientY}px`;clone.style.position='absolute';clone.style.display='block';clone.style.width=`${sourceRect.width}px`;clone.style.height=`${sourceRect.height}px`;clone.style.minWidth='0';clone.style.maxWidth='none';clone.style.left=`${lensRadius-sourceX*level}px`;clone.style.top=`${lensRadius-sourceY*level}px`;clone.style.transformOrigin='0 0';clone.style.transform=`scale(${level})`;lens.querySelector('.sketch-magnifier-badge').textContent=`${level}×`;
}
function setSketchMagnifierEnabled(enabled){
  uiState.sketchMagnifierEnabled=!!enabled;const button=document.getElementById('sketchMagnifierToggle'),box=document.getElementById('sketchBox');button?.classList.toggle('active',uiState.sketchMagnifierEnabled);button?.setAttribute('aria-pressed',String(uiState.sketchMagnifierEnabled));box?.classList.toggle('magnifier-enabled',uiState.sketchMagnifierEnabled);if(!uiState.sketchMagnifierEnabled)removeSketchMagnifierLens();
}
function wireSketchMagnifier(){
  const box=document.getElementById('sketchBox'),button=document.getElementById('sketchMagnifierToggle'),levelSelect=document.getElementById('sketchMagnification');if(!box||!button||!levelSelect)return;
  setSketchMagnifierEnabled(uiState.sketchMagnifierEnabled);button.addEventListener('click',()=>setSketchMagnifierEnabled(!uiState.sketchMagnifierEnabled));levelSelect.addEventListener('change',()=>{const level=Number(levelSelect.value);uiState.sketchMagnification=SKETCH_MAGNIFICATION_LEVELS.includes(level)?level:2;if(sketchMagnifierPointer)updateSketchMagnifier(sketchMagnifierPointer);});box.addEventListener('pointerenter',updateSketchMagnifier);box.addEventListener('pointermove',updateSketchMagnifier);box.addEventListener('pointerleave',()=>removeSketchMagnifierLens());box.addEventListener('scroll',()=>removeSketchMagnifierLens());
}
function hatRailClearanceStatusHtml(row){
  const warnings=Array.isArray(row?.['Hat Rail Installation Warnings'])?row['Hat Rail Installation Warnings']:[];
  if(warnings.length)return `<div class="sketch-clearance-status warning" role="alert"><strong>Hat Rail installation clearance warning</strong><span>Correct the following rail positions before installation:</span><ul>${warnings.map(warning=>`<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`;
  return '<div class="sketch-clearance-status success" role="status"><strong>Hat Rail installation clearances are OK</strong><span>Every Hat Rail is at least 50 mm from a torque-tube overlap and 100 mm from a Bearing Pile.</span></div>';
}
function hatRailClearanceTableHtml(row){
  const rails=(row?._module_support_rows||[]).filter(rail=>rail['Rail Type']==='Hat Rail');
  const columns=['Side','Hat Rail','Adjacent PV Modules','Position from Drive Pile (mm)','Sits On','Closest Torque Tube Overlap / Gap','Closest Bearing Pile / Gap','Status'];
  const rows=rails.map(rail=>{
    const overlapGap=rail['Overlap Clearance (mm)']===''?'—':`${E.niceNumber(rail['Overlap Clearance (mm)'])} mm`;
    const bearingGap=rail['Bearing Pile Clearance (mm)']===''?'—':`${E.niceNumber(rail['Bearing Pile Clearance (mm)'])} mm`;
    return {
      Side:rail.Side,
      'Hat Rail':`Hat Rail ${rail['Hat Rail No.']}`,
      'Adjacent PV Modules':rail['PV Modules'],
      'Position from Drive Pile (mm)':E.niceNumber(Math.abs(E.asNumber(rail['Signed Distance from Mid Plane (mm)']??rail['Distance from Mid Plane (mm)'],0))),
      'Sits On':rail['Sits On'],
      'Closest Torque Tube Overlap / Gap':`${rail['Nearest Torque Tube Overlap']} — ${overlapGap}`,
      'Closest Bearing Pile / Gap':`${rail['Nearest Bearing Pile']} — ${bearingGap}`,
      Status:rail['Clearance Status'],
    };
  });
  return makeArrayTable(columns,rows,{framed:true});
}
function renderSketch(){
  removeSketchMagnifierLens();ensureSketchSelection();const p=getActiveProject(),opts=sketchOptions();const root=document.getElementById('tabSketch');root.innerHTML=`<div class="sketch-top"><label>Sketch for PV / Tracker:</label><select id="sketchPv">${opts.map(r=>{const v=sketchRowKey(r);return `<option value="${escapeHtml(v)}" ${v===String(p.selected_sketch_pv)?'selected':''}>${escapeHtml(sketchRowLabel(r))}</option>`;}).join('')}</select><span class="subtitle" style="margin:0 0 0 12px">This is a simple logic sketch, not a CAD drawing.</span><button id="saveSketch" style="margin-left:auto;background:#F99A1C;color:white;border-color:#C96F00">Save High-Resolution Image</button></div><div class="sketch-options"><strong>Show:</strong>${[['PV Modules','showPv'],['Support plates','showSupport'],['Module Rails','showRails'],['Torque Tubes','showBeams']].map(([label,key])=>`<label><input type="checkbox" data-sketch-option="${key}" ${uiState[key]?'checked':''}> ${label}</label>`).join('')}<div class="sketch-magnifier-controls"><button id="sketchMagnifierToggle" class="sketch-magnifier-button" type="button" aria-pressed="${uiState.sketchMagnifierEnabled}" title="Turn the sketch magnifier on or off"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5M10.5 7.5v6m-3-3h6"></path></svg><span>Magnifier</span></button><label for="sketchMagnification">Zoom<select id="sketchMagnification">${SKETCH_MAGNIFICATION_LEVELS.map(level=>`<option value="${level}" ${Number(uiState.sketchMagnification)===level?'selected':''}>${level}×</option>`).join('')}</select></label></div></div><div id="sketchClearanceStatus"></div><div id="sketchBox" class="sketch-box"></div><section class="sketch-clearance-details"><h2 class="table-title">Hat Rail Installation Check</h2><p class="table-subtitle">Positions use the Drive Pile centerline. Required minimum gap: 50 mm from torque-tube overlaps and 100 mm from Bearing Piles.</p><div id="sketchClearanceTable"></div></section>`;
  document.getElementById('sketchPv').addEventListener('change',e=>{p.selected_sketch_pv=e.target.value;p.is_dirty=true;saveRecovery();drawSketch();});root.querySelectorAll('[data-sketch-option]').forEach(cb=>cb.addEventListener('change',()=>{uiState[cb.dataset.sketchOption]=cb.checked;drawSketch();}));document.getElementById('saveSketch').addEventListener('click',saveHighResSketch);wireSketchMagnifier();drawSketch();
}
function drawSketch(){
  removeSketchMagnifierLens();const box=document.getElementById('sketchBox'),status=document.getElementById('sketchClearanceStatus'),table=document.getElementById('sketchClearanceTable');if(!box||!current)return;ensureSketchSelection();const key=String(getActiveProject().selected_sketch_pv),row=sketchOptions().find(item=>sketchRowKey(item)===key);box.innerHTML=row?buildSketchSvg(row,1200,700):'<div style="padding:20px">No data available.</div>';if(status)status.innerHTML=row?hatRailClearanceStatusHtml(row):'';if(table)table.innerHTML=row?hatRailClearanceTableHtml(row):'';
}
function pngCrcTable(){if(pngCrcTable.table)return pngCrcTable.table;const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return pngCrcTable.table=t;}
function crc32Png(bytes){let c=0xffffffff,t=pngCrcTable();for(const b of bytes)c=t[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function setBe32(view,offset,n){view.setUint32(offset,n>>>0,false);}
async function addPng300Dpi(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length<33)return blob;const type=new TextEncoder().encode('pHYs'),data=new Uint8Array(9),dv=new DataView(data.buffer);dv.setUint32(0,11811,false);dv.setUint32(4,11811,false);data[8]=1;const crcInput=new Uint8Array(13);crcInput.set(type,0);crcInput.set(data,4);const chunk=new Uint8Array(21),cdv=new DataView(chunk.buffer);setBe32(cdv,0,9);chunk.set(type,4);chunk.set(data,8);setBe32(cdv,17,crc32Png(crcInput));const insertAt=33,out=new Uint8Array(bytes.length+chunk.length);out.set(bytes.slice(0,insertAt),0);out.set(chunk,insertAt);out.set(bytes.slice(insertAt),insertAt+chunk.length);return new Blob([out],{type:'image/png'});
}
async function saveHighResSketch(){
  const p=getActiveProject(),row=sketchOptions().find(item=>sketchRowKey(item)===String(p.selected_sketch_pv));if(!row)return;const pv=E.asInt(row['PV Modules per Tracker']),mode=safeFilename(row['Bearing Rule Mode']||'Symmetrical');const filename=`${safeFilename(p.project_code)}_${safeFilename(p.project_name)}_Tracker_Sketch_${pv}PV_${mode}.png`,location=await chooseSaveLocation(filename,'PNG image',{'image/png':['.png']});if(location.cancelled)return;
  const svg=buildSketchSvg(row,1200,700),blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=3600;canvas.height=2100;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob(async png=>{if(!png){showToast('Could not generate the sketch image.');return;}const dpi=await addPng300Dpi(png),result=await writeBlobToSaveLocation(dpi,filename,location);if(result.saved)showToast(result.picker?'High-resolution tracker sketch saved.':'High-resolution tracker sketch downloaded.');},'image/png');};img.onerror=()=>{URL.revokeObjectURL(url);showToast('Could not generate the sketch image.');};img.src=url;
}

function formatAnalysisNumber(value,maxDigits=2){
  const number=Number(value);if(!Number.isFinite(number))return '';
  return number.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:maxDigits});
}
function formatAnalysisFixed(value,digits=2){
  const number=Number(value);return (Number.isFinite(number)?number:0).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
function currencyDisplay(code){return window.LumaCurrencyData.display(code);}
function currencyAmount(value,code,digits=2){return `${formatAnalysisFixed(value,digits)} ${currencyDisplay(code)}`.trim();}
function isSteelStructureAnalysisRow(row){return E.normalizeText(row?.Category).includes('steelstructure');}
function steelAnalysisMaterial(row){const material=String(row?.Material??'').trim();return material==='-'?'':material;}
function steelPricingMode(project=getActiveProject()){return normalizeSteelPricingMode(project?.analysis_steel_pricing_mode);}
function buildSteelAnalysisData(){
  const p=getActiveProject();
  const priceRecords=normalizeAnalysisMaterialPrices(p?.analysis_material_prices);
  const steelRows=(current?.bom?.rows||[]).filter(isSteelStructureAnalysisRow);
  const materials=[...new Set(steelRows.map(steelAnalysisMaterial).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const requestedMaterial=String(p?.analysis_material_filter||'ALL');
  const selectedMaterial=requestedMaterial==='ALL'||materials.includes(requestedMaterial)?requestedMaterial:'ALL';
  const mappedRows=steelRows.map(row=>{
    const material=steelAnalysisMaterial(row);
    const quantity=Math.max(0,E.asNumber(row['Total Qty'],0));
    const rawWeight=row.Weight;
    const unitWeight=rawWeight!==''&&rawWeight!==null&&rawWeight!==undefined&&Number.isFinite(Number(rawWeight))&&Number(rawWeight)>=0?Number(rawWeight):null;
    const totalWeight=unitWeight===null?null:unitWeight*quantity;
    const priceRecord=priceRecords[material]||null;
    const calculatedCost=totalWeight!==null&&priceRecord?totalWeight*priceRecord.price_per_kg:null;
    return {source:row,material,quantity,unitWeight,totalWeight,priceRecord,calculatedCost};
  });
  const filteredRows=selectedMaterial==='ALL'?mappedRows:mappedRows.filter(item=>item.material===selectedMaterial);
  const sumWeight=rows=>rows.reduce((sum,item)=>sum+(item.totalWeight??0),0);
  const materialWeights={};for(const item of mappedRows)if(item.material)materialWeights[item.material]=(materialWeights[item.material]||0)+(item.totalWeight??0);
  const allCostByCurrency={};for(const item of mappedRows)if(item.calculatedCost!==null){const currency=item.priceRecord.currency;allCostByCurrency[currency]=(allCostByCurrency[currency]||0)+item.calculatedCost;}
  const costByCurrency={};for(const item of filteredRows)if(item.calculatedCost!==null){const currency=item.priceRecord.currency;costByCurrency[currency]=(costByCurrency[currency]||0)+item.calculatedCost;}
  const allUnpricedMaterials=[...new Set(mappedRows.filter(item=>item.totalWeight>0&&item.material&&!item.priceRecord).map(item=>item.material))].sort((a,b)=>a.localeCompare(b));
  const unpricedMaterials=[...new Set(filteredRows.filter(item=>item.totalWeight>0&&item.material&&!item.priceRecord).map(item=>item.material))].sort((a,b)=>a.localeCompare(b));
  const tableRows=filteredRows.map(item=>analysisProjectBomRow(item.source,{
    'Unit Weight (kg)':item.unitWeight===null?'Missing':formatAnalysisNumber(item.unitWeight,3),
    'Total Weight (kg)':item.totalWeight===null?'Not calculated':formatAnalysisNumber(item.totalWeight,2),
    'Registered Price / kg':item.priceRecord?formatAnalysisNumber(item.priceRecord.price_per_kg,4):'Not registered',
    'Price Currency':item.priceRecord?currencyDisplay(item.priceRecord.currency):'',
    'Calculated Cost':item.calculatedCost===null?'Not calculated':formatAnalysisFixed(item.calculatedCost,2),
  }));
  const registeredPriceRows=Object.values(priceRecords).sort((a,b)=>a.material.localeCompare(b.material)).map(record=>{
    const weight=materialWeights[record.material]||0;
    return {'Material':record.material,'Price / kg':formatAnalysisNumber(record.price_per_kg,4),'Currency':currencyDisplay(record.currency),'Current Weight (kg)':formatAnalysisNumber(weight,2),'Current Estimated Cost':currencyAmount(weight*record.price_per_kg,record.currency)};
  });
  const totalPowerKw=Math.max(0,E.asNumber(current?.kpis?.totalPower,0)*1000);
  return {
    materials,selectedMaterial,tableRows,priceRecords,registeredPriceRows,costByCurrency,allCostByCurrency,unpricedMaterials,allUnpricedMaterials,
    totalSteelWeight:sumWeight(mappedRows),
    filteredWeight:sumWeight(filteredRows),
    missingMaterialCount:filteredRows.filter(item=>item.quantity>0&&!item.material).length,
    allMissingMaterialCount:mappedRows.filter(item=>item.quantity>0&&!item.material).length,
    missingWeightCount:filteredRows.filter(item=>item.quantity>0&&item.unitWeight===null).length,
    allMissingWeightCount:mappedRows.filter(item=>item.quantity>0&&item.unitWeight===null).length,
    kgPerKw:totalPowerKw>0?sumWeight(mappedRows)/totalPowerKw:0,
  };
}
function analysisBackButtonHtml(){
  return `<button id="analysisBackBtn" class="analysis-back-button" type="button" aria-label="Back to Analysis home" title="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg></button>`;
}
function wireAnalysisBackButton(){
  document.getElementById('analysisBackBtn')?.addEventListener('click',()=>{uiState.analysisPage='home';renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function steelPricingModeSwitchHtml(mode){
  const selected=normalizeSteelPricingMode(mode);
  return `<div class="analysis-mode-switch" role="group" aria-label="Steel structure pricing mode"><button class="analysis-mode-button ${selected==='material'?'active':''}" type="button" data-steel-pricing-mode="material" aria-pressed="${selected==='material'}">Material Mode</button><button class="analysis-mode-button ${selected==='part'?'active':''}" type="button" data-steel-pricing-mode="part" aria-pressed="${selected==='part'}">Part Mode</button></div>`;
}
function wireSteelPricingModeSwitch(){
  const p=getActiveProject();if(!p)return;
  document.querySelectorAll('[data-steel-pricing-mode]').forEach(button=>button.addEventListener('click',()=>{const mode=normalizeSteelPricingMode(button.dataset.steelPricingMode);if(mode===steelPricingMode(p))return;p.analysis_steel_pricing_mode=mode;markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}));
}
function pvModuleProcurementSwitchHtml(project){
  const included=isPvModuleIncluded(project);
  return `<section class="analysis-procurement-control" aria-labelledby="pvModuleProcurementLabel"><div><strong id="pvModuleProcurementLabel">PV Module Procurement</strong><span>${included?'Included in the project price and all downstream calculations.':'Excluded from the project price because the PV modules are client supplied.'}</span></div><div class="analysis-mode-switch" role="group" aria-label="PV Module procurement inclusion"><button class="analysis-mode-button ${included?'active':''}" type="button" data-pv-module-included="true" aria-pressed="${included}">Included</button><button class="analysis-mode-button ${included?'':'active'}" type="button" data-pv-module-included="false" aria-pressed="${!included}">Excluded</button></div></section>`;
}
function wirePvModuleProcurementSwitch(){
  const project=getActiveProject();if(!project)return;
  document.querySelectorAll('[data-pv-module-included]').forEach(button=>button.addEventListener('click',()=>{const included=button.dataset.pvModuleIncluded==='true';if(included===isPvModuleIncluded(project))return;project.analysis_pv_module_included=included;markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);showToast(included?'PV Module cost included in the project price.':'PV Module cost excluded from the entire price calculation.');}));
}
function renderSteelAnalysis(){
  const root=document.getElementById('tabAnalysis'),p=getActiveProject();if(!root||!p)return;
  if(steelPricingMode(p)==='part'){renderItemCostAnalysis('steel');return;}
  const data=buildSteelAnalysisData();
  if(p.analysis_material_filter!==data.selectedMaterial)p.analysis_material_filter=data.selectedMaterial;
  const filterLabel=data.selectedMaterial==='ALL'?'All materials':data.selectedMaterial;
  const priceMaterials=[...new Set([...data.materials,...Object.keys(data.priceRecords)])].sort((a,b)=>a.localeCompare(b));
  let editorMaterial=String(uiState.analysisPriceEditor[p.project_id]||'');if(!priceMaterials.includes(editorMaterial))editorMaterial='';
  const editorRecord=data.priceRecords[editorMaterial]||null;
  const totalCostEntries=Object.entries(data.costByCurrency).sort(([a],[b])=>a.localeCompare(b));
  const totalCostHtml=totalCostEntries.length?totalCostEntries.map(([currency,cost])=>`<span>${escapeHtml(currencyAmount(cost,currency))}</span>`).join(''):'<span>0.00</span>';
  const selectedPrice=data.selectedMaterial==='ALL'?`${data.registeredPriceRows.length} material price(s) registered`:(data.priceRecords[data.selectedMaterial]?`${formatAnalysisNumber(data.priceRecords[data.selectedMaterial].price_per_kg,4)} ${currencyDisplay(data.priceRecords[data.selectedMaterial].currency)} / kg`:'Not registered');
  const warnings=[];if(data.missingMaterialCount)warnings.push(`${data.missingMaterialCount} filtered steel-structure item(s) have no material specified and are excluded from cost totals.`);if(data.missingWeightCount)warnings.push(`${data.missingWeightCount} filtered steel-structure item(s) have no valid unit weight and are excluded from weight and cost totals.`);if(data.unpricedMaterials.length)warnings.push(`No price registered for: ${data.unpricedMaterials.join(', ')}. These materials are excluded from cost totals.`);
  const warningHtml=warnings.length?`<div class="analysis-warning">${warnings.map(message=>`<div>${escapeHtml(message)}</div>`).join('')}</div>`:'';
  root.innerHTML=`<div class="analysis-title-row"><div><h2 class="table-title">Steel Structure Weight and Cost Analysis</h2><p class="table-subtitle">Weight is calculated from Project BOM steel-structure rows: Unit Weight × Total Qty.</p></div><div class="analysis-ratio"><span>kg / kW</span><strong>${formatAnalysisFixed(data.kgPerKw,2)} kg/kW</strong></div></div><div class="analysis-controls analysis-filter-controls"><label for="analysisMaterial">Filter steel structure by material<select id="analysisMaterial"><option value="ALL" ${data.selectedMaterial==='ALL'?'selected':''}>All materials</option>${data.materials.map(material=>`<option value="${escapeHtml(material)}" ${material===data.selectedMaterial?'selected':''}>${escapeHtml(material)}</option>`).join('')}</select></label></div><div class="analysis-summary"><div class="analysis-card"><span>Total Steel Structure Weight</span><strong>${formatAnalysisNumber(data.totalSteelWeight,2)} kg</strong></div><div class="analysis-card"><span>Filtered Weight — ${escapeHtml(filterLabel)}</span><strong>${formatAnalysisNumber(data.filteredWeight,2)} kg</strong></div><div class="analysis-card"><span>Registered Price</span><strong>${escapeHtml(selectedPrice)}</strong></div><div class="analysis-card analysis-cost-card"><span>Total Cost</span><strong class="analysis-cost-lines">${totalCostHtml}</strong></div></div>${warningHtml}<h2 class="table-title analysis-detail-title">Material Price Register</h2><p class="table-subtitle">Select a material to add a price. Select an existing registration to update or delete it.</p><div class="analysis-controls analysis-price-controls"><label for="analysisPriceMaterial">Material<select id="analysisPriceMaterial"><option value="">Select material</option>${priceMaterials.map(material=>`<option value="${escapeHtml(material)}" ${material===editorMaterial?'selected':''}>${escapeHtml(material)}</option>`).join('')}</select></label><label for="analysisPrice">Price / kg<input id="analysisPrice" type="number" min="0" step="any" value="${editorRecord?escapeHtml(editorRecord.price_per_kg):''}" placeholder="Enter price per kg"></label><label for="analysisCurrency">Currency<select id="analysisCurrency">${ANALYSIS_CURRENCIES.map(currency=>`<option value="${currency.code}" ${currency.code===(editorRecord?.currency||'USD')?'selected':''}>${escapeHtml(window.LumaCurrencyData.optionLabel(currency.code))}</option>`).join('')}</select></label><div class="analysis-price-actions"><button id="analysisPriceAdd" ${!editorMaterial||editorRecord?'disabled':''}>Add</button><button id="analysisPriceUpdate" ${!editorRecord?'disabled':''}>Update</button><button id="analysisPriceDelete" class="danger" ${!editorRecord?'disabled':''}>Delete</button></div></div><div id="analysisPriceRegistry">${makeAnalysisTable(['Material','Price / kg','Currency','Current Weight (kg)','Current Estimated Cost'],data.registeredPriceRows)}</div><h2 class="table-title analysis-detail-title">Filtered Steel Structure Details</h2>${makeAnalysisTable(analysisProjectBomColumns(['Unit Weight (kg)','Total Weight (kg)','Registered Price / kg','Price Currency','Calculated Cost']),data.tableRows)}`;
  root.insertAdjacentHTML('afterbegin',`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div>${steelPricingModeSwitchHtml('material')}`);
  document.getElementById('analysisMaterial').addEventListener('change',e=>{p.analysis_material_filter=e.target.value;markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
  document.getElementById('analysisPriceMaterial').addEventListener('change',e=>{uiState.analysisPriceEditor[p.project_id]=e.target.value;renderAnalysis();});
  const readEditor=()=>{const material=document.getElementById('analysisPriceMaterial').value,rawPrice=document.getElementById('analysisPrice').value.trim(),price=Number(rawPrice),currency=document.getElementById('analysisCurrency').value;if(!material){showToast('Select a material first.');return null;}if(rawPrice===''||!Number.isFinite(price)||price<0){showToast('Enter a valid price per kg.');return null;}return {material,price_per_kg:price,currency:isAnalysisCurrency(currency)?currency:'USD'};};
  document.getElementById('analysisPriceAdd').addEventListener('click',()=>{const record=readEditor();if(!record)return;if(p.analysis_material_prices[record.material]){showToast('This material already has a registered price. Use Update.');return;}p.analysis_material_prices[record.material]=record;markDirty();renderAnalysis();showToast(`Price added for ${record.material}.`);});
  document.getElementById('analysisPriceUpdate').addEventListener('click',()=>{const record=readEditor();if(!record||!p.analysis_material_prices[record.material])return;p.analysis_material_prices[record.material]=record;markDirty();renderAnalysis();showToast(`Price updated for ${record.material}.`);});
  document.getElementById('analysisPriceDelete').addEventListener('click',()=>{const material=document.getElementById('analysisPriceMaterial').value;if(!material||!p.analysis_material_prices[material])return;if(!confirm(`Delete the registered price for ${material}?`))return;delete p.analysis_material_prices[material];markDirty();renderAnalysis();showToast(`Price deleted for ${material}.`);});
  root.querySelectorAll('#analysisPriceRegistry tbody tr').forEach((row,index)=>{const material=data.registeredPriceRows[index]?.Material;if(material===editorMaterial)row.classList.add('row-selected');row.addEventListener('click',()=>{uiState.analysisPriceEditor[p.project_id]=material;renderAnalysis();});});
  wireAnalysisBackButton();
  wireSteelPricingModeSwitch();
}

const ANALYSIS_ITEM_PAGE_CONFIG=Object.freeze({
  posts:{title:'Posts',subtitle:'Drive Pile and Bearing Pile supplier pricing by BOM TAG.'},
  substructure:{title:'Substructure',subtitle:'Read-only supplier pricing for structural items other than posts.'},
  bearing:{title:'Bearing',subtitle:'Read-only supplier pricing for bearing components.'},
  slew_drive:{title:'Slew Drive',subtitle:'Read-only supplier pricing for slew-drive components.'},
  pv_module:{title:'PV Module',subtitle:'Read-only supplier pricing for PV modules.'},
  limit_switch:{title:'Limit Switch',subtitle:'Read-only supplier pricing for limit-switch components.'},
  soltrk:{title:'SOLTRK',subtitle:'Read-only supplier pricing for SOLTRK components.'},
  junction_box:{title:'Junction Box',subtitle:'Read-only supplier pricing for junction-box components.'},
  cable_gland:{title:'Cable Gland',subtitle:'Read-only supplier pricing for cable-gland components.'},
  safeguard:{title:'Safeguard',subtitle:'Read-only supplier pricing for Safeguard components.'},
  anemometer:{title:'Anemometer',subtitle:'Read-only supplier pricing for the selected anemometer components.'},
  power_supply:{title:'Power Supply',subtitle:'Read-only supplier pricing for SCADA and control power-supply components.'},
  electrical_enclosure:{title:'Electrical Enclosure',subtitle:'Read-only supplier pricing for electrical-enclosure components.'},
  fasteners:{title:'Fasteners',subtitle:'Read-only supplier pricing by BOM TAG for fasteners, including the selected contingency.'},
});
function analysisCommercialPages(){return Object.keys(window.LumaCommercialAnalysis.SECTION_CATEGORIES).filter(page=>page!=='cat');}
function analysisLeafForRow(row){
  return window.LumaCommercialCategories.leafKeyForPart(row);
}
function analysisCategoryMatches(page,row){return analysisLeafForRow(row)===page;}
function analysisItemKey(row){
  return String(row?._bom_key||`item:${E.normalizeText(row?.TAG||row?.['Part Name']||row?.Part||row?.Description)}`);
}
function analysisItemPriceStoreKey(page){return page==='steel'?'analysis_steel_part_prices':'analysis_item_prices';}
function mergeAnalysisCurrencyTotals(target,source){
  for(const [currency,value] of Object.entries(source||{}))target[currency]=(target[currency]||0)+E.asNumber(value,0);return target;
}
function analysisCurrencyText(totals,empty='0.00'){
  const entries=Object.entries(totals||{}).filter(([,value])=>Number.isFinite(Number(value))&&Number(value)!==0).sort(([a],[b])=>a.localeCompare(b));
  return entries.length?entries.map(([currency,value])=>currencyAmount(value,currency)).join(' | '):empty;
}
function analysisCurrencyHtml(totals,empty='0.00'){
  const entries=Object.entries(totals||{}).filter(([,value])=>Number.isFinite(Number(value))&&Number(value)!==0).sort(([a],[b])=>a.localeCompare(b));
  return entries.length?entries.map(([currency,value])=>`<span>${escapeHtml(currencyAmount(value,currency))}</span>`).join(''):`<span>${escapeHtml(empty)}</span>`;
}
function buildItemCostData(page){
  const p=getActiveProject(),priceStoreKey=analysisItemPriceStoreKey(page),priceOverrides=normalizeAnalysisItemPrices(p?.[priceStoreKey]),sourceRows=(current?.bom?.rows||[]).filter(row=>analysisCategoryMatches(page,row));
  const mappedRows=sourceRows.map(row=>{
    const key=analysisItemKey(row),quantity=Math.max(0,E.asNumber(row['Total Qty'],0)),overridePriceRecord=priceOverrides[key]||null,defaultPriceRecord=defaultAnalysisItemPrice(row),priceRecord=overridePriceRecord||defaultPriceRecord,priceSource=overridePriceRecord?'user':(defaultPriceRecord?'default':'none'),calculatedCost=priceRecord?quantity*priceRecord.price_per_unit:null;
    return {key,source:row,quantity,priceRecord,overridePriceRecord,defaultPriceRecord,priceSource,calculatedCost,label:String(row['Part Name']??row.Part??row.Description??key)};
  });
  const costByCurrency={};for(const item of mappedRows)if(item.calculatedCost!==null){const currency=item.priceRecord.currency;costByCurrency[currency]=(costByCurrency[currency]||0)+item.calculatedCost;}
  const tableRows=mappedRows.map(item=>analysisProjectBomRow(item.source,{'Price / Unit':item.priceRecord?formatAnalysisNumber(item.priceRecord.price_per_unit,5):'Not registered','Price Currency':item.priceRecord?currencyDisplay(item.priceRecord.currency):'','Calculated Cost':item.calculatedCost===null?'Not calculated':formatAnalysisFixed(item.calculatedCost,2)}));
  const registeredItems=mappedRows.filter(item=>item.priceRecord);
  const registeredPriceRows=registeredItems.map(item=>({'Part Name':item.label,'TAG':item.source.TAG??'','Price / Unit':formatAnalysisNumber(item.priceRecord.price_per_unit,5),'Currency':currencyDisplay(item.priceRecord.currency),'Current Qty':formatAnalysisNumber(item.quantity,3),'Current Cost':currencyAmount(item.calculatedCost,item.priceRecord.currency)}));
  return {mappedRows,tableRows,registeredItems,registeredPriceRows,costByCurrency,priceStoreKey,pricedCount:registeredItems.filter(item=>item.quantity>0).length,defaultPricedCount:mappedRows.filter(item=>item.quantity>0&&item.priceSource==='default').length,unpricedCount:mappedRows.filter(item=>item.quantity>0&&!item.priceRecord).length};
}
function buildSelectedSteelCostData(){
  const mode=steelPricingMode();
  if(mode==='part'){
    const data=buildItemCostData('steel');
    return {mode,label:'Part Mode',totals:data.costByCurrency,gapCount:data.unpricedCount,status:`Part Mode: ${data.pricedCount} priced / ${data.unpricedCount} unpriced`,description:'Part Mode: price each steel BOM item separately.',data};
  }
  const data=buildSteelAnalysisData(),gapCount=data.allUnpricedMaterials.length+data.allMissingMaterialCount+data.allMissingWeightCount;
  return {mode:'material',label:'Material Mode',totals:data.allCostByCurrency,gapCount,status:`Material Mode: ${data.allUnpricedMaterials.length} unpriced material(s); ${data.allMissingMaterialCount} item(s) missing material; ${data.allMissingWeightCount} item(s) missing weight`,description:'Material Mode: weight and material price per kg.',data};
}
function renderItemCostAnalysis(page){
  const root=document.getElementById('tabAnalysis'),p=getActiveProject(),config=ANALYSIS_ITEM_PAGE_CONFIG[page],data=buildItemCostData(page),priceStoreKey=analysisItemPriceStoreKey(page);if(!root||!p||!config)return;
  const editorByPage=uiState.analysisItemPriceEditor[p.project_id]||(uiState.analysisItemPriceEditor[p.project_id]={});let editorKey=String(editorByPage[page]||'');if(!data.mappedRows.some(item=>item.key===editorKey))editorKey='';
  const editorItem=data.mappedRows.find(item=>item.key===editorKey)||null,editorOverrideRecord=editorItem?.overridePriceRecord||null,editorDefaultRecord=editorItem?.defaultPriceRecord||null,editorEffectiveRecord=editorItem?.priceRecord||null;
  const options=data.mappedRows.map(item=>`<option value="${escapeHtml(item.key)}" ${item.key===editorKey?'selected':''}>${escapeHtml(item.label)}${item.source.TAG?` — ${escapeHtml(item.source.TAG)}`:''}</option>`).join('');
  const warningHtml=data.unpricedCount?`<div class="analysis-warning">${data.unpricedCount} item(s) with a positive quantity have no unit price and are excluded from the cost total.</div>`:'';
  const pricePlaceholder=editorDefaultRecord?formatAnalysisNumber(editorDefaultRecord.price_per_unit,5):'Enter price per unit',priceInputClass=editorDefaultRecord&&!editorOverrideRecord?'analysis-default-price-input':'';
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div>${page==='steel'?steelPricingModeSwitchHtml('part'):''}<div class="analysis-title-row"><div><h2 class="table-title">${escapeHtml(config.title)}</h2><p class="table-subtitle">${escapeHtml(config.subtitle)}</p></div></div><div class="analysis-summary"><div class="analysis-card"><span>Items in Current BOM</span><strong>${data.mappedRows.length}</strong></div><div class="analysis-card"><span>Priced Items</span><strong>${data.pricedCount}</strong></div><div class="analysis-card"><span>Unpriced Items</span><strong>${data.unpricedCount}</strong></div><div class="analysis-card analysis-cost-card"><span>Total Cost</span><strong class="analysis-cost-lines">${analysisCurrencyHtml(data.costByCurrency)}</strong></div></div>${warningHtml}<h2 class="table-title analysis-detail-title">Unit Price Register</h2><p class="table-subtitle">Gray prices are editable EUR defaults. Enter a value and choose Update to override a default; Delete restores it.</p><div class="analysis-controls analysis-price-controls"><label for="analysisItemPricePart">BOM Item<select id="analysisItemPricePart"><option value="">Select item</option>${options}</select></label><label for="analysisItemUnitPrice">Price / Unit<input id="analysisItemUnitPrice" class="${priceInputClass}" type="number" min="0" step="any" value="${editorOverrideRecord?escapeHtml(editorOverrideRecord.price_per_unit):''}" placeholder="${escapeHtml(pricePlaceholder)}"></label><label for="analysisItemCurrency">Currency<select id="analysisItemCurrency">${ANALYSIS_CURRENCIES.map(currency=>`<option value="${currency.code}" ${currency.code===(editorEffectiveRecord?.currency||'USD')?'selected':''}>${escapeHtml(window.LumaCurrencyData.optionLabel(currency.code))}</option>`).join('')}</select></label><div class="analysis-price-actions"><button id="analysisItemPriceAdd" ${!editorItem||editorEffectiveRecord?'disabled':''}>Add</button><button id="analysisItemPriceUpdate" ${!editorEffectiveRecord?'disabled':''}>Update</button><button id="analysisItemPriceDelete" class="danger" ${!editorOverrideRecord?'disabled':''}>Delete</button></div></div><div id="analysisItemPriceRegistry">${makeAnalysisTable(['Part Name','TAG','Price / Unit','Currency','Current Qty','Current Cost'],data.registeredPriceRows)}</div><h2 class="table-title analysis-detail-title">${escapeHtml(config.title)} Details</h2><div id="analysisItemCostDetails">${makeAnalysisTable(analysisDetailBomColumns(page,['Price / Unit','Price Currency','Calculated Cost']),data.tableRows)}</div>`;
  wireAnalysisBackButton();
  if(page==='steel')wireSteelPricingModeSwitch();
  document.getElementById('analysisItemPricePart').addEventListener('change',e=>{editorByPage[page]=e.target.value;renderAnalysis();});
  const readEditor=()=>{const key=document.getElementById('analysisItemPricePart').value,rawPrice=document.getElementById('analysisItemUnitPrice').value.trim(),price=Number(rawPrice),currency=document.getElementById('analysisItemCurrency').value;if(!key){showToast('Select a BOM item first.');return null;}if(rawPrice===''||!Number.isFinite(price)||price<0){showToast('Enter a valid unit price.');return null;}return {key,record:{price_per_unit:price,currency:isAnalysisCurrency(currency)?currency:'USD'}};};
  document.getElementById('analysisItemPriceAdd').addEventListener('click',()=>{const value=readEditor();if(!value)return;p[priceStoreKey]=p[priceStoreKey]||{};if(p[priceStoreKey][value.key]){showToast('This item already has a registered price. Use Update.');return;}p[priceStoreKey][value.key]=value.record;markDirty();renderAnalysis();showToast('Unit price added.');});
  document.getElementById('analysisItemPriceUpdate').addEventListener('click',()=>{const value=readEditor();if(!value)return;p[priceStoreKey]=p[priceStoreKey]||{};p[priceStoreKey][value.key]=value.record;markDirty();renderAnalysis();showToast('Unit price updated.');});
  document.getElementById('analysisItemPriceDelete').addEventListener('click',()=>{const key=document.getElementById('analysisItemPricePart').value;if(!key||!p[priceStoreKey]?.[key])return;const restoresDefault=!!data.mappedRows.find(item=>item.key===key)?.defaultPriceRecord;if(!confirm(restoresDefault?'Delete this user price and restore its default?':'Delete the registered unit price for this item?'))return;delete p[priceStoreKey][key];markDirty();renderAnalysis();showToast(restoresDefault?'Default unit price restored.':'Unit price deleted.');});
  root.querySelectorAll('#analysisItemPriceRegistry tbody tr').forEach((row,index)=>{const item=data.registeredItems[index];if(item?.key===editorKey)row.classList.add('row-selected');if(item?.priceSource==='default'){row.classList.add('analysis-default-price-row');row.title='Editable default price';}row.addEventListener('click',()=>{editorByPage[page]=item.key;renderAnalysis();});});
  root.querySelectorAll('#analysisItemCostDetails tbody tr').forEach((row,index)=>{if(data.mappedRows[index]?.priceSource==='default'){row.classList.add('analysis-default-price-row');row.title='Editable default price';}});
}
function ensureCommercialAnalysisData(){
  const commercial=window.LumaCommercialAnalysis;if(!commercial)return;
  if(commercial.snapshot().status!=='idle')return;
  void commercial.load().then(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}).catch(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function ensureLogisticsData(){
  const service=window.LumaLogisticsService;if(!service)return;const status=service.snapshot().status;if(status!=='idle')return;
  void service.loadActiveRates().then(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}).catch(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function ensureOverheadSettings(){
  const service=window.LumaOverheadService;if(!service)return;const status=service.snapshot().status;if(status!=='idle')return;
  void service.loadSettings().then(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}).catch(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function ensurePersonnelSettings(){
  const service=window.LumaPersonnelService;if(!service)return;const status=service.snapshot().status;if(status!=='idle')return;
  void service.loadSettings().then(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}).catch(()=>{renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function commercialAnalysisRows(page){return (current?.bom?.rows||[]).filter(row=>analysisCategoryMatches(page,row));}
function buildSupplierCostData(page){
  const p=getActiveProject(),supplierId=p?.analysis_supplier_selections?.[page]||'',rows=commercialAnalysisRows(page);
  let data=window.LumaCommercialAnalysis.buildSection(page,supplierId,rows);
  // If this section has exactly one eligible supplier/active Price List, use it
  // immediately. The user can still choose explicitly when several are available.
  if(!supplierId&&data.eligibleSuppliers.length===1)data=window.LumaCommercialAnalysis.buildSection(page,data.eligibleSuppliers[0].supplier.id,rows);
  return data;
}
function formatCommercialDate(value){
  if(!value)return 'Open';const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function supplierOptionLabel(entry){
  const supplier=entry.supplier,code=String(supplier.supplier_code||'').trim(),name=String(supplier.supplier_name||'').trim();return code&&name?`${code} — ${name}`:code||name||'Unnamed supplier';
}
function commercialTableRows(data){
  return data.rows.map(item=>analysisProjectBomRow(item.source,{'Supplier Unit Price':item.unitPrice===null?(data.selection?'Missing Price':'—'):formatAnalysisNumber(item.unitPrice,5),'Price Currency':data.selection?currencyDisplay(data.currency):'','Calculated Total':item.total===null?'—':formatAnalysisFixed(item.total,2)}));
}
function supplierCostSummaryText(data){
  if(data.status==='loading'||data.status==='idle')return 'Loading suppliers';
  if(data.status==='error')return 'Commercial data unavailable';
  if(data.invalidSelection)return 'Supplier unavailable';
  if(!data.selection)return data.eligibleSuppliers.length?'Select supplier':'No eligible suppliers';
  const subtotal=currencyAmount(data.subtotal,data.currency);return data.missingPriceRows.length?`${subtotal} subtotal · ${data.missingPriceRows.length} missing`:subtotal;
}
function commercialCurrencyText(totals,empty='—'){
  const entries=Object.entries(totals||{}).filter(([currency,value])=>currency&&Number.isFinite(Number(value))).sort(([a],[b])=>a.localeCompare(b));return entries.length?entries.map(([currency,value])=>currencyAmount(value,currency)).join(' | '):empty;
}
function commercialCurrencyHtml(totals,empty='—'){
  const entries=Object.entries(totals||{}).filter(([currency,value])=>currency&&Number.isFinite(Number(value))).sort(([a],[b])=>a.localeCompare(b));return entries.length?entries.map(([currency,value])=>`<span>${escapeHtml(currencyAmount(value,currency))}</span>`).join(''):`<span>${escapeHtml(empty)}</span>`;
}
function logisticsWeightData(rows){
  let totalWeightKg=0;const missingTags=[];
  for(const row of rows){const quantity=Math.max(0,E.asNumber(row?.['Total Qty'],0));if(quantity<=0)continue;const raw=row?.Weight,weight=Number(raw);if(raw===null||raw===undefined||String(raw).trim()===''||!Number.isFinite(weight)||weight<0){missingTags.push(String(row?.TAG||row?.['Part Name']||row?.Part||'(blank TAG)'));continue;}totalWeightKg+=quantity*weight;}
  return {totalWeightKg,missingTags:[...new Set(missingTags)]};
}
function logisticsQuantityData(page,rows){
  const source=page==='bearing'?rows.filter(row=>/^bearing(100|110|120)$/.test(E.normalizeText(row?.['Part Name']??row?.Part))):page==='slew_drive'?rows.filter(row=>E.normalizeText(row?.['Part Name']??row?.Part)==='slewdrive'):rows;
  return {totalQuantity:source.reduce((sum,row)=>sum+Math.max(0,E.asNumber(row?.['Total Qty'],0)),0),sourceRows:source};
}
function getLogisticsCargoAmount(cargoGroup){
  const spec=window.LumaLogisticsCalculator.capacitySpec(cargoGroup);if(!spec)return {amount:0,unit:'',missingTags:[]};
  if(spec.type==='weight'){
    const rows=[...commercialAnalysisRows('posts'),...commercialAnalysisRows('substructure')].filter(row=>E.asNumber(row?.['Total Qty'],0)>0),data=logisticsWeightData(rows);
    return {amount:data.totalWeightKg,unit:spec.unit,missingTags:data.missingTags};
  }
  const page=cargoGroup==='Bearing'?'bearing':'slew_drive',rows=commercialAnalysisRows(page).filter(row=>E.asNumber(row?.['Total Qty'],0)>0),data=logisticsQuantityData(page,rows);
  return {amount:data.totalQuantity,unit:spec.unit,missingTags:[]};
}
function logisticsMissingFieldLabel(field,shipment){
  if(field==='capacityValue')return `Container Capacity for ${shipment?.cargoGroup||'Cargo Group'}`;
  return ({fob_per_container:'FOB / Container',cif_per_container:'CIF / Container',customs_clearance_per_container:'Customs Clearance / Container',insurance_per_container:'Insurance / Container',internal_site_per_container:'Transportation to Site / Container',internal_warehouse_per_container:'Transportation to Warehouse / Container',direct_transport_per_container:'Direct Origin to Site / Container',origin_to_port_per_container:'FOB Origin to Port / Container',port_to_site_per_container:'Port to Site / Container',port_to_warehouse_per_container:'Port to Warehouse / Container',warehouse_unloading_per_container:'Container Unloading at Warehouse',warehouse_truck_loading_per_container:'Warehouse to Truck Loading',warehouse_storage_per_period:'Warehouse Keeping / Period',warehouse_storage_period_days:'Storage Period Length',warehouse_storage_period_days_positive:'Storage Period Length greater than zero',warehouse_storage_days:'Planned Warehouse Time',warehouse_to_site_per_container:'Warehouse to Site / Container',capacityType:'Capacity Type',shipmentWeightKg:'Shipment Weight',shipmentQuantity:'Shipment Quantity'})[field]||field;
}
function buildLogisticsData(){
  const project=getActiveProject(),destination=window.LumaCountryData.resolveProjectDestination(project?.inputs||{}),deliveryPoint=project?.inputs?.delivery_point==='Warehouse'?'Warehouse':'Site',rateState=window.LumaLogisticsService.snapshot(),shipments=[],warnings=[];
  if(project?.inputs?.project_country_type==='Other European Country'&&!destination)warnings.push('Select a destination country to calculate logistics.');
  if(rateState.status==='error')warnings.push('Logistics rates are unavailable. No logistics cost has been calculated.');
  for(const {page,cargoGroup} of [{page:'posts',cargoGroup:'Steel Structure'},{page:'substructure',cargoGroup:'Steel Structure'},{page:'slew_drive',cargoGroup:'Slew Drive'},{page:'bearing',cargoGroup:'Bearing'}]){
    const rows=commercialAnalysisRows(page).filter(row=>E.asNumber(row?.['Total Qty'],0)>0);if(!rows.length)continue;
    const category=window.LumaCommercialAnalysis.SECTION_CATEGORIES[page],spec=window.LumaLogisticsCalculator.capacitySpec(cargoGroup),weightData=spec.type==='weight'?logisticsWeightData(rows):{totalWeightKg:null,missingTags:[]},quantityData=spec.type==='quantity'?logisticsQuantityData(page,rows):{totalQuantity:null,sourceRows:[]},section=buildSupplierCostData(page),selection=section.selection,supplier=selection?.supplier||null;
    if(spec.type==='quantity'&&quantityData.totalQuantity<=0)continue;
    const shipment={page,category,cargoGroup,capacityType:spec.type,capacityUnit:spec.unit,basisLabel:spec.basisLabel,supplier,supplierLabel:supplier?supplierOptionLabel(selection):'—',origin:'',destination,deliveryPoint,totalWeightKg:weightData.totalWeightKg,totalQuantity:quantityData.totalQuantity,shipmentAmount:spec.type==='weight'?weightData.totalWeightKg:quantityData.totalQuantity,missingTags:weightData.missingTags,rate:null,calculation:null,status:'incomplete',message:'',baseCost:selection?section.subtotal:null,baseCurrency:selection?section.currency:'',baseGapCount:selection?section.missingPriceRows.length:section.rows.some(row=>row.quantity>0)?1:0};
    if(weightData.missingTags.length)shipment.message=`Missing Part Master Weight for TAG(s): ${weightData.missingTags.join(', ')}.`;
    else if(!destination)shipment.message='Select a destination country to calculate logistics.';
    else if(!selection)shipment.message=`Select an eligible ${category} supplier and active Price List to calculate logistics.`;
    else{
      shipment.origin=window.LumaCountryData.canonicalLogisticsOrigin(supplier.country);
      if(!shipment.origin)shipment.message='Logistics origin is not configured for this supplier country.';
      else if(rateState.status==='loading'||rateState.status==='idle')shipment.message='Loading Logistics rates...';
      else if(rateState.status==='error')shipment.message='Logistics rates are unavailable.';
      else{
        const selectedRateId=project?.logistics_rate_selections?.[page]||'',match=window.LumaLogisticsCalculator.findRate(rateState.rates,{originCountry:shipment.origin,destinationCountry:destination,cargoGroup,rateId:selectedRateId});shipment.availableRates=match.matches;
        if(match.status==='missing')shipment.message=`No active logistics rate configured for ${shipment.origin} → ${destination} / ${cargoGroup}.`;
        else if(match.status==='selection_required')shipment.message=`Select one of the active Logistics routes for ${shipment.origin} → ${destination} / ${cargoGroup}.`;
        else{
          shipment.rate=match.rate;const rateType=match.rate.capacity_type||spec.type,rateUnit=match.rate.capacity_unit||spec.unit,capacityValue=match.rate.capacity_value??match.rate.container_capacity_kg;
          if(rateType!==spec.type||rateUnit!==spec.unit)shipment.message=`Invalid capacity configuration for ${cargoGroup}. Expected ${spec.basisLabel.toLowerCase()} in ${spec.unit}.`;
          else shipment.calculation=window.LumaLogisticsCalculator.calculate({...match.rate,capacityType:rateType,capacityValue,shipmentWeightKg:weightData.totalWeightKg,shipmentQuantity:quantityData.totalQuantity,deliveryPoint});
          if(shipment.calculation?.complete){shipment.status='complete';shipment.message='Calculated';}
          else if(shipment.calculation?.missingFields.includes('capacityValue'))shipment.message=`Container capacity is not configured for ${cargoGroup}.`;
          else if(shipment.calculation?.missingFields.includes('capacityValuePositive'))shipment.message=`Container capacity must be greater than zero for ${cargoGroup}.`;
          else if(shipment.calculation)shipment.message=`Missing Logistics configuration: ${shipment.calculation.missingFields.map(field=>logisticsMissingFieldLabel(field,shipment)).join(', ')}.`;
        }
      }
    }
    if(shipment.message&&shipment.status!=='complete')warnings.push(`${category}: ${shipment.message}`);shipments.push(shipment);
  }
  const externalTotals={},internalTotals={},grandTotals={};for(const shipment of shipments){if(shipment.status!=='complete')continue;const currency=shipment.rate.currency;externalTotals[currency]=(externalTotals[currency]||0)+shipment.calculation.externalLogisticsTotal;internalTotals[currency]=(internalTotals[currency]||0)+shipment.calculation.internalLogisticsTotal;grandTotals[currency]=(grandTotals[currency]||0)+shipment.calculation.totalLogisticsCost;}
  const currencies=Object.keys(grandTotals);if(currencies.length>1)warnings.push('Logistics shipments use different currencies. Totals are shown separately and are not converted or combined.');
  return {status:rateState.status,destination,deliveryPoint,shipments,warnings:[...new Set(warnings)],externalTotals,internalTotals,grandTotals,currencyMismatch:currencies.length>1,complete:shipments.length>0&&shipments.every(shipment=>shipment.status==='complete')};
}
function logisticsAmount(value,currency){return value===null||value===undefined?'—':currencyAmount(value,currency);}
function renderLogisticsAnalysis(){
  const root=document.getElementById('tabAnalysis'),data=buildLogisticsData();if(!root)return;
  const warningHtml=data.warnings.length?`<div class="analysis-warning">${data.warnings.map(warning=>`<div>${escapeHtml(warning)}</div>`).join('')}</div>`:'';
  const rateChoiceHtml=data.shipments.some(shipment=>shipment.availableRates?.length>1)?`<div class="analysis-controls logistics-route-choices">${data.shipments.filter(shipment=>shipment.availableRates?.length>1).map(shipment=>`<label><span>${escapeHtml(shipment.category)} Route</span><select data-logistics-route-page="${escapeHtml(shipment.page)}"><option value="">Select route</option>${shipment.availableRates.map(rate=>{const label=[window.LumaLogisticsCalculator.ROUTE_METHODS[rate.route_method||'legacy'],rate.origin_city,rate.transit_port_city,rate.warehouse_city,rate.destination_city,rate.revision,currencyDisplay(rate.currency)].filter(Boolean).join(' · ');return `<option value="${escapeHtml(rate.id)}" ${rate.id===shipment.rate?.id?'selected':''}>${escapeHtml(label)}</option>`;}).join('')}</select></label>`).join('')}</div>`:'';
  const externalRows=data.shipments.map(shipment=>{const rate=shipment.rate,calc=shipment.calculation,currency=rate?.currency||'',capacity=rate?(rate.capacity_value??rate.container_capacity_kg):null,origin=[rate?.origin_city,shipment.origin||shipment.supplier?.country].filter(Boolean).join(', ')||'—',destination=[rate?.destination_city,shipment.destination].filter(Boolean).join(', ')||'—';return {Supplier:shipment.supplierLabel,'Commercial Category':shipment.category,Origin:origin,Destination:destination,'Cargo Group':shipment.cargoGroup,'Route Method':calc?.routeLabel||'Legacy Combined Rate','Capacity Basis':shipment.basisLabel,'Shipment Amount':`${formatAnalysisNumber(shipment.shipmentAmount,2)} ${shipment.capacityUnit}`,'Container Capacity':capacity===null?'—':`${formatAnalysisNumber(capacity,2)} ${shipment.capacityUnit}`,'Number of Containers':calc?.complete?calc.containerCount:'—',Currency:currency?currencyDisplay(currency):'—','Customs / Container':rate?logisticsAmount(rate.customs_clearance_per_container,currency):'—','Insurance / Container':rate?logisticsAmount(rate.insurance_per_container,currency):'—','External Logistics Total':calc?.complete?logisticsAmount(calc.externalLogisticsTotal,currency):'—','Rate Revision':rate?.revision||'—',Status:shipment.message};});
  const internalRows=data.shipments.map(shipment=>{const rate=shipment.rate,calc=shipment.calculation,currency=rate?.currency||'';return {Supplier:shipment.supplierLabel,'Commercial Category':shipment.category,'Route Method':calc?.routeLabel||'Legacy Combined Rate','Warehouse Subtotal / Container':calc?.complete&&calc.warehouseHandlingPerContainer!==undefined?logisticsAmount(calc.warehouseHandlingPerContainer,currency):'—','Internal Logistics Total':calc?.complete?logisticsAmount(calc.internalLogisticsTotal,currency):'—',Status:shipment.message};});
  const summaryRows=data.shipments.map(shipment=>{const rate=shipment.rate,calc=shipment.calculation,currency=rate?.currency||'',totalPerContainer=calc?.totalCostPerContainer??(calc?.complete&&calc.containerCount?calc.totalLogisticsCost/calc.containerCount:null),unitCost=calc?.unitLogisticsCost??(calc?.complete&&shipment.shipmentAmount?calc.totalLogisticsCost/shipment.shipmentAmount:null);return {Supplier:shipment.supplierLabel,'Commercial Category':shipment.category,'Route Method':calc?.routeLabel||'Legacy Combined Rate',Basis:shipment.basisLabel,'Shipment Amount':`${formatAnalysisNumber(shipment.shipmentAmount,2)} ${shipment.capacityUnit}`,'Number of Containers':calc?.complete?calc.containerCount:'—','Total / Container':calc?.complete?logisticsAmount(totalPerContainer,currency):'—',[`Price / ${shipment.capacityUnit}`]:calc?.complete?logisticsAmount(unitCost,currency):'—','Allocated Project Logistics':calc?.complete?logisticsAmount(calc.totalLogisticsCost,currency):'—','Full Rounded-Container Cost':calc?.complete?logisticsAmount(calc.fullContainerProjectCost??calc.totalLogisticsCost,currency):'—','Rate Revision':rate?.revision||'—','Rate ID':rate?.id||'—',Status:shipment.message};});
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">Logistics</h2><p class="table-subtitle">Steel Structure uses BOM weight; Slew Drive and Bearing use authoritative BOM quantities. Itemized routes remain administrator-controlled.</p></div></div>${rateChoiceHtml}<div class="analysis-summary"><div class="analysis-card analysis-cost-card"><span>Total External Logistics</span><strong class="analysis-cost-lines">${commercialCurrencyHtml(data.externalTotals)}</strong></div><div class="analysis-card analysis-cost-card"><span>Total Internal Logistics</span><strong class="analysis-cost-lines">${commercialCurrencyHtml(data.internalTotals)}</strong></div><div class="analysis-card analysis-cost-card"><span>Grand Total Logistics</span><strong class="analysis-cost-lines">${commercialCurrencyHtml(data.grandTotals)}</strong></div><div class="analysis-card"><span>Destination / Delivery Point</span><strong>${escapeHtml(data.destination||'Not selected')} · ${escapeHtml(data.deliveryPoint)}</strong></div></div>${warningHtml}<h2 class="table-title analysis-detail-title">External Logistics</h2>${makeAnalysisTable(['Supplier','Commercial Category','Origin','Destination','Cargo Group','Route Method','Capacity Basis','Shipment Amount','Container Capacity','Number of Containers','Currency','Customs / Container','Insurance / Container','External Logistics Total','Rate Revision','Status'],externalRows)}<h2 class="table-title analysis-detail-title">Warehouse and Internal Logistics</h2>${makeAnalysisTable(['Supplier','Commercial Category','Route Method','Warehouse Subtotal / Container','Internal Logistics Total','Status'],internalRows)}<h2 class="table-title analysis-detail-title">Logistics Summary</h2>${makeAnalysisTable(['Supplier','Commercial Category','Route Method','Basis','Shipment Amount','Number of Containers','Total / Container','Price / kg','Price / pcs','Allocated Project Logistics','Full Rounded-Container Cost','Rate Revision','Rate ID','Status'],summaryRows)}`;
  wireAnalysisBackButton();root.querySelectorAll('[data-logistics-route-page]').forEach(select=>select.addEventListener('change',()=>{const project=getActiveProject();project.logistics_rate_selections={...(project.logistics_rate_selections||{}),[select.dataset.logisticsRoutePage]:select.value};markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}));
}
function renderSupplierCostAnalysis(page){
  const root=document.getElementById('tabAnalysis'),p=getActiveProject(),config=ANALYSIS_ITEM_PAGE_CONFIG[page];if(!root||!p||!config)return;
  const included=isAnalysisSectionIncluded(page,p),data=included?buildSupplierCostData(page):window.LumaCommercialAnalysis.buildSection(page,'',commercialAnalysisRows(page)),loading=data.status==='loading'||data.status==='idle',failed=data.status==='error',selection=data.selection,priceList=selection?.priceList,assignment=selection?.categoryAssignment;
  const options=data.eligibleSuppliers.map(entry=>`<option value="${escapeHtml(entry.supplier.id)}" ${entry.supplier.id===data.requestedSupplierId?'selected':''}>${escapeHtml(supplierOptionLabel(entry))}</option>`).join('');
  const warnings=[];
  if(included&&data.invalidSelection)warnings.push('The saved supplier is no longer eligible. Select an active supplier with an active category assignment and active Price List.');
  if(included&&!loading&&!failed&&!data.eligibleSuppliers.length)warnings.push(`No eligible supplier currently has an active ${data.category} category assignment and active Price List.`);
  if(included&&selection){
    const listItems=Array.isArray(priceList?.price_list_items)?priceList.price_list_items:[],savedPrices=listItems.filter(item=>item?.unit_price!==null&&item?.unit_price!==undefined&&String(item.unit_price).trim()!==''&&Number.isFinite(Number(item.unit_price)));
    if(!savedPrices.length)warnings.push(`The selected ${data.category} Price List contains no saved unit prices. Open Administration > Supplier Price Lists, edit Document No. ${priceList?.revision||'—'}, and save prices for the required BOM TAGs.`);
    else if(!data.pricedRows.length&&data.rows.some(row=>row.quantity>0))warnings.push(`The selected Price List contains ${savedPrices.length} saved price(s), but none match the current ${data.category} BOM TAGs.`);
  }
  if(included&&selection&&data.missingPriceRows.length){const tags=[...new Set(data.missingPriceRows.map(row=>row.tag||'(blank TAG)'))];warnings.push(`${data.missingPriceRows.length} item(s) are missing prices. Missing TAGs: ${tags.join(', ')}.`);}
  const warningHtml=warnings.length?`<div class="analysis-warning">${warnings.map(message=>`<div>${escapeHtml(message)}</div>`).join('')}</div>`:'';
  const errorHtml=included&&failed?'<div class="analysis-warning">Commercial data is unavailable. No supplier pricing is being used. Try refreshing the data.</div>':'';
  const metadataHtml=included&&selection?`<div class="analysis-commercial-meta"><div><span>Supplier</span><strong>${escapeHtml(supplierOptionLabel(selection))}</strong></div><div><span>Price List Revision</span><strong>${escapeHtml(priceList.revision||'—')}</strong></div><div><span>Currency</span><strong>${escapeHtml(currencyDisplay(priceList.currency)||'—')}</strong></div><div><span>Delivery Time</span><strong>${assignment.delivery_time_days===null||assignment.delivery_time_days===undefined?'Not specified':`${escapeHtml(assignment.delivery_time_days)} days`}</strong></div><div><span>Valid From</span><strong>${escapeHtml(formatCommercialDate(priceList.valid_from))}</strong></div><div><span>Valid Until</span><strong>${escapeHtml(formatCommercialDate(priceList.valid_until))}</strong></div><div class="analysis-validity ${data.validityStatus==='Current'?'current':'attention'}"><span>Validity Status</span><strong>${escapeHtml(data.validityStatus)}</strong></div></div>`:'';
  const totalLabel=data.missingPriceRows.length?'Subtotal of Priced Items':'Section Total';
  const procurementHtml=page==='pv_module'?pvModuleProcurementSwitchHtml(p):'';
  const excludedHtml=!included?'<div class="analysis-warning analysis-info"><strong>PV Module is excluded.</strong> The BOM quantity remains visible for engineering reference, but supplier prices, missing-price gaps, subtotals, Result, final price, and Quotation totals ignore PV Module procurement.</div>':'';
  const controlsHtml=included?`<div class="analysis-controls analysis-supplier-controls"><label for="analysisSupplierSelect">Supplier<select id="analysisSupplierSelect" ${loading||failed||!data.eligibleSuppliers.length?'disabled':''}><option value="">${loading?'Loading suppliers...':'Select supplier'}</option>${options}</select></label><button id="analysisCommercialRefresh" type="button" ${loading?'disabled':''}>Refresh Commercial Data</button></div>`:'';
  const detailRows=included?commercialTableRows(data):data.rows.map(item=>analysisProjectBomRow(item.source,{'Supplier Unit Price':'Excluded','Price Currency':'—','Calculated Total':'Excluded'}));
  const detailSubtitle=included?'BOM Quantity × Supplier Unit Price. Missing prices are excluded from the subtotal and never treated as zero.':'Engineering BOM quantities remain unchanged. This commercial section contributes no cost and creates no missing-price gap.';
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div>${procurementHtml}<div class="analysis-title-row"><div><h2 class="table-title">${escapeHtml(config.title)}</h2><p class="table-subtitle">${escapeHtml(config.subtitle)} Unit prices are managed only in Administration.</p></div></div>${controlsHtml}${excludedHtml}${errorHtml}${warningHtml}${metadataHtml}<div class="analysis-summary"><div class="analysis-card"><span>Items in Current BOM</span><strong>${data.rows.length}</strong></div><div class="analysis-card"><span>Priced Items</span><strong>${included?(selection?data.pricedRows.length:0):'Not applicable'}</strong></div><div class="analysis-card"><span>Missing Prices</span><strong>${included?(selection?data.missingPriceRows.length:'—'):0}</strong></div><div class="analysis-card analysis-cost-card"><span>${included?escapeHtml(totalLabel):'Price Calculation'}</span><strong class="analysis-cost-lines">${included?(selection?escapeHtml(currencyAmount(data.subtotal,data.currency)):'—'):'Excluded'}</strong></div></div><h2 class="table-title analysis-detail-title">${escapeHtml(config.title)} Details</h2><p class="table-subtitle">${escapeHtml(detailSubtitle)}</p><div id="analysisSupplierCostDetails">${makeAnalysisTable(analysisDetailBomColumns(page,['Supplier Unit Price','Price Currency','Calculated Total']),detailRows)}</div>`;
  wireAnalysisBackButton();
  if(page==='pv_module')wirePvModuleProcurementSwitch();
  document.getElementById('analysisSupplierSelect')?.addEventListener('change',event=>{p.analysis_supplier_selections=normalizeAnalysisSupplierSelections(p.analysis_supplier_selections);p.analysis_supplier_selections[page]=event.target.value;markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
  document.getElementById('analysisCommercialRefresh')?.addEventListener('click',()=>{void window.LumaCommercialAnalysis.load({force:true}).then(()=>renderAnalysis()).catch(()=>renderAnalysis());renderAnalysis();});
  if(included)root.querySelectorAll('#analysisSupplierCostDetails tbody tr').forEach((row,index)=>{if(data.rows[index]?.missingPrice){row.classList.add('analysis-missing-price-row');row.title='This BOM TAG has no unit price in the selected active Price List.';}});
}
function renderMajorComponentsAnalysis(){
  const root=document.getElementById('tabAnalysis'),config=ANALYSIS_ITEM_PAGE_CONFIG.major,rows=commercialAnalysisRows('major').map(row=>analysisProjectBomRow(row));if(!root)return;
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">${escapeHtml(config.title)}</h2><p class="table-subtitle">${escapeHtml(config.subtitle)}</p></div></div><div class="analysis-warning analysis-info">Supplier pricing is not connected here yet because this page combines three distinct commercial categories: Bearings, Slew Drive, and PV Module. No supplier or price is inferred.</div>${makeAnalysisTable(analysisProjectBomColumns(),rows)}`;
  wireAnalysisBackButton();
}
function buildPersonnelCostData(){
  const project=getActiveProject(),state=window.LumaPersonnelService.snapshot(),calculation=window.LumaPersonnelCostCalculator.calculate({settings:state.settings,settingsStatus:state.status,yearlyTargetMw:project?.personnel_yearly_target_mw,projectCapacityMwp:current?.kpis?.totalPower});
  return {...calculation,status:state.status,error:state.error};
}
function renderPersonnelAnalysis(){
  const root=document.getElementById('tabAnalysis'),project=getActiveProject(),data=buildPersonnelCostData();if(!root||!project)return;
  const rows=data.rows.map(row=>({Section:row.label,'Monthly Cost':row.monthlyCost===null?'—':overheadMoney(row.monthlyCost),'Yearly Cost (12 Months)':row.yearlyCost===null?'—':overheadMoney(row.yearlyCost),'Personnel Cost per MW':row.costPerMw===null?'—':`${overheadMoney(row.costPerMw)} / MW`}));
  rows.push({Section:'PERSONNEL COST','Monthly Cost':data.totalMonthly===null?'—':overheadMoney(data.totalMonthly),'Yearly Cost (12 Months)':data.totalYearly===null?'—':overheadMoney(data.totalYearly),'Personnel Cost per MW':data.totalPerMw===null?'—':`${overheadMoney(data.totalPerMw)} / MW`});
  const warningHtml=data.errors.length?`<div class="analysis-warning">${data.errors.map(error=>`<div>${escapeHtml(error)}</div>`).join('')}</div>`:'';
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">Personnel Costs</h2><p class="table-subtitle">Monthly costs are maintained by administrators. Yearly cost = Monthly Cost × 12; Personnel Cost per MW = Yearly Cost ÷ Yearly Target.</p></div></div><div class="analysis-controls personnel-target-control"><label class="${data.yearlyTargetMw===null||data.yearlyTargetMw<=0?'analysis-input-error':''}"><span>Yearly Target</span><span class="personnel-target-input"><input id="personnelYearlyTarget" type="number" min="0.000001" step="any" value="${escapeHtml(project.personnel_yearly_target_mw)}" required><em>MW</em></span>${data.yearlyTargetMw===null||data.yearlyTargetMw<=0?'<small>Yearly Target must be greater than zero.</small>':''}</label></div>${warningHtml}<div class="analysis-summary"><div class="analysis-card analysis-cost-card"><span>Total Yearly Personnel Cost</span><strong>${data.totalYearly===null?'—':overheadMoney(data.totalYearly)}</strong></div><div class="analysis-card analysis-cost-card analysis-per-mw-card"><span>Personnel Cost per MW</span><strong>${data.totalPerMw===null?'—':`${overheadMoney(data.totalPerMw)} / MW`}</strong><small>Total Yearly Personnel Cost ÷ Yearly Target</small></div><div class="analysis-card"><span>Current Project Capacity</span><strong>${data.projectCapacityMwp===null?'—':`${formatAnalysisNumber(data.projectCapacityMwp,3)} MWp`}</strong></div><div class="analysis-card analysis-cost-card"><span>Current Project Personnel Cost</span><strong>${data.projectPersonnelCost===null?'—':overheadMoney(data.projectPersonnelCost)}</strong></div></div><div class="analysis-warning analysis-info">All Personnel cost values below are read-only. Administrators can change Monthly Cost only in Administration → Personnel Costs.</div>${makeAnalysisTable(['Section','Monthly Cost','Yearly Cost (12 Months)','Personnel Cost per MW'],rows)}`;
  wireAnalysisBackButton();root.querySelector('[data-analysis-table] tbody tr[data-analysis-row]:last-of-type')?.classList.add('personnel-total-row');document.getElementById('personnelYearlyTarget')?.addEventListener('change',event=>{project.personnel_yearly_target_mw=normalizePersonnelYearlyTarget(event.target.value);markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);});
}
function buildTotalCostData(){
  const project=getActiveProject();
  const supplierSections=analysisCommercialPages().map(page=>isAnalysisSectionIncluded(page,project)?{page,data:buildSupplierCostData(page),excluded:false}:{page,data:null,excluded:true});
  const sections=supplierSections.map(({page,data,excluded})=>{
    const name=window.LumaCommercialAnalysis.SECTION_CATEGORIES[page];
    if(excluded)return {name,totals:{},status:'Excluded — client supplied',gapCount:0,excluded:true};
    const totals=data.selection?{[data.currency]:data.subtotal}:{},hasRequiredRows=data.rows.some(row=>row.quantity>0),status=data.selection?`${data.pricedRows.length} priced / ${data.missingPriceRows.length} missing — ${supplierOptionLabel(data.selection)} / ${data.selection.priceList.revision}`:(hasRequiredRows?(data.invalidSelection?'Saved supplier unavailable':'Supplier not selected'):'No BOM items');
    return {name,totals,status,gapCount:data.selection?data.missingPriceRows.length:(hasRequiredRows?1:0),excluded:false};
  });
  const personnel=buildPersonnelCostData();sections.push({name:'Personnel',totals:personnel.complete?{EUR:personnel.projectPersonnelCost}:{},status:personnel.complete?`${overheadMoney(personnel.totalPerMw)} / MW × ${formatAnalysisNumber(personnel.projectCapacityMwp,3)} MWp`:(personnel.errors[0]||'Personnel cost incomplete'),gapCount:personnel.complete?0:1});
  const grandTotals={};sections.forEach(section=>mergeAnalysisCurrencyTotals(grandTotals,section.totals));
  const gapCount=sections.reduce((sum,section)=>sum+section.gapCount,0);
  return {sections,grandTotals,gapCount,personnel,rows:sections.map(section=>({Category:section.name,'Estimated Cost':section.excluded?'Excluded':commercialCurrencyText(section.totals),'Pricing Status':section.status}))};
}
function buildFinalCostData(baseData=buildTotalCostData(),logisticsData=buildLogisticsData()){
  const project=getActiveProject(),overheadState=window.LumaOverheadService.snapshot();
  const result=window.LumaCommercialCostCalculator.buildResult({baseCosts:baseData.grandTotals,externalLogistics:logisticsData.externalTotals,internalLogistics:logisticsData.internalTotals,vatRate:project?.vat_rate,baseGapCount:baseData.gapCount,logisticsComplete:logisticsData.complete,overheadSettings:overheadState.settings,overheadSettingsStatus:overheadState.status,projectCapacityMwp:current?.kpis?.totalPower,commercialContingencyPercent:project?.commercial_contingency_percent,penaltyPercent:project?.penalty_percent,marginPercent:project?.margin_percent});
  return {...result,baseData,logisticsData};
}
const RESULT_MATERIAL_GROUPS=Object.freeze([
  Object.freeze({key:'steel',label:'Steel Structure',pages:Object.freeze(['posts','substructure'])}),
  Object.freeze({key:'bearing',label:'Bearing',pages:Object.freeze(['bearing'])}),
  Object.freeze({key:'slew_drive',label:'Slew Drive',pages:Object.freeze(['slew_drive'])}),
  Object.freeze({key:'fasteners',label:'Fasteners',pages:Object.freeze(['fasteners'])}),
  Object.freeze({key:'electrical',label:'Electrical',pages:Object.freeze(['pv_module','limit_switch','soltrk','junction_box','cable_gland','safeguard','anemometer','power_supply','electrical_enclosure'])}),
]);
function resultTransportField(shipment){
  const method=String(shipment?.rate?.route_method||'').toLowerCase(),origin=E.normalizeText(`${shipment?.origin||''} ${shipment?.supplier?.country||''} ${shipment?.rate?.origin_country||''}`);
  if(method.includes('fob')||origin.includes('china'))return 'transportFob';
  if(method==='port_warehouse_site')return 'transportGenoa';
  if(method==='direct'||origin.includes('italy'))return 'transportItalian';
  return 'transportGenoa';
}
function resultTransportAmounts(shipment){
  const rate=shipment?.rate||{},calculation=shipment?.calculation||{},method=String(rate.route_method||'').toLowerCase(),amounts={transportGenoa:0,transportItalian:0,transportFob:0};
  if(method&&method!=='legacy'&&Number.isFinite(Number(calculation.capacityUtilization))){
    const factor=Number(calculation.capacityUtilization),storagePeriods=Number(calculation.storagePeriods)||0,value=field=>Math.max(0,E.asNumber(rate[field],0))*factor;
    amounts.transportFob+=value('origin_to_port_per_container');
    amounts.transportGenoa+=value('port_to_site_per_container');
    amounts.transportItalian+=value('port_to_warehouse_per_container')+value('warehouse_unloading_per_container')+value('warehouse_truck_loading_per_container')+Math.max(0,E.asNumber(rate.warehouse_storage_per_period,0))*storagePeriods*factor+value('warehouse_to_site_per_container');
    const direct=value('direct_transport_per_container');if(direct)amounts[resultTransportField(shipment)]+=direct;
    const customsAndInsurance=value('customs_clearance_per_container')+value('insurance_per_container');if(customsAndInsurance)amounts[method.includes('fob')?'transportFob':resultTransportField(shipment)]+=customsAndInsurance;
    const allocated=Object.values(amounts).reduce((sum,value)=>sum+value,0),difference=Number(calculation.totalLogisticsCost)-allocated;if(Number.isFinite(difference)&&Math.abs(difference)>1e-7)amounts[resultTransportField(shipment)]+=difference;
    return amounts;
  }
  const total=Number(calculation.totalLogisticsCost);if(Number.isFinite(total))amounts[resultTransportField(shipment)]=total;return amounts;
}
function buildResultMaterialGroup(group,logisticsData){
  let cost=0,complete=true;const issues=[],activePages=[],excludedPages=[];
  for(const page of group.pages){
    if(!isAnalysisSectionIncluded(page)){excludedPages.push(page);continue;}
    const data=buildSupplierCostData(page),hasRows=data.rows.some(row=>E.asNumber(row.quantity,0)>0);if(!hasRows)continue;activePages.push(page);
    if(data.status!=='ready'){complete=false;issues.push(`${group.label}: commercial data is not ready.`);continue;}
    if(!data.selection){complete=false;issues.push(`${window.LumaCommercialAnalysis.SECTION_CATEGORIES[page]}: select a supplier and active Price List.`);continue;}
    if(data.currency!=='EUR'){complete=false;issues.push(`${window.LumaCommercialAnalysis.SECTION_CATEGORIES[page]} uses ${data.currency}; Result requires EUR or a future approved exchange rate.`);}else cost+=data.subtotal;
    if(data.missingPriceRows.length){complete=false;issues.push(`${window.LumaCommercialAnalysis.SECTION_CATEGORIES[page]}: ${data.missingPriceRows.length} BOM item(s) are missing prices.`);}
  }
  const transport={transportGenoa:0,transportItalian:0,transportFob:0},logisticsPages=activePages.filter(page=>['posts','substructure','bearing','slew_drive'].includes(page));
  if(logisticsPages.length){
    const shipments=logisticsData.shipments.filter(shipment=>logisticsPages.includes(shipment.page));
    if(shipments.length!==logisticsPages.length){complete=false;issues.push(`${group.label}: one or more required Logistics shipments are missing.`);}
    for(const shipment of shipments){
      if(shipment.status!=='complete'||!shipment.calculation?.complete){complete=false;issues.push(`${group.label}: ${shipment.message||'Logistics configuration is incomplete.'}`);continue;}
      if(shipment.rate?.currency!=='EUR'){complete=false;issues.push(`${group.label} Logistics uses ${shipment.rate?.currency||'an unknown currency'}; Result requires EUR.`);continue;}
      const amounts=resultTransportAmounts(shipment);for(const field of Object.keys(transport))transport[field]+=amounts[field];
    }
  }
  if(!activePages.length&&!excludedPages.length)issues.push(`${group.label}: no current BOM items.`);
  return {key:group.key,label:group.label,cost,...transport,complete,issues,excludedPages};
}
function buildResultAnalysisData(){
  const project=getActiveProject(),logisticsData=buildLogisticsData(),personnel=buildPersonnelCostData(),overheadState=window.LumaOverheadService.snapshot(),capacity=E.asNumber(current?.kpis?.totalPower,0);
  const materialSections=RESULT_MATERIAL_GROUPS.map(group=>buildResultMaterialGroup(group,logisticsData));
  const internalRows=personnel.rows.map(row=>({key:row.key,label:row.label,costPerMw:row.costPerMw,projectCost:row.costPerMw===null?null:row.costPerMw*capacity,complete:personnel.complete&&row.costPerMw!==null}));
  const annualOverhead=Number(overheadState.settings?.ksi_annual_overhead_eur),annualCapacity=Number(overheadState.settings?.ksi_annual_project_capacity_mwp),overheadPerMw=overheadState.status==='ready'&&Number.isFinite(annualOverhead)&&annualOverhead>=0&&Number.isFinite(annualCapacity)&&annualCapacity>0?annualOverhead/annualCapacity:null;
  internalRows.push({key:'overhead',label:'Overhead',costPerMw:overheadPerMw,projectCost:overheadPerMw===null?null:overheadPerMw*capacity,complete:overheadPerMw!==null});
  const calculated=window.LumaResultCostCalculator.calculate({materialSections,internalRows,contingencyPercent:project?.commercial_contingency_percent,marginPercent:project?.margin_percent,vatRate:project?.vat_rate});
  const warnings=[...materialSections.flatMap(section=>section.issues),...calculated.errors];
  return {...calculated,capacity,logisticsData,personnel,overheadState,warnings:[...new Set(warnings)]};
}
function resultMoney(value){return value===null||value===undefined?'—':overheadMoney(value);}
function resultPercent(value){return value===null||value===undefined?'—':`${formatAnalysisNumber(value,1)}%`;}
function decorateResultShareBars(containerId,rows,columns){
  const table=document.querySelector(`#${containerId} [data-analysis-table]`);if(!table)return;const tableRows=[...table.querySelectorAll('tbody tr[data-analysis-row]')];
  tableRows.at(-1)?.classList.add('result-total-row');
  tableRows.forEach((row,index)=>columns.forEach(({cellIndex,key,tone})=>{const value=rows[index]?.[key],cell=row.cells[cellIndex];if(!cell||value===null||value===undefined)return;const bar=document.createElement('div');bar.className=`result-share-bar ${tone}`;bar.style.setProperty('--result-share',`${Math.min(100,Math.max(0,Number(value)||0))}%`);const fill=document.createElement('span'),label=document.createElement('strong');label.textContent=resultPercent(value);bar.append(fill,label);cell.textContent='';cell.appendChild(bar);}));
}
function renderResultAnalysis(){
  const root=document.getElementById('tabAnalysis'),project=getActiveProject(),data=buildResultAnalysisData();if(!root||!project)return;
  const materialRows=data.materials.map(row=>({Section:row.label,Cost:resultMoney(row.cost),'Transportation from Genoa to Site':resultMoney(row.transportGenoa),'Transportation from Italian Supplier/Warehouse to Site':resultMoney(row.transportItalian),'Transportation from FOB China to Site':resultMoney(row.transportFob),'Landed Cost':resultMoney(row.landedCost),'Share in Material':resultPercent(row.shareInMaterial),'Share in Total':resultPercent(row.shareInTotal),_shareMaterial:row.shareInMaterial,_shareTotal:row.shareInTotal}));
  const materialComplete=data.materials.every(row=>row.complete),materialTotals={Section:'MATERIAL TOTAL',Cost:materialComplete?resultMoney(data.materials.reduce((sum,row)=>sum+row.cost,0)):'—','Transportation from Genoa to Site':materialComplete?resultMoney(data.materials.reduce((sum,row)=>sum+row.transportGenoa,0)):'—','Transportation from Italian Supplier/Warehouse to Site':materialComplete?resultMoney(data.materials.reduce((sum,row)=>sum+row.transportItalian,0)):'—','Transportation from FOB China to Site':materialComplete?resultMoney(data.materials.reduce((sum,row)=>sum+row.transportFob,0)):'—','Landed Cost':resultMoney(data.materialLandedTotal),'Share in Material':data.materialLandedTotal===null?'—':'100.0%','Share in Total':data.materialLandedTotal!==null&&data.totalInternalCost>0?resultPercent(data.materialLandedTotal/data.totalInternalCost*100):'—',_shareMaterial:data.materialLandedTotal===null?null:100,_shareTotal:data.materialLandedTotal!==null&&data.totalInternalCost>0?data.materialLandedTotal/data.totalInternalCost*100:null};materialRows.push(materialTotals);
  const internalRows=data.internalRows.map(row=>({Section:row.label,'Cost per MW':resultMoney(row.costPerMw),'Project Capacity':`${formatAnalysisNumber(data.capacity,3)} MW`,'Project Cost':resultMoney(row.projectCost),'Share in Total':resultPercent(row.shareInTotal),_shareTotal:row.shareInTotal}));
  internalRows.push({Section:'PERSONNEL + OVERHEAD TOTAL','Cost per MW':data.internalCostTotal===null?'—':`${resultMoney(data.internalRows.reduce((sum,row)=>sum+(row.costPerMw||0),0))} / MW`,'Project Capacity':`${formatAnalysisNumber(data.capacity,3)} MW`,'Project Cost':resultMoney(data.internalCostTotal),'Share in Total':data.internalCostTotal!==null&&data.totalInternalCost>0?resultPercent(data.internalCostTotal/data.totalInternalCost*100):'—',_shareTotal:data.internalCostTotal!==null&&data.totalInternalCost>0?data.internalCostTotal/data.totalInternalCost*100:null});
  const formulaRows=[
    {Item:'Total Material Landed Cost',Formula:'Material Cost + all allocated Transportation',Amount:resultMoney(data.materialLandedTotal)},
    {Item:'Personnel + Overhead',Formula:'Personnel project costs + Overhead project allocation',Amount:resultMoney(data.internalCostTotal)},
    {Item:'Total Internal Cost',Formula:`${resultMoney(data.materialLandedTotal)} + ${resultMoney(data.internalCostTotal)}`,Amount:resultMoney(data.totalInternalCost)},
    {Item:'Contingency',Formula:`${resultMoney(data.totalInternalCost)} × ${resultPercent(data.contingencyPercent)}`,Amount:resultMoney(data.contingencyAmount)},
    {Item:'Expected Cost',Formula:`${resultMoney(data.totalInternalCost)} + ${resultMoney(data.contingencyAmount)}`,Amount:resultMoney(data.expectedCost)},
    {Item:'Margin',Formula:`${resultMoney(data.expectedCost)} × ${resultPercent(data.marginPercent)}`,Amount:resultMoney(data.marginAmount)},
    {Item:'Price Before VAT',Formula:`${resultMoney(data.expectedCost)} + ${resultMoney(data.marginAmount)}`,Amount:resultMoney(data.priceBeforeVat)},
    {Item:'VAT',Formula:`${resultMoney(data.priceBeforeVat)} × ${resultPercent(data.vatRate*100)}`,Amount:resultMoney(data.vatAmount)},
    {Item:'Final Price',Formula:`${resultMoney(data.priceBeforeVat)} + ${resultMoney(data.vatAmount)}`,Amount:resultMoney(data.finalPrice)},
  ];
  const contingencyInvalid=Number(project.commercial_contingency_percent)<0||!Number.isFinite(Number(project.commercial_contingency_percent)),marginInvalid=project.margin_percent!==''&&!Number.isFinite(Number(project.margin_percent)),warnings=data.warnings.length?`<div class="analysis-warning">${data.warnings.map(warning=>`<div>${escapeHtml(warning)}</div>`).join('')}</div>`:'',pvNotice=isPvModuleIncluded(project)?'':'<div class="analysis-warning analysis-info">PV Module procurement is excluded from every material subtotal, percentage, and final-price calculation.</div>';
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">Result</h2><p class="table-subtitle">Material landed costs, Personnel, Overhead, Contingency, signed Margin, and final VAT in the required calculation order.</p></div></div><div class="analysis-controls result-controls"><label class="${contingencyInvalid?'analysis-input-error':''}"><span>Contingency %</span><input id="resultContingencyPercent" type="number" min="0" step="any" value="${escapeHtml(project.commercial_contingency_percent)}"></label><label class="${marginInvalid?'analysis-input-error':''}"><span>Margin % <em>Negative or positive</em></span><input id="resultMarginPercent" type="number" step="any" value="${escapeHtml(project.margin_percent)}" placeholder="Blank = 0%"></label><label><span>VAT <em>Applied last</em></span><select id="resultVatRate">${VAT_OPTIONS.map(option=>`<option value="${option.value}" ${option.value===normalizeVatRate(project.vat_rate)?'selected':''}>${option.label}</option>`).join('')}</select></label></div>${pvNotice}${warnings}<h3 class="table-title analysis-detail-title">Material and Transportation</h3><div id="resultMaterialTable">${makeAnalysisTable(['Section','Cost','Transportation from Genoa to Site','Transportation from Italian Supplier/Warehouse to Site','Transportation from FOB China to Site','Landed Cost','Share in Material','Share in Total'],materialRows)}</div><h3 class="table-title analysis-detail-title">Personnel and Overhead</h3><p class="table-subtitle">Project allocations come directly from the Personnel and Overhead sections.</p><div id="resultInternalTable">${makeAnalysisTable(['Section','Cost per MW','Project Capacity','Project Cost','Share in Total'],internalRows)}</div><h3 class="table-title analysis-detail-title">Final Calculation</h3>${makeAnalysisTable(['Item','Formula','Amount'],formulaRows)}<div class="admin-final-total result-final-total"><span>${data.complete?'FINAL PRICE':'FINAL PRICE INCOMPLETE'}</span><strong>${resultMoney(data.finalPrice)}</strong></div>`;
  wireAnalysisBackButton();decorateResultShareBars('resultMaterialTable',materialRows,[{cellIndex:7,key:'_shareMaterial',tone:'material'},{cellIndex:8,key:'_shareTotal',tone:'total'}]);decorateResultShareBars('resultInternalTable',internalRows,[{cellIndex:5,key:'_shareTotal',tone:'total'}]);
  const update=(key,normalizer,value)=>{project[key]=normalizer(value);markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);};
  document.getElementById('resultContingencyPercent')?.addEventListener('change',event=>update('commercial_contingency_percent',normalizeCommercialContingencyPercent,event.target.value));
  document.getElementById('resultMarginPercent')?.addEventListener('change',event=>update('margin_percent',normalizeMarginPercent,event.target.value));
  document.getElementById('resultVatRate')?.addEventListener('change',event=>update('vat_rate',normalizeVatRate,event.target.value));
}
function overheadMoney(value){return value===null||value===undefined?'—':currencyAmount(value,'EUR');}
function overheadPercent(value){return value===null||value===undefined?'—':`${formatAnalysisNumber(value,2)}%`;}
function overheadAnalysisHtml(data,project){
  const overhead=data.overhead,settings=window.LumaOverheadService.snapshot().settings,penaltyMissing=overhead.penaltyMissing,contingencyInvalid=Number(project.commercial_contingency_percent)<0,penaltyInvalid=!penaltyMissing&&Number(project.penalty_percent)<0,marginInvalid=project.margin_percent!==''&&!Number.isFinite(Number(project.margin_percent)),marginInput=project.margin_percent===''?'':project.margin_percent;
  const overheadRows=(settings.items||[]).map((item,index)=>({'No.':index+1,Code:item.code,'Overhead Item':item.description,'Yearly Cost':overheadMoney(item.yearly_cost_eur),'Monthly Cost (÷ 12)':overheadMoney(item.yearly_cost_eur/12)}));
  overheadRows.push({'No.':'','Code':'','Overhead Item':'OVERHEAD COST','Yearly Cost':overheadMoney(overhead.annualOverhead),'Monthly Cost (÷ 12)':overheadMoney(overhead.annualOverhead/12)});
  const validity=`${formatCommercialDate(settings.valid_from)} – ${formatCommercialDate(settings.valid_until)}`;
  return `<section class="analysis-overhead-section" aria-labelledby="analysisOverheadTitle"><div class="analysis-overhead-heading"><div><h2 id="analysisOverheadTitle" class="table-title">Overhead</h2><p class="table-subtitle">Company constants, current project capacity, and additive commercial percentages produce one Project Overhead amount.</p></div></div>
    <div class="analysis-commercial-inputs" aria-label="Project commercial inputs"><label class="${contingencyInvalid?'analysis-input-error':''}"><span>Contingency %</span><input id="analysisCommercialContingency" type="number" min="0" step="any" required aria-invalid="${contingencyInvalid}" value="${escapeHtml(project.commercial_contingency_percent)}">${contingencyInvalid?'<small>Contingency percentage must be zero or greater.</small>':''}</label><label class="${penaltyMissing||penaltyInvalid?'analysis-input-error':''}"><span>Penalty % <em>Required</em></span><input id="analysisPenaltyPercent" type="number" min="0" step="any" required aria-invalid="${penaltyMissing||penaltyInvalid}" value="${escapeHtml(project.penalty_percent)}" placeholder="Required">${penaltyMissing?'<small>Penalty percentage is required. Enter 0 if no penalty applies.</small>':penaltyInvalid?'<small>Penalty percentage must be zero or greater.</small>':''}</label><label class="${marginInvalid?'analysis-input-error':''}"><span>Margin % <em>Negative or positive</em></span><input id="analysisMarginPercent" type="number" step="any" aria-invalid="${marginInvalid}" value="${escapeHtml(marginInput)}" placeholder="Blank = 0%">${marginInvalid?'<small>Margin percentage must be a valid number.</small>':''}</label><label><span>VAT <em>Applied last</em></span><select id="analysisVatRate" required>${VAT_OPTIONS.map(option=>`<option value="${option.value}" ${option.value===normalizeVatRate(project.vat_rate)?'selected':''}>${option.label}</option>`).join('')}</select></label></div>
    <div class="analysis-overhead-grid">
      <article class="analysis-per-mw-card"><h3>KSI Constants</h3><dl><div><dt>KSI Annual Overhead</dt><dd>${overheadMoney(overhead.annualOverhead)} / Year</dd></div><div><dt>KSI Annual Project Capacity</dt><dd>${overhead.annualCapacity===null?'—':`${formatAnalysisNumber(overhead.annualCapacity,2)} MWp / Year`}</dd></div><div><dt>Overhead Cost per MW</dt><dd><span>${overheadMoney(overhead.annualOverhead)} ÷ ${overhead.annualCapacity===null?'—':`${formatAnalysisNumber(overhead.annualCapacity,2)} MW`}</span><strong>${overhead.coefficientA===null?'—':`${overheadMoney(overhead.coefficientA)} / MW`}</strong></dd></div></dl></article>
      <article><h3>Project Overhead</h3><dl><div><dt>Current Project Capacity</dt><dd>${overhead.projectCapacity===null?'—':`${formatAnalysisNumber(overhead.projectCapacity,3)} MWp`}</dd></div><div><dt>Project Constant Overhead</dt><dd><span>${overhead.projectCapacity===null?'—':formatAnalysisNumber(overhead.projectCapacity,3)} × ${overhead.coefficientA===null?'—':`${overheadMoney(overhead.coefficientA)} / MWp`}</span><strong>${overheadMoney(overhead.constantOverhead)}</strong></dd></div></dl></article>
      <article><h3>Commercial Percentages</h3><dl><div><dt>Contingency</dt><dd>${overheadPercent(overhead.contingencyPercent)}</dd></div><div><dt>Penalty</dt><dd>${overheadPercent(overhead.penaltyPercent)}</dd></div><div><dt>Margin</dt><dd>${overhead.marginBlank?'Blank → 0%':overheadPercent(overhead.marginPercent)}</dd></div><div><dt>Combined Overhead</dt><dd><span>${overheadPercent(overhead.contingencyPercent)} + ${overheadPercent(overhead.penaltyPercent)} + ${overheadPercent(overhead.marginPercent)}</span><strong>${overheadPercent(overhead.combinedPercent)}</strong></dd></div></dl></article>
      <article class="analysis-overhead-summary"><h3>Overhead Summary</h3><dl><div><dt>Percentage Overhead Amount</dt><dd><span>${overheadMoney(overhead.constantOverhead)} × ${overheadPercent(overhead.combinedPercent)}</span><strong>${overheadMoney(overhead.percentageAmount)}</strong></dd></div><div><dt>Total Project Overhead</dt><dd><span>${overheadMoney(overhead.constantOverhead)} + ${overheadMoney(overhead.percentageAmount)}</span><strong>${overheadMoney(overhead.totalOverhead)}</strong></dd></div></dl></article>
    </div><div class="analysis-title-row overhead-detail-heading"><div><h3 class="table-title">Overhead Cost Register</h3><p class="table-subtitle">Read-only for users. Validity: ${escapeHtml(validity)}. Administrators maintain yearly values in Administration → Overhead.</p></div></div>${makeAnalysisTable(['No.','Code','Overhead Item','Yearly Cost','Monthly Cost (÷ 12)'],overheadRows)}</section>`;
}
function adminFinalCostHtml(data){
  const vatLabel=`${formatAnalysisNumber(data.vat.rate*100,0)}%`;
  const baseRows=data.baseData.sections.map(section=>({Category:section.name,'Base Commercial Cost':commercialCurrencyText(section.totals),'Pricing Status':section.status}));
  const shipmentRows=data.logisticsData.shipments.map(shipment=>{const rate=shipment.rate,calc=shipment.calculation,logisticsCurrency=rate?.currency||'',baseCost=shipment.baseCost,baseCurrency=shipment.baseCurrency,shipmentSubtotal=calc?.complete&&baseCost!==null&&baseCurrency===logisticsCurrency?baseCost+calc.totalLogisticsCost:null,capacity=rate?(rate.capacity_value??rate.container_capacity_kg):null;return {'Category / Shipment':`${shipment.category} — ${shipment.supplierLabel}`,'Base Cost':baseCost===null?'—':currencyAmount(baseCost,baseCurrency),Origin:shipment.origin||shipment.supplier?.country||'—',Destination:shipment.destination||'—',Basis:shipment.basisLabel,'Shipment Amount':`${formatAnalysisNumber(shipment.shipmentAmount,2)} ${shipment.capacityUnit}`,Capacity:capacity===null?'—':`${formatAnalysisNumber(capacity,2)} ${shipment.capacityUnit}`,Containers:calc?.complete?calc.containerCount:'—','External Logistics':calc?.complete?logisticsAmount(calc.externalLogisticsTotal,logisticsCurrency):'—','Internal Logistics':calc?.complete?logisticsAmount(calc.internalLogisticsTotal,logisticsCurrency):'—','Shipment Subtotal':shipmentSubtotal===null?'—':currencyAmount(shipmentSubtotal,logisticsCurrency),Status:shipment.message};});
  const summaryRows=data.currencies.map(currency=>{const row=data.byCurrency[currency];return {Currency:currencyDisplay(currency),'Previous Project Price':currencyAmount(row.previousProjectPrice,currency),'Project Constant Overhead':row.projectConstantOverhead===null?'—':currencyAmount(row.projectConstantOverhead,'EUR'),'Percentage Overhead':row.percentageOverheadAmount===null?'—':currencyAmount(row.percentageOverheadAmount,'EUR'),'Total Project Overhead':row.totalProjectOverhead===null?'—':currencyAmount(row.totalProjectOverhead,'EUR'),'Subtotal Before VAT':row.subtotalBeforeVat===null?'—':currencyAmount(row.subtotalBeforeVat,currency),'VAT Rate':vatLabel,'VAT Amount':row.vatAmount===null?'—':currencyAmount(row.vatAmount,currency),'Final Price':row.finalCostIncludingVat===null?'—':currencyAmount(row.finalCostIncludingVat,currency)};});
  const o=data.overhead,traceRows=[
    {Step:'Overhead Cost per MW',Formula:`${overheadMoney(o.annualOverhead)} ÷ ${o.annualCapacity===null?'—':`${formatAnalysisNumber(o.annualCapacity,2)} MW`}`,Result:o.coefficientA===null?'—':`${overheadMoney(o.coefficientA)} / MW`},
    {Step:'Project Constant Overhead',Formula:`${o.projectCapacity===null?'—':`${formatAnalysisNumber(o.projectCapacity,3)} MWp`} × ${o.coefficientA===null?'—':`${overheadMoney(o.coefficientA)} / MWp`}`,Result:overheadMoney(o.constantOverhead)},
    {Step:'Combined Overhead %',Formula:`${overheadPercent(o.contingencyPercent)} + ${overheadPercent(o.penaltyPercent)} + ${overheadPercent(o.marginPercent)}`,Result:overheadPercent(o.combinedPercent)},
    {Step:'Percentage Overhead',Formula:`${overheadMoney(o.constantOverhead)} × ${overheadPercent(o.combinedPercent)}`,Result:overheadMoney(o.percentageAmount)},
    {Step:'Total Project Overhead',Formula:`${overheadMoney(o.constantOverhead)} + ${overheadMoney(o.percentageAmount)}`,Result:overheadMoney(o.totalOverhead)},
    {Step:'Subtotal Before VAT',Formula:`${overheadMoney(data.previousProjectPrice)} + ${overheadMoney(o.totalOverhead)}`,Result:overheadMoney(data.subtotalBeforeVat)},
    {Step:'VAT Amount',Formula:`${overheadMoney(data.subtotalBeforeVat)} × ${vatLabel}`,Result:overheadMoney(data.vat.amount)},
    {Step:'Final Price',Formula:`${overheadMoney(data.subtotalBeforeVat)} + ${overheadMoney(data.vat.amount)}`,Result:overheadMoney(data.finalCostIncludingVat)},
  ];
  const warnings=[...new Set([...data.warnings,...data.logisticsData.warnings])],warningHtml=warnings.length?`<div class="analysis-warning">${warnings.map(warning=>`<div>${escapeHtml(warning)}</div>`).join('')}</div>`:'';
  return `<section class="admin-final-cost" aria-labelledby="adminFinalCostTitle"><div class="admin-final-cost-heading"><div><span>Administrator only</span><h2 id="adminFinalCostTitle" class="table-title">Final Cost Calculation</h2><p class="table-subtitle">Read-only trace: Previous Project Price + Overhead = Subtotal Before VAT; VAT is applied once as the last step.</p></div></div>${warningHtml}<h3 class="table-title analysis-detail-title">Base Costs</h3>${makeAnalysisTable(['Category','Base Commercial Cost','Pricing Status'],baseRows)}<h3 class="table-title analysis-detail-title">Shipment Build-up</h3>${makeAnalysisTable(['Category / Shipment','Base Cost','Origin','Destination','Basis','Shipment Amount','Capacity','Containers','External Logistics','Internal Logistics','Shipment Subtotal','Status'],shipmentRows)}<h3 class="table-title analysis-detail-title">Overhead Formula Trace</h3>${makeAnalysisTable(['Step','Formula','Result'],traceRows)}<h3 class="table-title analysis-detail-title">Final Summary</h3>${makeAnalysisTable(['Currency','Previous Project Price','Project Constant Overhead','Percentage Overhead','Total Project Overhead','Subtotal Before VAT','VAT Rate','VAT Amount','Final Price'],summaryRows)}<div class="admin-final-total"><span>${data.currencyMismatch?'FINAL PRICE UNAVAILABLE — CURRENCY MISMATCH':'FINAL PRICE'}</span><strong>${data.finalCostIncludingVat===null?'Incomplete':overheadMoney(data.finalCostIncludingVat)}</strong></div></section>`;
}
function renderTotalCostAnalysis(){
  const root=document.getElementById('tabAnalysis'),project=getActiveProject(),data=buildTotalCostData();if(!root||!project)return;const finalData=buildFinalCostData(data),currencies=Object.keys(data.grandTotals).length,adminHtml=window.LumaAuth?.isAdmin?.()?adminFinalCostHtml(finalData):'';
  const warnings=[...new Set(finalData.warnings)],warningHtml=warnings.length?`<div class="analysis-warning">${warnings.map(warning=>`<div>${escapeHtml(warning)}</div>`).join('')}</div>`:'',pvNotice=isPvModuleIncluded(project)?'':'<div class="analysis-warning analysis-info">PV Module procurement is excluded from the Previous Project Price, VAT basis, final price, and Quotation commercial total.</div>';
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">Total Project Cost</h2><p class="table-subtitle">Previous Project Price, Project Overhead, VAT, and Final Price for the active project.</p></div></div><div class="analysis-summary analysis-total-summary"><div class="analysis-card analysis-cost-card"><span>Previous Project Price</span><strong class="analysis-cost-lines">${commercialCurrencyHtml(data.grandTotals)}</strong></div><div class="analysis-card"><span>Cost Categories</span><strong>${data.sections.length}</strong></div><div class="analysis-card"><span>Currencies Shown Separately</span><strong>${currencies}</strong></div><div class="analysis-card"><span>Data Gaps</span><strong>${data.gapCount}</strong></div></div>${pvNotice}${warningHtml}<h2 class="table-title analysis-detail-title">Previous Project Price Breakdown</h2><p class="table-subtitle">Supplier and Logistics values remain separated by currency; no exchange rates are invented.</p>${makeAnalysisTable(['Category','Estimated Cost','Pricing Status'],data.rows)}${overheadAnalysisHtml(finalData,project)}<section class="analysis-final-price-summary"><div><span>Previous Project Price</span><strong>${overheadMoney(finalData.previousProjectPrice)}</strong></div><b>+</b><div><span>Total Project Overhead</span><strong>${overheadMoney(finalData.overhead.totalOverhead)}</strong></div><b>=</b><div><span>Subtotal Before VAT</span><strong>${overheadMoney(finalData.subtotalBeforeVat)}</strong></div><b>+</b><div><span>VAT ${formatAnalysisNumber(finalData.vat.rate*100,0)}%</span><strong>${overheadMoney(finalData.vat.amount)}</strong></div><b>=</b><div class="analysis-final-price"><span>FINAL PRICE</span><strong>${overheadMoney(finalData.finalCostIncludingVat)}</strong></div></section>${adminHtml}`;
  wireAnalysisBackButton();
  const updatePercent=(key,normalizer,value)=>{project[key]=normalizer(value);markDirty();renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);};
  document.getElementById('analysisCommercialContingency')?.addEventListener('change',event=>updatePercent('commercial_contingency_percent',normalizeCommercialContingencyPercent,event.target.value));
  document.getElementById('analysisPenaltyPercent')?.addEventListener('change',event=>updatePercent('penalty_percent',normalizePenaltyPercent,event.target.value));
  document.getElementById('analysisMarginPercent')?.addEventListener('change',event=>updatePercent('margin_percent',normalizeMarginPercent,event.target.value));
  document.getElementById('analysisVatRate')?.addEventListener('change',event=>updatePercent('vat_rate',normalizeVatRate,event.target.value));
}
function analysisFindPackagePart(item){
  const candidates=[...(current?.bom?.rows||[]),...(partMaster||[])],tag=E.normalizeText(item.tag),match=E.normalizeText(item.match||item.label||item.tag);
  let source=tag?candidates.find(row=>E.normalizeText(row.TAG)===tag):null;if(!source&&match)source=candidates.find(row=>E.normalizeText([row['Part Name']??row.Part,row.TAG,row.Description,row['Part Number']].join(' ')).includes(match));
  return {source,name:String(source?.['Part Name']??source?.Part??item.label??item.tag??'Fastener'),tag:String(source?.TAG??item.tag??''),description:String(source?.Description??'')};
}
function buildFastenerPackagingData(){
  const active=current?.active||[],totalTrackers=active.reduce((sum,row)=>sum+E.asInt(row['Number of Trackers']),0),bearingPackages=active.reduce((sum,row)=>sum+E.asInt(row['Bearing Posts / Tracker'])*E.asInt(row['Number of Trackers']),0),hatRailPackages=active.reduce((sum,row)=>sum+Math.max(E.asInt(row['PV Modules per Tracker'])-2,0)*E.asInt(row['Number of Trackers']),0),zRailPackages=4*totalTrackers;
  const tubeConnectionPackages=active.reduce((sum,row)=>sum+E.torqueTubeJointCountForRow(row)*E.asInt(row['Number of Trackers']),0);
  const definitions=[
    {title:'Slew Drive Seat to Drive Pile',basis:'One package per tracker',packages:totalTrackers,items:[['k001164',8],['k001010',8],['k001154',16],['k001163',8]]},
    {title:'Slew Drive to Slew Drive Seat',basis:'One package per tracker',packages:totalTrackers,items:[['k001231',4],['k001228',4],['k001238',4],['k001230',4],[null,2,'din7967m18','DIN 7967 - M18'],[null,2,'din936iso4035m18','DIN 936 ISO 4035 - M18'],['k001239',4]]},
    {title:'Bearing Adapter to Bearing Pile',basis:'One package per bearing adapter',packages:bearingPackages,items:[['k001125',4],['k001124',4],['k001130',4],['k001123',4]]},
    {title:'Bearing to Bearing Adapter',basis:'One package per bearing',packages:bearingPackages,items:[['k001129',2],['k001137',2]]},
    {title:'Torque Tube to Slew Drive',basis:'One package per tracker',packages:totalTrackers,items:[['k001385',16],['k001127',22],['k001166',16]]},
    {title:'Torque Tube / Slew Drive Connections',basis:'One package per active tube joint',packages:tubeConnectionPackages,items:[['k001388',4],['k001157',8],['k001013',4],['k001479',8]]},
    {title:'Hat Rail to Torque Tube',basis:'One package per Hat rail',packages:hatRailPackages,items:[['k001576',2],['k001575',2],['k001074',2]]},
    {title:'Z Rail to Torque Tube',basis:'One package per Z rail',packages:zRailPackages,items:[['k001151',2],['k001235',2],['k001074',2]]},
  ];
  return definitions.map(definition=>{const rows=definition.items.map(([tag,qty,match,label])=>{const part=analysisFindPackagePart({tag,match,label});return analysisProjectBomRow(part.source||{'Part Name':part.name,TAG:part.tag,Description:part.description},{'Qty / Package':qty,'Packages':definition.packages,'Required Qty':qty*definition.packages});});return {...definition,rows};});
}
function renderFastenerPackaging(){
  const root=document.getElementById('tabAnalysis'),sections=buildFastenerPackagingData();if(!root)return;const totalPackages=sections.reduce((sum,section)=>sum+section.packages,0);
  root.innerHTML=`<div class="analysis-subpage-nav">${analysisBackButtonHtml()}</div><div class="analysis-title-row"><div><h2 class="table-title">Fastener Packaging</h2><p class="table-subtitle">Installation kits grouped by connection point. Quantities are derived from the active project configuration.</p></div></div><div class="analysis-summary"><div class="analysis-card"><span>Installation Sections</span><strong>${sections.length}</strong></div><div class="analysis-card"><span>Total Section Packages</span><strong>${formatAnalysisNumber(totalPackages,0)}</strong></div><div class="analysis-card analysis-packaging-note"><span>Contingency Handling</span><strong>Project BOM</strong></div></div><div class="analysis-warning analysis-info">Packaging shows installation-required quantities. Any fastener contingency remains visible in the Project BOM and is not divided into installation packages.</div><div class="analysis-package-grid">${sections.map((section,index)=>`<section class="analysis-package-section"><div class="analysis-package-header"><div><span>Installation Section ${index+1}</span><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.basis)}</p></div><strong>${formatAnalysisNumber(section.packages,0)} package(s)</strong></div>${makeAnalysisTable(analysisDetailBomColumns('packaging',['Qty / Package','Packages','Required Qty']),section.rows)}</section>`).join('')}</div>`;
  wireAnalysisBackButton();
}
function analysisHomeIcon(page){
  const paths={steel:'<path d="M4 6h16M6 6v12m12-12v12M4 18h16M8 10h8m-8 4h8"/>',electrical:'<path d="m13 2-7 12h6l-1 8 7-12h-6l1-8Z"/>',major:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',fasteners:'<path d="m8 3 3 3-5 5-3-3 5-5Zm8 10 5 5-3 3-5-5m-5-5 5 5m-2-8 5 5"/>',personnel:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m0-6a5 5 0 0 1 6 4v2"/>',total:'<path d="M6 5h12M8 9l-3 3 3 3m8-6 3 3-3 3M6 19h12"/>',result:'<path d="M4 19h16M6 16l4-5 3 2 5-7M16 6h2v2"/>',packaging:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7m-9 4v10"/>',logistics:'<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>'};
  if(['limit_switch','soltrk','junction_box','cable_gland','safeguard','anemometer','power_supply','electrical_enclosure'].includes(page))page='electrical';
  else if(['posts','substructure'].includes(page))page='steel';
  else if(['bearing','slew_drive','pv_module'].includes(page))page='major';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[page]||paths.total}</svg>`;
}
function analysisHomeSummary(totals,hasGaps=false){
  const text=analysisCurrencyText(totals,'');return text|| (hasGaps?'Prices required':'0.00');
}
function renderAnalysisHome(){
  const root=document.getElementById('tabAnalysis');if(!root)return;const total=buildTotalCostData(),packages=buildFastenerPackagingData(),logistics=buildLogisticsData(),finalCost=buildFinalCostData(total,logistics),personnel=total.personnel;
  const cards=[
    ...analysisCommercialPages().map(page=>({page,title:ANALYSIS_ITEM_PAGE_CONFIG[page].title,description:ANALYSIS_ITEM_PAGE_CONFIG[page].subtitle,summary:isAnalysisSectionIncluded(page)?supplierCostSummaryText(buildSupplierCostData(page)):'Excluded — client supplied'})),
    {page:'total',title:'Overhead & Final Price',description:'Project overhead, subtotal, final VAT, and final price.',summary:finalCost.finalCostIncludingVat===null?'Configuration required':overheadMoney(finalCost.finalCostIncludingVat)},
    {page:'logistics',title:'Logistics',description:'Container-based external and internal logistics by shipment.',summary:logistics.status==='loading'||logistics.status==='idle'?'Loading logistics':commercialCurrencyText(logistics.grandTotals,logistics.complete?'0.00':'Configuration required')},
    {page:'personnel',title:'Personnel Costs',description:'Read-only monthly, yearly, and per-MW Personnel cost allocation.',summary:personnel.status==='loading'||personnel.status==='idle'?'Loading Personnel costs':personnel.complete?overheadMoney(personnel.projectPersonnelCost):'Configuration required'},
    {page:'packaging',title:'Fastener Packaging',description:'Installation kits for eight connection sections.',summary:`${packages.length} installation sections`},
  ];
  root.innerHTML=`<div class="analysis-home-header"><h2 class="table-title">Project Cost Analysis</h2><p class="table-subtitle">Choose an analysis area for the active project.</p></div><div class="analysis-home-grid">${cards.map(card=>`<button class="analysis-home-card" type="button" data-analysis-page="${card.page}"><span class="analysis-home-icon">${analysisHomeIcon(card.page)}</span><span class="analysis-home-copy"><strong>${escapeHtml(card.title)}</strong><span>${escapeHtml(card.description)}</span><em>${escapeHtml(card.summary)}</em></span><span class="analysis-home-arrow" aria-hidden="true">›</span></button>`).join('')}</div>`;
  const grid=root.querySelector('.analysis-home-grid'),buttons=new Map([...grid.children].map(button=>[button.dataset.analysisPage,button]));grid.classList.add('analysis-home-sections');grid.replaceChildren();
  for(const [title,pages] of [['Steel Structure',['posts','substructure']],['Major Components',['slew_drive','bearing','pv_module']],['Electrical',['soltrk','junction_box','cable_gland','safeguard','anemometer','power_supply','electrical_enclosure','limit_switch']],['Fasteners',['fasteners']],['Logistics',['logistics']],['Personnel',['personnel']],['Summary',['total']],['Packaging',['packaging']]]){
    const section=document.createElement('section');section.className=`analysis-home-section ${pages.length>3?'analysis-home-section-wide':''}`;section.innerHTML=`<h3>${escapeHtml(title)}</h3><div class="analysis-home-grid"></div>`;const sectionGrid=section.querySelector('.analysis-home-grid');pages.forEach(page=>{if(buttons.has(page))sectionGrid.appendChild(buttons.get(page));});grid.appendChild(section);
  }
  root.querySelectorAll('[data-analysis-page]').forEach(button=>button.addEventListener('click',()=>{uiState.analysisPage=button.dataset.analysisPage;renderAnalysis();requestAnimationFrame(updateFixedHorizontalScroll);}));
}
function renderAnalysis(){
  const page=String(uiState.analysisPage||'home'),root=document.getElementById('tabAnalysis');
  ensureCommercialAnalysisData();ensureLogisticsData();ensureOverheadSettings();ensurePersonnelSettings();
  if(analysisCommercialPages().includes(page))renderSupplierCostAnalysis(page);else if(page==='total')renderTotalCostAnalysis();else if(page==='packaging')renderFastenerPackaging();else if(page==='logistics')renderLogisticsAnalysis();else if(page==='personnel')renderPersonnelAnalysis();else{uiState.analysisPage='home';renderAnalysisHome();}
  wireAnalysisTables(root);root?.querySelectorAll('[data-analysis-table]').forEach(refreshAnalysisTable);
}

function projectSummaryRows(p,calc){
  const anemometer=E.getAnemometerSelection(p),destination=window.LumaCountryData.resolveProjectDestination(p.inputs);return [['Field','Value'],['Project Name',p.project_name],['Project Code',p.project_code],['Destination Country',destination||'Not selected'],['Delivery Point',p.inputs.delivery_point],['VAT',`${normalizeVatRate(p.vat_rate)*100}%`],['PV Module Procurement',isPvModuleIncluded(p)?'Included':'Excluded — Client Supplied'],['Foundation Type',p.inputs.foundation_type],['Plant Elevation ASL (m)',p.inputs.elevation_asl],['Final Layout',p.inputs.final_layout_document_number],['PV Module Datasheet',p.inputs.pv_module_datasheet_document_number],['Selected Anemometer',`${anemometer.part} (${anemometer.tag})`],['CAD Blocks Availability',p.inputs.cad_blocks_available],['BOM Mode',E.getBomModeText(p)],['SOLTRK Version',`SOLTRK ${E.normalizeSoltrkVersion(p.soltrk_version)}`],['Max Span Length',p.inputs.max_span_length],['PV Module Power (Wp)',p.inputs.pv_power],['Export Date/Time',formatDateTime()],['Total Trackers',calc.kpis.totalTrackers],['Total PV Modules',calc.kpis.totalModules],['Plant Power (MWp)',Number(calc.kpis.totalPower.toFixed(3))],['BOM Line Items',calc.bom.rows.length]];
}
function inputExportRows(p){const i=p.inputs,anemometer=E.getAnemometerSelection(p),destination=window.LumaCountryData.resolveProjectDestination(i);return [['Input','Value'],['Project Name',p.project_name],['Project Code',p.project_code],['Project Country Mode',i.project_country_type],['Destination Country',destination||'Not selected'],['Delivery Point',i.delivery_point],['PV Module Procurement',isPvModuleIncluded(p)?'Included':'Excluded — Client Supplied'],['Plant Elevation ASL (m)',i.elevation_asl],['Final Layout',i.final_layout_document_number],['PV Module Datasheet',i.pv_module_datasheet_document_number],['Selected Anemometer',`${anemometer.part} (${anemometer.tag})`],['Selected Anemometer Price',`${Number(anemometer.price).toFixed(2)} ${currencyDisplay(anemometer.currency)}`],['CAD Blocks Availability',i.cad_blocks_available],['BOM Mode',E.getBomModeText(p)],['SOLTRK Version',`SOLTRK ${E.normalizeSoltrkVersion(p.soltrk_version)}`],['Max Span Length',i.max_span_length],['PV Module Width',i.pv_module_width],['PV Module Length',i.pv_module_length],['PV Module Transverse Hole Distance',i.pv_module_hole_distance],['PV Module Longitudinal Hole Distance 1',i.pv_module_longitudinal_hole_distance_1],['PV Module Longitudinal Hole Distance 2',i.pv_module_longitudinal_hole_distance_2],['PV Module Longitudinal Hole Distance 3',i.pv_module_longitudinal_hole_distance_3],['Hat Rail Hole Distance',i.hat_rail_hole_distance],['Z Rail Design Offset',i.z_rail_offset],['PV Module Gap',i.pv_module_gap],['PV Module Gap Locked',i.pv_gap_locked?'Yes':'No'],['PV Module Gap Formula','PV Module Transverse Hole Distance + Hat Rail Hole Distance - PV Module Width'],['Motor Gap',i.motor_gap],['Target End Gap',i.target_end_gap],['Overlap A/B',i.overlap_ab],['Overlap B/C',i.overlap_bc],['Main Tube A Length',i.main_beam_a_length],['Slew Drive Connection Length',i.main_beam_connection_length],['Main Tube B Length',i.main_beam_b_length],['Main Tube C Short Length',i.main_beam_c_short_length],['Main Tube C Long Length',i.main_beam_c_long_length],['Mid Plane to Beginning of Main Tube A / Connection',i.mid_plane_to_beam_a]];}
function customBearingExportRows(p,calc){
  if(E.cadBlocksAreAvailable(p)){
    const rows=[['Array Type','Mode','Number of Trackers','Posts / Pairs','North / Pair Distances','South Distances']];for(const pv of Object.keys(p.bearing_rules).sort((a,b)=>Number(a)-Number(b)))for(const rule of E.getBearingRuleVariantsForPv(p,pv))rows.push(ruleToTableValues(Number(pv),rule));return rows;
  }
  const rows=[['Array Type','Mode','Max Span Length (mm)','Tracker Length (mm)','Tracker Type','Bearing Piles']];for(const r of calc.schedule)rows.push([`${r['PV Modules per Tracker']}-PV`,'Symmetrical',E.niceNumber(E.asNumber(p.inputs.max_span_length,7900)),E.niceNumber(r['Tracker Length (mm)']),r['Span Type'],r['Bearing Posts / Tracker']]);return rows;
}
function buildProjectExport(p){
  if(partMasterLoading)throw new Error('Part Master is still loading. Wait for it to finish before exporting.');
  if(partMasterLoadError)throw new Error(`Export blocked: ${partMasterLoadError}`);
  const validation=E.calculateProject(p,partMaster,partMasterColumns);if((validation.engineeringErrors||[]).length)throw new Error(`Export blocked: ${validation.engineeringErrors.join(' ')}`);
  const calc=E.calculateProject(p,partMaster,partMasterColumns);
  const displayExportCell=value=>E.displayTerminology(value);
  const arrayColumns=SELECTED_ARRAY_COLUMNS.map(displayExportCell);
  const arrays=[arrayColumns,...calc.active.map(row=>SELECTED_ARRAY_COLUMNS.map(column=>displayExportCell(row[column]??'')))];
  const bomColumns=calc.bom.columns.filter(column=>!['note','notes','calculationnote'].includes(E.normalizeText(column)));
  const bom=[bomColumns.map(displayExportCell),...calc.bom.rows.map(row=>bomColumns.map(column=>displayExportCell(row[column]??'')))];
  const bomRowStyles=[null,...calc.bom.rows.map(row=>{
    const category=String(row.Category??'').trim().toLowerCase();
    if(category.startsWith('steel structure'))return 'steelStructure';
    if(category.startsWith('fastener'))return 'fasteners';
    return null;
  })];
  const foundationRows=[['Foundation Method',p.inputs.foundation_method],['Drive Pile Depth (mm)',p.inputs.drive_pile_depth_mm],['Drive Pile Type',p.inputs.main_post_profile],['Bearing Pile Depth (mm)',p.inputs.bearing_pile_depth_mm],['Bearing Pile Type',p.inputs.bearing_post_profile]];
  const summaryRows=[...projectSummaryRows(p,calc),...foundationRows];
  const inputRows=[...inputExportRows(p),...foundationRows].map(row=>row.map(displayExportCell));
  const sheets=[{name:'Project Summary',rows:summaryRows},{name:'Inputs',rows:inputRows},{name:'Custom Bearing Rules',rows:customBearingExportRows(p,calc)},{name:'Selected Arrays',rows:arrays},{name:'Project BOM',rows:bom,rowStyles:bomRowStyles,borderEveryCell:true}];
  return {blob:XlsxLite.createWorkbookBlob(sheets),filename:`${safeFilename(p.project_code)}_${safeFilename(p.project_name)}_LUMA_Complete_BOM.xlsx`};
}
async function exportProject(p,directoryHandle=null){
  const file=buildProjectExport(p);if(directoryHandle){await saveBlobToDirectory(file.blob,file.filename,directoryHandle);return {saved:true,picker:true};}
  return saveBlobWithLocation(file.blob,file.filename,'Excel workbook',{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']});
}
async function exportActive(){const p=getActiveProject();if(!p)return;try{const result=await exportProject(p);if(result.saved)showToast(result.picker?'Excel BOM saved.':'Excel BOM downloaded.');}catch(error){alert(error.message||'Export could not be completed.');}}
function exportAllDialog(){
  const projects=Object.values(workspace.projects);const html=`<p>Select the projects to export. One Excel workbook will be downloaded for each selected project.</p><div class="project-check-list">${projects.map(p=>`<label><input type="checkbox" data-export-project="${escapeHtml(p.project_id)}" checked> ${escapeHtml(p.project_code)} — ${escapeHtml(p.project_name)}</label>`).join('')}</div>`;
  openModal('Export Projects',html,[{text:'Cancel',onClick:closeModal},{text:'Export Selected',className:'export',onClick:async()=>{const ids=[...document.querySelectorAll('[data-export-project]:checked')].map(x=>x.dataset.exportProject);if(!ids.length){showToast('Select at least one project.');return;}closeModal();
    if(typeof window.showDirectoryPicker==='function'){
      try{const directory=await window.showDirectoryPicker({mode:'readwrite'});for(const id of ids)await exportProject(workspace.projects[id],directory);showToast(`${ids.length} Excel workbook(s) saved.`);return;}catch(err){if(err?.name==='AbortError')return;console.warn('The folder picker is unavailable; using browser downloads instead.',err);}
    }
    ids.forEach((id,index)=>setTimeout(()=>{const file=buildProjectExport(workspace.projects[id]);downloadBlob(file.blob,file.filename);},index*350));showToast(`${ids.length} Excel workbook(s) downloaded.`);
  }}]);
}
function showChangelog(){
  const versions=Object.keys(CHANGELOG);const latest=versions[versions.length-1];const html=`<div class="modal-form-row"><label>Version:</label><select id="changelogVersion">${versions.map(v=>`<option ${v===latest?'selected':''}>${v}</option>`).join('')}</select></div><div id="changelogDate" style="margin-bottom:8px"></div><div id="changelogText" class="changelog-text"></div>`;openModal(`${APP_NAME} Changelog`,html,[{text:'Close',onClick:closeModal}]);const refresh=()=>{const v=document.getElementById('changelogVersion').value;document.getElementById('changelogDate').textContent=`Date: ${CHANGELOG_DATES[v]||''}`;document.getElementById('changelogText').textContent=`Version ${v}\n${'='.repeat(40)}\n\n${(CHANGELOG[v]||[]).map(x=>`• ${x}`).join('\n')}`;};document.getElementById('changelogVersion').addEventListener('change',refresh);refresh();
}
function showReadme(){
  const html=`<div class="readme-content"><p>A BOM management tool for KSI's LUMA single-axis tracker that automates the workflow from BOM creation through quotation generation.</p><h3>Workspace</h3><p>The workspace toolbar contains <strong>New</strong>, <strong>Open</strong>, <strong>Rename</strong>, and <strong>Save</strong> icon buttons. Hover over an icon to see its name. The current workspace name is shown beside the <strong>WORKSPACE</strong> heading, and new sessions start with the name <strong>Sample</strong>.</p><p><strong>Save</strong> asks where to store the <code>.luma</code> workspace file when the browser supports the system file picker. Otherwise, it uses the browser's normal download behavior. Use <strong>Open</strong> to load that file later.</p><p>Unsaved changes are also stored as browser recovery data when the browser permits local storage. If local storage is restricted for local files, the app still works, but automatic recovery may not be available.</p><h3>Export</h3><p><strong>Active Project</strong> creates one native <code>.xlsx</code> workbook for the active project and asks where to save it when supported by the browser.</p><p><strong>All Projects</strong> lets you select multiple projects and asks for one destination folder for the separate <code>.xlsx</code> workbooks when supported. Otherwise, the files use the browser's normal multiple-download behavior.</p><h3>User Manual</h3><p><a href="${USER_MANUAL_URL}" target="_blank" rel="noopener noreferrer">Version 3.00</a></p></div>`;
  openModal(`${APP_NAME} ${APP_VERSION.replace('Version ','V')}`,html,[{text:'Close',onClick:closeModal}]);
}
function renderAdministration(){
  const root=document.getElementById('tabAdministration');if(!root)return;
  window.LumaAdminSuppliers.render(root);
}
function renderQuotation(){const root=document.getElementById('tabQuotation');if(root&&root.classList.contains('active'))void window.LumaQuotation.render(root);}
function applyPartMasterRows(rows){
  partMaster=(rows||[]).filter(row=>row.Active!==false);
  partMasterColumns=[...PART_MASTER_COLUMNS];
  partMasterLoadError='';partMasterLoading=false;setPartMasterStatus();
  if(workspace){recalculate();renderAll(true);}
}
async function reloadPartMaster({force=true}={}){
  if(!window.LumaPartMasterService){
    partMaster=[];partMasterLoadError='Part Master service is unavailable. BOM generation is unavailable.';setPartMasterStatus(partMasterLoadError,'error');return false;
  }
  partMasterLoading=true;setPartMasterStatus('Loading Part Master from Supabase...','loading');
  try{
    const databaseRows=await window.LumaPartMasterService.loadPartMaster({force});
    if(!databaseRows.length)throw new Error('No active Part Master records were returned.');
    applyPartMasterRows(window.LumaPartMasterService.getActiveParts());
    return true;
  }catch(error){
    console.error('Central Part Master unavailable. BOM generation has been disabled.',error?.message||'unknown');
    partMaster=[];partMasterColumns=[...PART_MASTER_COLUMNS];partMasterLoading=false;
    partMasterLoadError=error?.message||'Part Master could not be loaded. BOM generation is unavailable.';
    setPartMasterStatus(partMasterLoadError,'error');if(workspace){recalculate();renderAll(true);}return false;
  }
}
function renderOutputTabsExceptInputs(){
  if(!current)return;renderArrayTable();renderSelectedArrays();renderBearingLayout();renderSupport();renderBom();renderSketch();renderAnalysis();renderQuotation();renderAdministration();/* Calculation Logic tab hidden; Part Master is administered centrally. */renderBearingSummaryOnly();requestAnimationFrame(()=>requestAnimationFrame(updateFixedHorizontalScroll));
}
function refreshOutputsOnly(){
  recalculate();updateHeaderAndKpis();refreshProjectList();renderOutputTabsExceptInputs();saveRecovery();
}
function renderAll(rebuildInputs=false){
  recalculate();renderTabs();refreshProjectList();updateWorkspaceName();updateHeaderAndKpis();if(rebuildInputs||!document.getElementById('tabInputs').children.length)renderInputsTab();renderOutputTabsExceptInputs();requestAnimationFrame(()=>requestAnimationFrame(updateFixedHorizontalScroll));
}
function getHorizontalScrollParts(){
  const main=document.getElementById('mainContent');const active=document.querySelector('.tab-page.active');let target=null,maxOverflow=0;if(active){for(const el of active.querySelectorAll('.table-wrap,.sketch-box')){const over=Math.max(0,el.scrollWidth-el.clientWidth);if(over>maxOverflow){maxOverflow=over;target=el;}}}return {main,target,mainOverflow:Math.max(0,main.scrollWidth-main.clientWidth),targetOverflow:maxOverflow};
}
function updateFixedHorizontalScroll(){
  const bar=document.getElementById('fixedHorizontalScroll'),inner=document.getElementById('fixedHorizontalScrollInner');if(!bar||!inner)return;if(mobileNavigationEnabled()){fixedScrollTarget=null;bar.classList.remove('visible');bar.scrollLeft=0;return;}const parts=getHorizontalScrollParts();fixedScrollTarget=parts;const total=parts.mainOverflow+parts.targetOverflow;if(total<=1){bar.classList.remove('visible');bar.scrollLeft=0;return;}bar.classList.add('visible');inner.style.width=`${bar.clientWidth+total}px`;syncFixedBarFromTargets();
}
function syncFixedBarFromTargets(){
  if(!fixedScrollTarget||fixedScrollSyncing)return;fixedScrollSyncing=true;const {main,target,mainOverflow}=fixedScrollTarget;const bar=document.getElementById('fixedHorizontalScroll');bar.scrollLeft=Math.min(main.scrollLeft,mainOverflow)+(target?target.scrollLeft:0);fixedScrollSyncing=false;
}

function onFixedScroll(){
  if(!fixedScrollTarget||fixedScrollSyncing)return;fixedScrollSyncing=true;const bar=document.getElementById('fixedHorizontalScroll'),{main,target,mainOverflow}=fixedScrollTarget;const pos=bar.scrollLeft;main.scrollLeft=Math.min(pos,mainOverflow);if(target)target.scrollLeft=Math.max(0,pos-mainOverflow);fixedScrollSyncing=false;
}
function attachScrollSyncListeners(){
  document.getElementById('fixedHorizontalScroll').addEventListener('scroll',onFixedScroll);document.getElementById('mainContent').addEventListener('scroll',()=>{if(!fixedScrollSyncing)syncFixedBarFromTargets();});document.addEventListener('scroll',e=>{if(e.target?.classList?.contains('table-wrap')||e.target?.classList?.contains('sketch-box')){if(!fixedScrollSyncing)syncFixedBarFromTargets();}},true);window.addEventListener('resize',()=>requestAnimationFrame(updateFixedHorizontalScroll));
}
function handleWorkspaceFile(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{loadWorkspacePayload(JSON.parse(reader.result));showToast('Workspace loaded.');}catch(err){alert(`Could not open workspace:\n${err.message}`);}};reader.readAsText(file);
}
function initEvents(){
  document.getElementById('modalCloseBtn').addEventListener('click',closeModal);document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal();});
  document.getElementById('mobileMenuBtn').addEventListener('click',()=>setMobileNavigationOpen(!document.body.classList.contains('mobile-nav-open')));document.getElementById('mobileMenuCloseBtn').addEventListener('click',()=>setMobileNavigationOpen(false));document.getElementById('sidebarScrim').addEventListener('click',()=>setMobileNavigationOpen(false));document.addEventListener('keydown',handleMobileNavigationKeydown);window.addEventListener('resize',syncMobileNavigation);syncMobileNavigation();
  document.getElementById('newWorkspaceBtn').addEventListener('click',newWorkspace);document.getElementById('openWorkspaceBtn').addEventListener('click',openWorkspace);document.getElementById('renameWorkspaceBtn').addEventListener('click',renameWorkspace);document.getElementById('saveWorkspaceBtn').addEventListener('click',saveWorkspace);
  document.getElementById('newProjectBtn').addEventListener('click',newProject);document.getElementById('duplicateProjectBtn').addEventListener('click',duplicateProject);document.getElementById('renameProjectBtn').addEventListener('click',renameProject);document.getElementById('deleteProjectBtn').addEventListener('click',deleteProject);document.getElementById('resetProjectBtn').addEventListener('click',resetCurrentProject);
  document.getElementById('projectSearch').addEventListener('input',refreshProjectList);document.getElementById('projectList').addEventListener('change',e=>{selectProject(e.target.value);if(mobileNavigationEnabled())setMobileNavigationOpen(false);});
  document.getElementById('exportActiveBtn').addEventListener('click',exportActive);document.getElementById('exportAllBtn').addEventListener('click',exportAllDialog);document.getElementById('changelogBtn').addEventListener('click',showChangelog);document.getElementById('readmeBtn').addEventListener('click',showReadme);
  document.getElementById('workspaceFileInput').addEventListener('change',e=>{handleWorkspaceFile(e.target.files[0]);e.target.value='';});
  attachScrollSyncListeners();document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='s'){e.preventDefault();saveWorkspace();}else if(key==='n'){e.preventDefault();newProject();}else if(key==='d'){e.preventDefault();duplicateProject();}else if(key==='o'){e.preventDefault();openWorkspace();}});
}
let appStarted = false;
function initApp(){
  if(appStarted)return;appStarted=true;
  initEvents();let loaded=false;const recoveryEntry=firstStorageEntry([RECOVERY_KEY,...LEGACY_RECOVERY_KEYS]);try{if(recoveryEntry?.value){const recover=confirm('An unsaved recovery workspace was found.\n\nChoose OK to recover it, or Cancel to start with a new default workspace.');if(recover){loadWorkspacePayload(JSON.parse(recoveryEntry.value),true);LEGACY_RECOVERY_KEYS.forEach(storageRemove);loaded=true;}else{storageRemove(recoveryEntry.key);LEGACY_RECOVERY_KEYS.forEach(storageRemove);}}}catch{if(recoveryEntry)storageRemove(recoveryEntry.key);}
  if(!loaded){workspace=makeDefaultWorkspace();partMasterColumns=[...PART_MASTER_COLUMNS];partMaster=[];renderAll(true);saveRecovery();}
  void reloadPartMaster({force:true});void window.LumaQuotation?.loadSettings?.();
}

function refreshAuthorization(){
  if(!appStarted)return;renderTabs();renderAdministration();
  if(window.LumaAuth?.getSession?.()){void reloadPartMaster({force:true});window.LumaOverheadService?.invalidate?.();window.LumaPersonnelService?.invalidate?.();ensureOverheadSettings();ensurePersonnelSettings();}
}
function refreshLogistics(){
  if(!appStarted)return;const loading=window.LumaLogisticsService?.loadActiveRates?.({force:true});if(loading)void loading.then(()=>renderAnalysis()).catch(()=>renderAnalysis());
}
function refreshOverhead(){if(appStarted)renderAnalysis();}
function refreshPersonnel(){if(appStarted)renderAnalysis();}

function getPartMasterItems(){
  const items=[],seen=new Set();
  for(const record of partMaster||[]){
    const tag=String(record?.TAG||'').trim(),key=tag.toLowerCase();if(!tag||seen.has(key))continue;seen.add(key);
    items.push(Object.freeze({tag,part:String(record?.Part||'').trim(),partNumber:String(record?.['Part Number']||'').trim(),description:String(record?.Description||'').trim(),unit:String(record?.Unit||'').trim(),category:String(record?.Category||'').trim(),material:String(record?.Material||'').trim(),weight:record?.Weight??'',postKind:String(record?.['Post Kind']||'').trim()}));
  }
  return Object.freeze(items.sort((a,b)=>a.tag.localeCompare(b.tag)).slice());
}

window.LumaApp = Object.freeze({init:initApp,refreshAuthorization,refreshLogistics,refreshOverhead,refreshPersonnel,getPartMasterItems,getLogisticsCargoAmount,reloadPartMaster,getPartMaster:()=>partMaster,getActiveProject,getCalculation:()=>current,getCommercialSummary:()=>buildTotalCostData(),getLogisticsSummary:()=>buildLogisticsData(),getPersonnelSummary:()=>buildPersonnelCostData(),getFinalCostSummary:()=>buildFinalCostData(),getResultSummary:()=>buildResultAnalysisData(),markProjectDirty:()=>markDirty()});
