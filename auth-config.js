'use strict';

(function initializeAuthConfiguration(global) {
  // This is the browser-safe public hCaptcha site key. The hCaptcha secret
  // belongs only in Supabase Dashboard -> Auth -> Bot and Abuse Protection.
  const HCAPTCHA_SITE_KEY = 'a4c844ec-e33e-4268-bedc-5934b7be9360';
  const PASSWORD_MIN_LENGTH = 8;
  const STATIC_DEPLOYMENT_URLS = Object.freeze([
    'http://localhost:5500/',
    'http://127.0.0.1:5500/',
    'https://behzad1991en.github.io/LUMA-BOM-Manager-Staging/',
    'https://behzad1991en.github.io/LUMA-BOM-Manager/',
  ]);

  function getPasswordResetRedirectUrl() {
    const origin = String(global.location.origin || '');
    const pathname = String(global.location.pathname || '/');
    const currentLocation = `${origin}${pathname}`;
    const knownDeployment = STATIC_DEPLOYMENT_URLS.find(url => currentLocation === url || currentLocation === `${url}index.html`);
    if (knownDeployment) return knownDeployment;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return `${origin}/`;
    const directoryPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return `${origin}${directoryPath}`;
  }

  global.LumaAuthConfig = Object.freeze({
    HCAPTCHA_SITE_KEY,
    PASSWORD_MIN_LENGTH,
    STATIC_DEPLOYMENT_URLS,
    isCaptchaConfigured: () => Boolean(HCAPTCHA_SITE_KEY.trim()),
    getPasswordResetRedirectUrl,
  });
})(window);
