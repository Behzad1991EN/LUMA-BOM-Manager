'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('post configuration resolves only exact authoritative combinations',()=>{
  const context={globalThis:{}};vm.createContext(context);vm.runInContext(read('post-configuration-service.js'),context);
  const service=context.globalThis.LumaPostConfiguration,parts=[
    {TAG:'k001152',Active:true,'Post Kind':'Main Post','Foundation Method':'Ramming','Foundation Depth mm':2000,'Profile Type':'HEA 140'},
    {TAG:'k001120',Active:true,'Post Kind':'Bearing Post','Foundation Method':'Ramming','Foundation Depth mm':2000,'Profile Type':'C'},
    {TAG:'future',Active:true,'Post Kind':'Drive Pile','Foundation Method':'Ramming','Foundation Depth mm':2600,'Profile Type':'HEA 140'},
    {TAG:'bearing-2300',Active:true,'Post Kind':'Bearing Pile','Foundation Method':'Ramming','Foundation Depth mm':2300,'Profile Type':'C'},
  ];
  assert.deepEqual(Array.from(service.depthOptions(parts,'Drive Pile')),['2000','2600']);
  assert.deepEqual(Array.from(service.depthOptions(parts,'Bearing Pile')),['2000','2300']);
  assert.deepEqual(Array.from(service.profileOptions(parts,'Main Post')),['HEA 140']);
  const project={inputs:{foundation_method:'Ramming',drive_pile_depth_mm:'2000',bearing_pile_depth_mm:'2300',main_post_profile:'HEA 140',bearing_post_profile:'C'}};
  assert.equal(service.resolve(parts,service.selection(project,'Main Post')).TAG,'k001152');
  assert.equal(service.validate(project,parts).valid,true);
  assert.equal(service.validate(project,parts).matches.bearing.TAG,'bearing-2300');
  project.inputs.main_post_profile='HEA 160';
  const result=service.validate(project,parts);
  assert.equal(result.valid,false);
  assert.match(result.errors[0],/No Drive Pile is configured/);
  parts.push({...parts[0],TAG:'duplicate'});
  project.inputs.main_post_profile='HEA 140';
  assert.match(service.validate(project,parts).errors[0],/More than one active Part Master record/);
});

test('database migrations enforce central Part Master, admin writes, demo labels, and quotation snapshots',()=>{
  const part=read('supabase/migrations/20260827000500_create_part_master.sql');
  const categories=read('supabase/migrations/20260827000400_expand_commercial_categories_and_demo_data.sql');
  const quotes=read('supabase/migrations/20260827000600_create_quotation_foundation.sql');
  assert.match(part,/create table public\.part_master/);
  assert.match(part,/Admins can update Part Master records/);
  assert.match(part,/private\.is_admin\(\)/);
  assert.match(part,/k001152/);assert.match(part,/k060356/);
  assert.match(categories,/commercial_category_migration_ambiguities/);
  assert.match(categories,/DEMO \/ SAMPLE/);
  assert.match(quotes,/create table public\.quotations/);
  assert.match(quotes,/snapshot jsonb not null/);
  assert.match(quotes,/created_by = \(select auth\.uid\(\)\)/);
});

test('quotation model reads project, BOM, engineering, commercial, and customer sources once',()=>{
  const window={};
  const context=vm.createContext({window,Date,Number,String,Object,Array,Set,Map,Math});
  vm.runInContext(read('currency-data.js'),context);
  vm.runInContext(read('quotation-field-definitions.js'),context);
  vm.runInContext(read('quotation-model.js'),context);
  const project={project_id:'p1',project_code:'P-1',project_name:'Project',inputs:{foundation_method:'Ramming',drive_pile_depth_mm:'2000',bearing_pile_depth_mm:'2300',pv_module_width:'1134',pv_module_length:'2384',pv_power:'700'},quotation:{quotation_number:'Q-1',customer_company:'Client'}};
  const calculation={kpis:{totalPower:2,totalTrackers:10,totalModules:500},active:[{'PV Modules per Tracker':50,'Tracker Length (mm)':63000}],bom:{rows:[{TAG:'k001405','Part Name':'Safeguard','Total Qty':2},{TAG:'post','Part Name':'Drive Pile','Total Qty':10}]}};
  const model=window.LumaQuotationModel.fromApplication(project,calculation,{grandTotals:{EUR:12345},gapCount:0});
  assert.equal(model.projectMWp,2);
  assert.equal(model.trackerCount,10);
  assert.equal(model.pileCount,10);
  assert.equal(model.quotationTotal,12345);
  assert.equal(model.quotationNumber,'Q-1');
  assert.equal(Object.keys(model.fields).length,37);
  assert.equal(model.fields.trackerOfferQuantity,'2000');
  assert.equal(model.fields.panelsPerStructure,'50');
  assert.equal(model.fields.structureCount,'10');
  assert.equal(model.fields.pileCount,'10');
  assert.equal(model.fields.moduleCount,'500');
  assert.equal(model.fields.foundationDepthM,'2');
  assert.equal(model.fieldSources.trackerOfferQuantity,'TBD');
});

