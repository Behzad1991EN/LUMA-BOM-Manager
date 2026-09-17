'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'captcha-service.js'), 'utf8');

test('reusable hCaptcha service keeps tokens only in memory and clears them on expiry, error, and reset', () => {
  const events = [];
  let renderOptions;
  let resetWidgetId = null;
  let removedWidgetId = null;
  const window = {LumaAuthConfig: {HCAPTCHA_SITE_KEY: 'public-site-key'}};
  vm.runInContext(SOURCE, vm.createContext({window}), {filename: 'captcha-service.js'});

  assert.equal(window.LumaCaptcha.renderCaptcha('forgot', {}, event => events.push(event)), true);
  assert.equal(window.LumaCaptcha.isReady(), false);

  window.hcaptcha = {
    render(container, options) { assert.ok(container); renderOptions = options; return 17; },
    reset(widgetId) { resetWidgetId = widgetId; },
    remove(widgetId) { removedWidgetId = widgetId; },
  };
  window.lumaHCaptchaOnload();
  assert.equal(renderOptions.sitekey, 'public-site-key');

  renderOptions.callback('temporary-token');
  assert.equal(window.LumaCaptcha.hasValidCaptcha('forgot'), true);
  assert.equal(window.LumaCaptcha.getCaptchaToken('forgot'), 'temporary-token');

  renderOptions['expired-callback']();
  assert.equal(window.LumaCaptcha.hasValidCaptcha('forgot'), false);
  assert.equal(events.at(-1), 'expired');

  renderOptions.callback('second-token');
  renderOptions['error-callback']('network-error');
  assert.equal(window.LumaCaptcha.getCaptchaToken('forgot'), '');
  assert.equal(events.at(-1), 'error');

  renderOptions.callback('third-token');
  window.LumaCaptcha.resetCaptcha('forgot');
  assert.equal(resetWidgetId, 17);
  assert.equal(window.LumaCaptcha.getCaptchaToken('forgot'), '');

  window.LumaCaptcha.destroyCaptcha('forgot');
  assert.equal(removedWidgetId, 17);
  assert.doesNotMatch(SOURCE, /localStorage|sessionStorage|siteverify|console\.log/);
});
