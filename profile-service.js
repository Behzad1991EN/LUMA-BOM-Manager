'use strict';

(function initializeProfileService(global) {
  const PROFILE_COLUMNS = 'id, role, full_name, job_title, company, phone, created_at, updated_at';
  const EDITABLE_FIELDS = Object.freeze(['full_name', 'job_title', 'company', 'phone']);

  function getClient() {
    return global.LumaSupabase.getClient();
  }

  function getAuthenticatedUserId() {
    const userId = global.LumaAuth?.getSession?.()?.user?.id;
    if (!userId) throw new Error('You must be signed in to manage your profile.');
    return userId;
  }

  function cleanText(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  async function getCurrentProfile() {
    const userId = getAuthenticatedUserId();
    const { data, error } = await getClient()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async function updateCurrentProfile(values = {}) {
    const userId = getAuthenticatedUserId();
    const payload = {};
    EDITABLE_FIELDS.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(values, field)) payload[field] = cleanText(values[field]);
    });

    const { data, error } = await getClient()
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  }

  global.LumaProfileService = Object.freeze({
    getCurrentProfile,
    updateCurrentProfile,
  });
})(window);
