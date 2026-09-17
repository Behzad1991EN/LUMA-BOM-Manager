'use strict';

(function initializeResultCostCalculator(global) {
  const VAT_RATES=Object.freeze([0,0.10,0.22]);
  const MATERIAL_FIELDS=Object.freeze(['cost','transportGenoa','transportItalian','transportFob']);
  const blank=value=>value===null||value===undefined||String(value).trim()==='';
  const number=value=>{if(blank(value))return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;};
  const nonNegative=value=>{const parsed=number(value);return parsed!==null&&parsed>=0?parsed:null;};
  const percent=value=>{if(blank(value))return 0;return number(value);};
  const normalizeVatRate=value=>{const parsed=Number(value);return VAT_RATES.includes(parsed)?parsed:0;};

  function calculate({materialSections=[],internalRows=[],contingencyPercent=0,marginPercent=0,vatRate=0}={}){
    const errors=[];
    const materials=(Array.isArray(materialSections)?materialSections:[]).map(source=>{
      const values=Object.fromEntries(MATERIAL_FIELDS.map(field=>[field,nonNegative(source?.[field])]));
      const complete=source?.complete!==false&&MATERIAL_FIELDS.every(field=>values[field]!==null);
      if(!complete)errors.push(`${String(source?.label||'Material section')} is incomplete.`);
      const landedCost=complete?MATERIAL_FIELDS.reduce((sum,field)=>sum+values[field],0):null;
      return {...source,...values,complete,landedCost};
    });
    const materialComplete=materials.length>0&&materials.every(row=>row.complete);
    const materialLandedTotal=materialComplete?materials.reduce((sum,row)=>sum+row.landedCost,0):null;
    const internals=(Array.isArray(internalRows)?internalRows:[]).map(source=>{
      const costPerMw=nonNegative(source?.costPerMw),projectCost=nonNegative(source?.projectCost),complete=source?.complete!==false&&costPerMw!==null&&projectCost!==null;
      if(!complete)errors.push(`${String(source?.label||'Internal cost')} is incomplete.`);
      return {...source,costPerMw,projectCost,complete};
    });
    const internalComplete=internals.length>0&&internals.every(row=>row.complete);
    const internalCostTotal=internalComplete?internals.reduce((sum,row)=>sum+row.projectCost,0):null;
    const contingency=percent(contingencyPercent),margin=percent(marginPercent),vat=normalizeVatRate(vatRate);
    if(contingency===null||contingency<0)errors.push('Contingency percentage must be zero or greater.');
    if(margin===null)errors.push('Margin percentage must be a valid number.');
    const totalInternalCost=materialLandedTotal!==null&&internalCostTotal!==null?materialLandedTotal+internalCostTotal:null;
    const contingencyAmount=totalInternalCost!==null&&contingency!==null&&contingency>=0?totalInternalCost*(contingency/100):null;
    const expectedCost=totalInternalCost!==null&&contingencyAmount!==null?totalInternalCost+contingencyAmount:null;
    const marginAmount=expectedCost!==null&&margin!==null?expectedCost*(margin/100):null;
    const priceBeforeVat=expectedCost!==null&&marginAmount!==null?expectedCost+marginAmount:null;
    const vatAmount=priceBeforeVat!==null?priceBeforeVat*vat:null;
    const finalPrice=priceBeforeVat!==null&&vatAmount!==null?priceBeforeVat+vatAmount:null;
    const withShares=materials.map(row=>({...row,shareInMaterial:row.landedCost!==null&&materialLandedTotal>0?row.landedCost/materialLandedTotal*100:null,shareInTotal:row.landedCost!==null&&totalInternalCost>0?row.landedCost/totalInternalCost*100:null}));
    const internalWithShares=internals.map(row=>({...row,shareInTotal:row.projectCost!==null&&totalInternalCost>0?row.projectCost/totalInternalCost*100:null}));
    return Object.freeze({currency:'EUR',materials:Object.freeze(withShares),internalRows:Object.freeze(internalWithShares),materialLandedTotal,internalCostTotal,totalInternalCost,contingencyPercent:contingency,contingencyAmount,expectedCost,marginPercent:margin,marginAmount,priceBeforeVat,vatRate:vat,vatAmount,finalPrice,complete:errors.length===0&&finalPrice!==null,errors:Object.freeze([...new Set(errors)])});
  }

  global.LumaResultCostCalculator=Object.freeze({VAT_RATES,calculate,normalizeVatRate});
})(window);
