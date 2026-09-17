'use strict';

(function initializeSupabaseClient(global) {
  const SUPABASE_URL = 'https://wtalhryjefvvhrywejqm.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xOKlqCfKjKZoF4ZtNVwytQ_iuJZcKm4';

  let client = null;

  function isConfigured() {
    return /^https:\/\/[a-z0-9]+\.supabase\.co$/i.test(SUPABASE_URL)
      && /^sb_publishable_[A-Za-z0-9_-]+$/.test(SUPABASE_PUBLISHABLE_KEY);
  }

  function getClient() {
    if (!isConfigured()) {
      throw new Error('Supabase authentication is not configured.');
    }
    if (!global.supabase?.createClient) {
      throw new Error('The Supabase browser client could not be loaded.');
    }
    if (!client) {
      client = global.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    }
    return client;
  }

  global.LumaSupabase = Object.freeze({
    getClient,
    isConfigured,
  });
})(window);
