'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'luma-quotation-local-smoke'));
fs.mkdirSync(path.join(output, 'assets'), {recursive:true});

const window = {};
const context = vm.createContext({window, String, Array, Object, Number, Map, Math});
for (const filename of ['quotation-field-definitions.js','quotation-latex.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, filename), 'utf8'), context, {filename});
}

const quotation = {
  customer_company:'Energy & Solar S.r.l.', title:'Mr', client_first_name:'Alex', client_last_name:'Rossi',
  address:'Via Esempio 12', postal_code:'20123', city:'Milano', country:'Italy', project_location:'Peru',
  quotation_number:'123456', date:'2026-08-28', general_layout:'GL-001', template_fields:{},
};
const fields = window.LumaQuotationFields.fieldValues(quotation);
const warnings = window.LumaQuotationLatex.overflowWarnings({fields});
if (warnings.length) throw new Error(warnings.join('\n'));

const baseLayout = fs.readFileSync(path.join(root, 'quotation/quotation-field-layout.tex'), 'utf8');
fs.copyFileSync(path.join(root, 'quotation/LUMA_Quotation.tex'), path.join(output, 'LUMA_Quotation.tex'));
fs.copyFileSync(path.join(root, 'quotation/assets/LUMA_ENG_static.pdf'), path.join(output, 'assets/LUMA_ENG_static.pdf'));
fs.writeFileSync(path.join(output, 'quotation_variables.tex'), window.LumaQuotationLatex.buildVariables({fields}), 'utf8');
fs.writeFileSync(path.join(output, 'quotation-field-layout.tex'), window.LumaQuotationLatex.buildLayout(baseLayout, {fields}), 'utf8');
console.log(output);