test('quotation groups array types, totals every pile, and rounds the longest tracker upward to two decimals',()=>{
  const window={};
  const context=vm.createContext({window,Date,Number,String,Object,Array,Set,Map,Math});
  vm.runInContext(read('currency-data.js'),context);
  vm.runInContext(read('quotation-field-definitions.js'),context);
  vm.runInContext(read('quotation-model.js'),context);
  vm.runInContext(read('quotation-latex.js'),context);
  const project={project_id:'p2',inputs:{},quotation:{quotation_number:'Q-2'}};
  const calculation={
    kpis:{totalPower:1,totalTrackers:9,totalModules:415},
    active:[
      {'PV Modules per Tracker':43,'Number of Trackers':2,'Bearing Posts / Tracker':4,'Tracker Length (mm)':63101},
      {'PV Modules per Tracker':43,'Number of Trackers':3,'Bearing Posts / Tracker':5,'Tracker Length (mm)':63201},
      {'PV Modules per Tracker':50,'Number of Trackers':4,'Bearing Posts / Tracker':6,'Tracker Length (mm)':62888},
    ],
    bom:{rows:[]},
  };
  const model=window.LumaQuotationModel.fromApplication(project,calculation,{grandTotals:{EUR:0},gapCount:0});
  assert.deepEqual(JSON.parse(JSON.stringify(model.structureConfigurations)),[
    {panels:43,quantity:5},
    {panels:50,quantity:4},
  ]);
  assert.equal(model.pileCount,56);
  assert.equal(model.fields.pileCount,'56');
  assert.equal(model.trackerLengthM,63.21);
  assert.equal(model.fields.trackerLengthM,'63.21');
  const variables=window.LumaQuotationLatex.buildVariables(model);
  assert.match(variables,/\\PlaceConfigurationLine\{220\.820\}\{N\. of structures with 43 panels: 5\}/);
  assert.match(variables,/\\PlaceConfigurationLine\{233\.668\}\{N\. of structures with 50 panels: 4\}/);
  assert.doesNotMatch(window.LumaQuotationLatex.overflowWarnings(model).join('\n'),/Tracker Length|Panels per Structure|Number of Structures|Number of Piles/);
});

