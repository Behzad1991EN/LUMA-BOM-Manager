'use strict';

(function initializePersonnelCostCalculator(global) {
  const CURRENCY = 'EUR';
  const MONTHS_PER_YEAR = 12;
  const DEFAULT_YEARLY_TARGET_MW = 150;
  const SECTIONS = Object.freeze([
    Object.freeze({key:'engineering_monthly_cost', label:'Engineering'}),
    Object.freeze({key:'test_commissioning_monthly_cost', label:'Test/Commissioning'}),
    Object.freeze({key:'project_management_monthly_cost', label:'Project Management'}),
    Object.freeze({key:'admin_management_monthly_cost', label:'Admin Management'}),
  ]);

  function number(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function calculate({settings, settingsStatus='ready', yearlyTargetMw=DEFAULT_YEARLY_TARGET_MW, projectCapacityMwp}={}) {
    const target = number(yearlyTargetMw), projectCapacity = number(projectCapacityMwp), errors=[];
    if (settingsStatus !== 'ready') errors.push(settingsStatus === 'idle' || settingsStatus === 'loading' ? 'Personnel configuration is loading.' : 'Personnel configuration is unavailable.');
    if (target === null || target <= 0) errors.push('Yearly Target must be greater than zero.');
    if (projectCapacity === null) errors.push('Current Project Capacity is unavailable.');
    const rows = SECTIONS.map(section => {
      const monthlyCost=number(settings?.[section.key]);
      if(monthlyCost===null)errors.push(`${section.label} monthly cost must be zero or greater.`);
      const yearlyCost=monthlyCost===null?null:monthlyCost*MONTHS_PER_YEAR;
      const costPerMw=yearlyCost===null||target===null||target<=0?null:yearlyCost/target;
      return Object.freeze({...section,monthlyCost,yearlyCost,costPerMw});
    });
    const totalMonthly=rows.every(row=>row.monthlyCost!==null)?rows.reduce((sum,row)=>sum+row.monthlyCost,0):null;
    const totalYearly=rows.every(row=>row.yearlyCost!==null)?rows.reduce((sum,row)=>sum+row.yearlyCost,0):null;
    const totalPerMw=totalYearly===null||target===null||target<=0?null:totalYearly/target;
    const projectPersonnelCost=totalPerMw===null||projectCapacity===null?null:totalPerMw*projectCapacity;
    return Object.freeze({currency:CURRENCY,monthsPerYear:MONTHS_PER_YEAR,yearlyTargetMw:target,projectCapacityMwp:projectCapacity,rows:Object.freeze(rows),totalMonthly,totalYearly,totalPerMw,projectPersonnelCost,complete:errors.length===0,errors:Object.freeze([...new Set(errors)])});
  }

  global.LumaPersonnelCostCalculator=Object.freeze({CURRENCY,MONTHS_PER_YEAR,DEFAULT_YEARLY_TARGET_MW,SECTIONS,calculate});
})(window);
