'use strict';

(function initializeCaptchaService(global) {
  const widgets = new Map();
  let sdkReady = Boolean(global.hcaptcha?.render);

  function isConfigured() {
    return Boolean(global.LumaAuthConfig?.HCAPTCHA_SITE_KEY?.trim());
  }

  function notify(entry, status) {
    try { entry?.onStateChange?.(status); } catch {}
  }

  function renderRegisteredWidget(entry) {
    if (!entry || entry.widgetId !== null || !sdkReady || !global.hcaptcha?.render) return;
    try {
      entry.widgetId = global.hcaptcha.render(entry.container, {
        sitekey: global.LumaAuthConfig.HCAPTCHA_SITE_KEY,
        theme: 'light',
        callback(token) {
          entry.token = String(token || '');
          notify(entry, entry.token ? 'verified' : 'error');
        },
        'expired-callback'() {
          entry.token = '';
          if (entry.widgetId !== null && global.hcaptcha?.reset) {
            try { global.hcaptcha.reset(entry.widgetId); } catch {}
          }
          notify(entry, 'expired');
        },
        'error-callback'() {
          entry.token = '';
          notify(entry, 'error');
        },
      });
      notify(entry, 'rendered');
    } catch {
      entry.token = '';
      notify(entry, 'error');
    }
  }

  function handleSdkReady() {
    sdkReady = Boolean(global.hcaptcha?.render);
    if (!sdkReady) return;
    widgets.forEach(renderRegisteredWidget);
  }

  function initializeCaptcha() {
    if (global.hcaptcha?.render) handleSdkReady();
    return sdkReady;
  }

  function renderCaptcha(key, container, onStateChange) {
    if (!isConfigured() || !key || !container) return false;
    const existing = widgets.get(key);
    if (existing) {
      existing.onStateChange = onStateChange;
      existing.container = container;
      renderRegisteredWidget(existing);
      return true;
    }
    const entry = {container, onStateChange, widgetId: null, token: ''};
    widgets.set(key, entry);
    initializeCaptcha();
    renderRegisteredWidget(entry);
    return true;
  }

  function getCaptchaToken(key) {
    return widgets.get(key)?.token || '';
  }

  function hasValidCaptcha(key) {
    return Boolean(getCaptchaToken(key));
  }

  function resetCaptcha(key) {
    const entry = widgets.get(key);
    if (!entry) return;
    entry.token = '';
    if (entry.widgetId !== null && global.hcaptcha?.reset) {
      try { global.hcaptcha.reset(entry.widgetId); } catch {}
    }
    notify(entry, 'reset');
  }

  function destroyCaptcha(key) {
    const entry = widgets.get(key);
    if (!entry) return;
    entry.token = '';
    if (entry.widgetId !== null && global.hcaptcha?.remove) {
      try { global.hcaptcha.remove(entry.widgetId); } catch {}
    }
    widgets.delete(key);
  }

  function handleSdkError() {
    sdkReady = false;
    widgets.forEach(entry => {
      entry.token = '';
      notify(entry, 'error');
    });
  }

  global.lumaHCaptchaOnload = handleSdkReady;
  global.lumaHCaptchaScriptError = handleSdkError;
  global.LumaCaptcha = Object.freeze({
    initializeCaptcha,
    renderCaptcha,
    getCaptchaToken,
    hasValidCaptcha,
    resetCaptcha,
    destroyCaptcha,
    isConfigured,
    isReady: () => sdkReady,
  });
})(window);
