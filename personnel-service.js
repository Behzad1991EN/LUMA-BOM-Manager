'use strict';

(function initializePersonnelService(global) {
  const DEFAULTS=Object.freeze({currency:'EUR',engineering_monthly_cost:7824.85,test_commissioning_monthly_cost:14455.92,project_management_monthly_cost:9823.90,admin_management_monthly_cost:38970});
  let cache={status:'idle',settings:{...DEFAULTS},error:null,promise:null};

  class PersonnelServiceError extends Error {constructor(code,message){super(message);this.name='PersonnelServiceError';this.code=code;}}
  const getClient=()=>global.LumaSupabase.getClient();
  const isAdmin=()=>global.LumaAuth?.isAdmin?.()===true;
  function normalizeSettings(value){const source=value&&typeof value==='object'?value:{};const settings={currency:'EUR'};for(const section of global.LumaPersonnelCostCalculator.SECTIONS){const parsed=Number(source[section.key]);settings[section.key]=Number.isFinite(parsed)?parsed:DEFAULTS[section.key];}return settings;}
  function validateSettings(value){const settings=normalizeSettings(value);for(const section of global.LumaPersonnelCostCalculator.SECTIONS)if(settings[section.key]<0)throw new PersonnelServiceError('invalid_value',`${section.label} monthly cost must be zero or greater.`);return settings;}
  function mapError(operation,error){if(error instanceof PersonnelServiceError)return error;console.error(`Personnel settings ${operation} failed.`,{code:error?.code||'unknown'});if(error?.code==='42501'||error?.code==='PGRST301')return new PersonnelServiceError('forbidden','You do not have permission to change Personnel costs.');if(error?.code==='23514'||error?.code==='22P02')return new PersonnelServiceError('invalid_value','One or more Personnel monthly costs are invalid.');return new PersonnelServiceError('unavailable','Personnel costs are unavailable. Please try again.');}
  function snapshot(){return {status:cache.status,settings:{...cache.settings},error:cache.error};}
  function invalidate(){cache={status:'idle',settings:{...DEFAULTS},error:null,promise:null};}
  async function loadSettings({force=false}={}){if(cache.status==='loading'&&cache.promise)return cache.promise;if(!force&&cache.status==='ready')return {...cache.settings};cache.status='loading';cache.error=null;cache.promise=getClient().from('commercial_settings').select('setting_value').eq('area','personnel').eq('setting_key','defaults').eq('active',true).maybeSingle().then(({data,error})=>{if(error)throw error;if(!data?.setting_value)throw new PersonnelServiceError('missing','Personnel costs have not been configured.');cache={status:'ready',settings:validateSettings(data.setting_value),error:null,promise:null};return {...cache.settings};}).catch(error=>{cache.status='error';cache.error=mapError('load',error);cache.promise=null;throw cache.error;});return cache.promise;}
  async function saveSettings(values){if(!isAdmin())throw new PersonnelServiceError('forbidden','You do not have permission to change Personnel costs.');const settings=validateSettings(values);try{const {data,error}=await getClient().from('commercial_settings').upsert({area:'personnel',setting_key:'defaults',setting_value:settings,active:true},{onConflict:'area,setting_key'}).select('setting_value').single();if(error)throw error;cache={status:'ready',settings:validateSettings(data?.setting_value||settings),error:null,promise:null};global.LumaApp?.refreshPersonnel?.();return {...cache.settings};}catch(error){throw mapError('save',error);}}
  global.LumaPersonnelService=Object.freeze({DEFAULTS,PersonnelServiceError,normalizeSettings,validateSettings,snapshot,invalidate,loadSettings,saveSettings});
})(window);
