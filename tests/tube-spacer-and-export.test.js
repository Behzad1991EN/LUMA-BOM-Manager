'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function storedZipFiles(arrayBuffer){
  const bytes=Buffer.from(arrayBuffer),files=new Map();
  let offset=0;
  while(offset+30<=bytes.length && bytes.readUInt32LE(offset)===0x04034b50){
    const length=bytes.readUInt32LE(offset+18);
    const nameLength=bytes.readUInt16LE(offset+26);
    const extraLength=bytes.readUInt16LE(offset+28);
    const nameStart=offset+30;
    const dataStart=nameStart+nameLength+extraLength;
    const name=bytes.subarray(nameStart,nameStart+nameLength).toString('utf8');
    files.set(name,bytes.subarray(dataStart,dataStart+length).toString('utf8'));
    offset=dataStart+length;
  }
  return files;
}

test('Tube Spacer is a Fasteners item with the requested description and linked quantity',()=>{
  const migration=read('supabase/migrations/20260917002300_tube_spacer_fastener_category.sql');
  assert.match(migration,/description = 'M12 × 16 × 12\.7 × 13\.3'/);
  assert.match(migration,/category = 'Fasteners \/ Main Tube - Main Tube'/);
  assert.match(migration,/calculation_note = '2 × k001388'/);
  assert.doesNotMatch(migration,/unit_price\s*=/);
  assert.match(read('engine.js'),/\['k001479 - Tube Spacer',r=>2\*torqueTubeConnectionFastenersForRow\(r\)/);
});

test('Excel export borders every filled cell and keeps complete Project BOM row borders',async()=>{
  const context=vm.createContext({Blob,TextEncoder,Uint8Array});
  vm.runInContext(read('xlsx-lite.js'),context,{filename:'xlsx-lite.js'});
  const blob=context.XlsxLite.createWorkbookBlob([
    {name:'Summary',rows:[['Field','Value','Optional'],['Project','Sample',''],['Zero',0,'Complete']]},
    {name:'Project BOM',rows:[
      ['TAG','Category','Total Qty'],
      ['k001152','Steel Structure / Post',2],
      ['k001479','Fasteners / Main Tube - Main Tube'],
      ['k001393','Limit Switch',4],
    ],rowStyles:[null,'steelStructure','fasteners',null],borderEveryCell:true},
  ]);
  const files=storedZipFiles(await blob.arrayBuffer());
  const styles=files.get('xl/styles.xml');
  const summary=files.get('xl/worksheets/sheet1.xml');
  const bom=files.get('xl/worksheets/sheet2.xml');
  assert.ok(styles&&summary&&bom);
  assert.match(styles,/fgColor rgb="FFDDEFF8"/);
  assert.match(styles,/fgColor rgb="FFFFF2CE"/);
  const borderedStyles=[...styles.matchAll(/<xf numFmtId="0" fontId="\d" fillId="\d" borderId="1"[^>]*>/g)];
  assert.equal(borderedStyles.length,4,'all export cell styles must use the thin border');
  for(const [row,style] of [[1,1],[2,3],[3,4],[4,2]]){
    const rowXml=bom.match(new RegExp(`<row r="${row}">([\\s\\S]*?)<\\/row>`))?.[1];
    assert.ok(rowXml,`Project BOM row ${row} is present`);
    for(const column of ['A','B','C'])assert.match(rowXml,new RegExp(`<c r="${column}${row}" s="${style}"`));
  }
  assert.match(summary,/<c r="A2" s="2"/);
  assert.match(summary,/<c r="B3" s="2" t="n"><v>0<\/v>/,'numeric zero is a filled bordered cell');
  assert.match(summary,/<c r="C3" s="2"/,'filled text receives the simple border');
  assert.match(summary,/<c r="C2" s="0"/,'an intentionally blank non-BOM cell is not bordered');
  assert.match(read('app.js'),/rowStyles:bomRowStyles,borderEveryCell:true/);
});