test('quotation reads the complete parameterized LaTeX template and safely connects every field',()=>{
  const renderer=read('quotation-renderer.js'),registrySource=read('quotation-field-definitions.js'),latex=read('quotation-latex.js'),styles=read('style.css'),html=read('index.html'),master=read('LaTeX/LUMA Quotation-3-revised.tex'),defaults=read('LaTeX/quotation_variables.tex');
  const window={};const context=vm.createContext({window,String,Array,Object,Number,Map,Math});
  vm.runInContext(read('currency-data.js'),context);
  vm.runInContext(registrySource,context);vm.runInContext(latex,context);
  assert.equal(window.LumaQuotationLatex.escapeLatex('\\{}#$%&_~^'),'\\textbackslash{}\\{\\}\\#\\$\\%\\&\\_\\textasciitilde{}\\textasciicircum{}');
  const fields=window.LumaQuotationFields.fieldValues({customer_company:'Energy & Solar S.r.l.',project_location:'Milan_1',quotation_number:'Q#20',template_fields:{}});
  const variables=window.LumaQuotationLatex.buildVariables({fields,clientFirstName:'Ada',clientLastName:'Lovelace',clientPostalCode:'20123',clientCity:'Milan',projectMWp:1.5,quotationVersion:'02',quotationDate:'2026-09-07',quotationCurrency:'EUR',pricePerKw:120,quotationTotal:180000});
  assert.match(variables,/\\newcommand\{\\QFClientCompany\}\{Energy \\& Solar S\.r\.l\.\}/);
  assert.match(variables,/\\newcommand\{\\QFProjectLocation\}\{Milan\\_1\}/);
  assert.match(variables,/\\newcommand\{\\QFQuotationNumber\}\{Q\\#20\}/);
  assert.match(variables,/\\newcommand\{\\QFClientName\}\{Ada Lovelace\}/);
  assert.match(variables,/\\newcommand\{\\QFProjectMWp\}\{1,5\}/);
  assert.match(variables,/\\newcommand\{\\QFQuotationDate\}\{07\/09\/2026\}/);
  assert.match(variables,/\\newcommand\{\\QFCurrencySymbol\}\{€\}/);
  assert.ok((variables.match(/\\newcommand/g)||[]).length>37);
  assert.equal(window.LumaQuotationFields.FIELDS.length,37);
  assert.deepEqual(Array.from(new Set(window.LumaQuotationFields.FIELDS.map(field=>field.page))),[1,4,5,6,11]);
  assert.deepEqual(Array.from(new Set(window.LumaQuotationFields.FIELDS.map(field=>field.pdfPage))),[1,3,4,5,10]);
  assert.equal(window.LumaQuotationFields.get('projectLocation').maxLength,30);
  assert.equal(window.LumaQuotationFields.get('projectLocation').overflowCheck,false);
  assert.equal(window.LumaQuotationFields.fieldValues({project_location:'123456789012345678901234567890EXTRA',template_fields:{}}).projectLocation,'123456789012345678901234567890');
  assert.equal(window.LumaQuotationFields.primaryControls().find(control=>control.key==='project_location').maxLength,30);
  const modelWindow={LumaQuotationFields:window.LumaQuotationFields,LumaCurrencyData:window.LumaCurrencyData};
  vm.runInContext(read('quotation-model.js'),vm.createContext({window:modelWindow,String,Array,Object,Number,Map,Math,Date}));
  assert.equal(modelWindow.LumaQuotationModel.normalize({project_location:'123456789012345678901234567890EXTRA'}).project_location,'123456789012345678901234567890');
  assert.ok(window.LumaQuotationFields.FIELDS.every(field=>field.source==='TBD'&&['base west','base east'].includes(field.text.anchor)));
  assert.ok(window.LumaQuotationFields.FIELDS.some(field=>field.text.anchor==='base east'));
  assert.match(renderer,/LaTeX\//);
  assert.match(renderer,/LUMA%20Quotation-3-revised\.tex/);
  assert.match(renderer,/Original\/source_media\/image1\.jpg/);
  assert.match(renderer,/Picture\/image8\.png/);
  assert.doesNotMatch(renderer,/LUMA_ENG_static\.pdf|quotation-field-layout\.tex/);
  assert.match(renderer,/data-quotation-pdf/);
  assert.match(renderer,/LumaQuotationCompiler\.compileQuotation/);
  assert.match(renderer,/showSaveFilePicker/);
  assert.match(renderer,/createWritable/);
  assert.match(renderer,/savePdfBlob\(state\.blob, filename, state\.url\)/);
  assert.match(renderer,/>Save PDF<\/button>/);
  assert.match(renderer,/role="progressbar"/);
  assert.match(renderer,/data-quotation-progress-elapsed/);
  assert.match(renderer,/maxlength="\$\{maxLength\}"/);
  assert.doesNotMatch(renderer,/data-quotation-character-limit|quotation-character-limit/);
  assert.match(renderer,/PDF page \$\{definition\.pdfPage\}/);
  assert.doesNotMatch(renderer,/SwiftLaTeX|XeTeX|Dvipdfmx/);
  assert.doesNotMatch(renderer,/live browser compilation is intentionally disabled/i);
  assert.match(master,/\\input\{quotation_variables\.tex\}/);
  assert.match(master,/\\QFClientCompany/);
  assert.match(master,/\\QFTrackerOfferQuantity/);
  assert.match(master,/\\QFQuotationTotal/);
  assert.match(master,/\\QFGeneralLayoutReference/);
  assert.match(master,/\\QFStructureConfigurationRows/);
  assert.match(master,/\\PlaceConfigurationDetailLine/);
  assert.match(master,/\\showplaceholdersfalse/);
  assert.match(master,/\\PlaceSourceValue/);
  assert.doesNotMatch(master,/QuotationPageOneOverlay|includepdf/);
  assert.match(latex,/function fittedFontSize/);
  assert.match(latex,/overflowWarnings/);
  const usedCommands=new Set(master.match(/\\QF[A-Za-z]+/g)||[]),defaultCommands=new Set((defaults.match(/\\newcommand\{(\\QF[A-Za-z]+)\}/g)||[]).map(line=>line.match(/\\newcommand\{(\\QF[A-Za-z]+)\}/)[1]));
  assert.deepEqual([...usedCommands].filter(command=>!defaultCommands.has(command)),[]);
  assert.doesNotMatch(html,/docx-preview|pizzip|jszip/i);
  assert.match(html,/quotation-model\.js\?v=20260917-pile-terminology/);
  assert.match(html,/quotation-field-definitions\.js\?v=20260908-location-limit/);
  assert.match(html,/quotation-latex\.js\?v=20260908-location-limit/);
  assert.match(html,/quotation\/compilers\/quotation-compiler\.js/);
  assert.match(html,/quotation\/compilers\/swiftlatex-compiler\.js/);
  assert.match(html,/quotation-renderer\.js\?v=20260908-location-limit/);
  assert.doesNotMatch(styles,/\.quotation-page\b|\.docx-wrapper/);
  assert.match(styles,/\.quotation-pdf-frame/);
  assert.match(styles,/\.quotation-field\s*\{[^}]*gap:\s*8px/s);
  assert.match(styles,/\.quotation-log/);
  assert.match(styles,/@keyframes quotation-progress-motion/);
});

test('replaceable quotation compiler delegates without exposing a backend to the renderer',async()=>{
  const window={};
  vm.runInContext(read('quotation/compilers/quotation-compiler.js'),vm.createContext({window,Blob,Map,Object,TypeError,Error}));
  const expected=new Blob(['pdf'],{type:'application/pdf'});
  window.LumaQuotationCompiler.registerAdapter({id:'test-adapter',compileQuotation:async(files,mainFile)=>({blob:expected,log:`${mainFile}:${files.size}`})});
  const result=await window.LumaQuotationCompiler.compileQuotation(new Map([['main.tex','source']]),'main.tex');
  assert.equal(result.blob,expected);
  assert.equal(result.log,'main.tex:1');
  assert.equal(window.LumaQuotationCompiler.getAdapterId(),'test-adapter');
});

test('SwiftLaTeX adapter vendors the official XeTeX and Dvipdfmx workers locally',()=>{
  const adapter=read('quotation/compilers/swiftlatex-compiler.js'),worker=read('quotation/vendor/swiftlatex/luma-swiftlatexxetex-worker.js'),notice=read('quotation/vendor/swiftlatex/THIRD_PARTY_NOTICES.md');
  assert.match(adapter,/luma-swiftlatexxetex-worker\.js/);
  assert.match(adapter,/https:\/\/texlive\.texlyre\.org\//);
  assert.match(adapter,/settexliveurl/);
  assert.match(worker,/importScripts\('swiftlatexxetex\.js'\)/);
  assert.match(worker,/WORKROOT/);
  assert.match(adapter,/swiftlatexdvipdfm\.js/);
  assert.match(adapter,/compileformat/);
  assert.match(adapter,/compiling-pass-1/);
  assert.match(adapter,/converting-pdf/);
  assert.match(adapter,/swiftlatexxetex\.fmt/);
  assert.match(adapter,/compilelatex/);
  assert.match(adapter,/compilepdf/);
  assert.match(adapter,/new Blob\(\[pdf\.bytes\], \{type:PDF_MIME\}\)/);
  assert.match(notice,/v20022022/);
  assert.ok(fs.statSync(path.join(__dirname,'..','quotation/vendor/swiftlatex/swiftlatexxetex.wasm')).size>3000000);
  assert.ok(fs.statSync(path.join(__dirname,'..','quotation/vendor/swiftlatex/swiftlatexdvipdfm.wasm')).size>700000);
});

test('analysis and project inputs use contained responsive groups',()=>{
  const app=read('app.js'),styles=read('style.css');
  assert.match(app,/analysis-home-sections/);
  assert.match(app,/class="paired-field"/);
  assert.match(styles,/\.analysis-home-grid\.analysis-home-sections/);
  assert.match(styles,/\.anemometer-selection\s*\{[^}]*flex-direction:\s*row/s);
});

test('PV capacity and foundation controls are grouped in their requested input sections',()=>{
  const app=read('app.js');
  const projectStart=app.indexOf('<h2 class="section-title">Project Inputs</h2>');
  const pvStart=app.indexOf('<h2 class="section-title">PV Module Inputs</h2>');
  const foundationStart=app.indexOf('<h2 class="section-title">Foundation Input</h2>');
  const beamStart=app.indexOf('<h2 class="section-title">Torque Tube Inputs</h2>');
  assert.ok(projectStart>=0&&projectStart<pvStart&&pvStart<foundationStart&&foundationStart<beamStart);
  const projectSection=app.slice(projectStart,pvStart);
  const pvSection=app.slice(pvStart,foundationStart);
  const foundationSection=app.slice(foundationStart,beamStart);
  assert.doesNotMatch(projectSection,/pv_power|foundation_method|foundation_depth_mm|main_post_profile|bearing_post_profile/);
  assert.match(pvSection,/inputRow\('PV Module Capacity \(Wp\)','pv_power'/);
  assert.ok(pvSection.indexOf("'pv_power'")<pvSection.indexOf("'pv_module_width'"));
  assert.match(foundationSection,/selectRow\('Method','foundation_method'/);
  assert.match(foundationSection,/selectRow\('Drive Pile Depth \(mm\)','drive_pile_depth_mm'/);
  assert.match(foundationSection,/selectRow\('Drive Pile Type','main_post_profile'/);
  assert.match(foundationSection,/selectRow\('Bearing Pile Depth \(mm\)','bearing_pile_depth_mm'/);
  assert.match(foundationSection,/selectRow\('Bearing Pile Type','bearing_post_profile'/);
});

test('Project Inputs store and export free-text document references after Plant Elevation',()=>{
  const app=read('app.js'),engine=read('engine.js');
  assert.match(engine,/final_layout_document_number:''/);
  assert.match(engine,/pv_module_datasheet_document_number:''/);
  const projectStart=app.indexOf('<h2 class="section-title">Project Inputs</h2>');
  const pvStart=app.indexOf('<h2 class="section-title">PV Module Inputs</h2>');
  const projectSection=app.slice(projectStart,pvStart);
  const elevation=projectSection.indexOf('${anemometerInputRow(p)}');
  const finalLayout=projectSection.indexOf("inputRow('Final Layout','final_layout_document_number'");
  const datasheet=projectSection.indexOf("inputRow('PV Module Datasheet','pv_module_datasheet_document_number'");
  const cadAvailability=projectSection.indexOf('CAD Blocks Availability');
  assert.ok(elevation>=0&&elevation<finalLayout&&finalLayout<datasheet&&datasheet<cadAvailability);
  assert.match(projectSection,/inputRow\('Final Layout','final_layout_document_number',i\.final_layout_document_number,'type="text" placeholder="Enter Document Number"'\)/);
  assert.match(projectSection,/inputRow\('PV Module Datasheet','pv_module_datasheet_document_number',i\.pv_module_datasheet_document_number,'type="text" placeholder="Enter Document Number"'\)/);
  assert.match(app,/\['Final Layout',p\.inputs\.final_layout_document_number\]/);
  assert.match(app,/\['PV Module Datasheet',p\.inputs\.pv_module_datasheet_document_number\]/);
  assert.match(app,/\['Final Layout',i\.final_layout_document_number\]/);
  assert.match(app,/\['PV Module Datasheet',i\.pv_module_datasheet_document_number\]/);
});
