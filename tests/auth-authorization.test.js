'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const AUTH_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');

function createElement() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    hidden: false,
    disabled: false,
    textContent: '',
    title: '',
    value: '',
    className: '',
    addEventListener(type, listener) { listeners.set(type, listener); },
    async dispatch(type, event = {}) { return listeners.get(type)?.({preventDefault() {}, target: this, ...event}); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name); },
    contains(target) { return target === this; },
    focus() {},
  };
}

async function startAuth({
  session = null,
  role = 'user',
  roleError = null,
  linkType = '',
  locationSearch = '',
  verificationSession = null,
  captchaConfigured = false,
  captchaTokens = {},
} = {}) {
  const ids = [
    'authRoot', 'authLoading', 'authLoginHeading', 'loginForm', 'loginEmail',
    'loginPassword', 'loginCaptcha', 'loginSubmitBtn', 'forgotPasswordBtn', 'loginStatus',
    'accountSetupForm', 'accountSetupEmail', 'newPassword', 'confirmPassword', 'setPasswordBtn',
    'accountSetupStatus', 'forgotPasswordForm', 'forgotPasswordEmail', 'forgotCaptcha',
    'forgotPasswordSubmitBtn', 'forgotPasswordBackBtn', 'forgotPasswordStatus',
    'recoveryConfirmationPanel', 'recoveryConfirmationContinueBtn', 'recoveryConfirmationBackBtn',
    'recoveryConfirmationStatus',
    'recoveryPasswordForm', 'recoveryPasswordEmail', 'recoveryNewPassword',
    'recoveryConfirmPassword', 'recoveryPasswordSubmitBtn', 'recoveryPasswordStatus',
    'invalidRecoveryPanel', 'invalidRecoveryMessage', 'invalidRecoveryRequestBtn',
    'invalidRecoveryBackBtn', 'appShell', 'authenticatedUserName', 'authenticatedUserEmail',
    'accountMenuBtn', 'accountMenu', 'myProfileBtn', 'changePasswordBtn', 'logoutBtn',
    'accountModalBackdrop', 'accountModalTitle', 'accountModalCloseBtn', 'profileForm',
    'profileFullName', 'profileJobTitle', 'profileCompany', 'profilePhone', 'profileEmail',
    'profileRole', 'profileStatus', 'profileSaveBtn', 'profileChangePasswordBtn',
    'changePasswordForm', 'changePasswordEmail', 'changePasswordCaptcha', 'changePasswordStatus',
    'changePasswordCancelBtn', 'changePasswordSubmitBtn',
  ];
  const elements = Object.fromEntries(ids.map(id => [id, createElement()]));
  elements.loginForm.hidden = true;
  elements.accountSetupForm.hidden = true;
  elements.forgotPasswordForm.hidden = true;
  elements.recoveryConfirmationPanel.hidden = true;
  elements.recoveryPasswordForm.hidden = true;
  elements.invalidRecoveryPanel.hidden = true;
  elements.appShell.hidden = true;
  elements.accountMenu.hidden = true;
  elements.accountModalBackdrop.hidden = true;

  let onAuthStateChange = null;
  let roleReads = 0;
  let verifyOtpCalls = 0;
  const updateUserCalls = [];
  const resetPasswordCalls = [];
  const signOutCalls = [];
  const appCalls = {init: 0, refreshAuthorization: 0};
  const client = {
    auth: {
      onAuthStateChange(callback) { onAuthStateChange = callback; },
      async getSession() { return {data: {session}, error: null}; },
      async getUser() { return {data: {user: session?.user || null}, error: null}; },
      async updateUser(payload) {
        updateUserCalls.push(payload);
        return {data: {user: session?.user || authenticatedSession('updated-user').user}, error: null};
      },
      async resetPasswordForEmail(email, options) {
        resetPasswordCalls.push({email, options});
        return {data: {}, error: null};
      },
      async verifyOtp(payload) {
        verifyOtpCalls += 1;
        assert.equal(payload.type, 'recovery');
        return verificationSession
          ? {data: {session: verificationSession}, error: null}
          : {data: {session: null}, error: new Error('invalid token')};
      },
      async signOut(options) { signOutCalls.push(options); return {error: null}; },
    },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select(columns) { assert.equal(columns, 'role'); return this; },
        eq(column, value) {
          assert.equal(column, 'id');
          assert.equal(value, session.user.id);
          return this;
        },
        async single() {
          roleReads += 1;
          return roleError ? {data: null, error: roleError} : {data: {role}, error: null};
        },
      };
    },
  };
  const storage = new Map();
  let domReady;
  const document = {
    body: {dataset: {}},
    title: 'LUMA BOM Manager',
    getElementById(id) { return elements[id]; },
    addEventListener(type, listener) { if (type === 'DOMContentLoaded') domReady = listener; },
  };
  const window = {
    document,
    location: {
      search: locationSearch || (linkType ? `?type=${linkType}` : ''),
      hash: '',
      href: 'http://127.0.0.1:5500/',
      origin: 'http://127.0.0.1:5500',
      pathname: '/',
    },
    history: {replaceState() {}},
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); },
    },
    LumaSupabase: {
      isConfigured: () => true,
      getClient: () => client,
    },
    LumaAuthConfig: {
      PASSWORD_MIN_LENGTH: 8,
      HCAPTCHA_SITE_KEY: captchaConfigured ? 'public-test-site-key' : '',
      isCaptchaConfigured: () => captchaConfigured,
      getPasswordResetRedirectUrl: () => 'http://127.0.0.1:5500/',
    },
    LumaCaptcha: {
      isConfigured: () => captchaConfigured,
      hasValidCaptcha: kind => Boolean(captchaTokens[kind]),
      getCaptchaToken: kind => captchaTokens[kind] || '',
      renderCaptcha() { return captchaConfigured; },
      resetCaptcha() {},
    },
    LumaApp: {
      init() { appCalls.init += 1; },
      refreshAuthorization() { appCalls.refreshAuthorization += 1; },
    },
    setTimeout(callback, delay) { if (delay <= 1000) callback(); return 0; },
  };
  const context = vm.createContext({
    window,
    document,
    URL,
    URLSearchParams,
    requestAnimationFrame: callback => callback(),
    setTimeout: window.setTimeout,
    console: {error() {}},
  });

  vm.runInContext(AUTH_SOURCE, context, {filename: 'auth.js'});
  await domReady();

  return {
    window,
    elements,
    appCalls,
    updateUserCalls,
    resetPasswordCalls,
    signOutCalls,
    getRoleReads: () => roleReads,
    getVerifyOtpCalls: () => verifyOtpCalls,
    getAuthCallback: () => onAuthStateChange,
  };
}

function authenticatedSession(id = 'user-id') {
  return {user: {id, email: `${id}@example.com`}};
}

test('unauthenticated visitors see only the login screen', async () => {
  const result = await startAuth();
  assert.equal(result.elements.authRoot.hidden, false);
  assert.equal(result.elements.loginForm.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.window.LumaAuth.getRole(), null);
  assert.equal(result.appCalls.init, 0);
});

test('a restored user session loads least-privileged application access', async () => {
  const result = await startAuth({session: authenticatedSession(), role: 'user'});
  assert.equal(result.elements.appShell.hidden, false);
  assert.equal(result.window.LumaAuth.getRole(), 'user');
  assert.equal(result.window.LumaAuth.isAdmin(), false);
  assert.equal(result.appCalls.init, 1);
});

test('a restored admin session is recognized from the profiles result', async () => {
  const result = await startAuth({session: authenticatedSession('admin-id'), role: 'admin'});
  assert.equal(result.elements.appShell.hidden, false);
  assert.equal(result.window.LumaAuth.getRole(), 'admin');
  assert.equal(result.window.LumaAuth.isAdmin(), true);
});

test('invalid or failed role results never grant admin access', async () => {
  const invalid = await startAuth({session: authenticatedSession(), role: 'owner'});
  assert.equal(invalid.window.LumaAuth.getRole(), 'user');
  assert.equal(invalid.window.LumaAuth.isAdmin(), false);

  const failed = await startAuth({session: authenticatedSession(), roleError: new Error('lookup failed')});
  assert.equal(failed.window.LumaAuth.getRole(), 'user');
  assert.equal(failed.window.LumaAuth.isAdmin(), false);
  assert.equal(failed.elements.appShell.hidden, false);
});

test('logout clears runtime role and returns to login', async () => {
  const result = await startAuth({session: authenticatedSession('admin-id'), role: 'admin'});
  await result.elements.logoutBtn.dispatch('click');
  assert.equal(result.window.LumaAuth.getRole(), null);
  assert.equal(result.window.LumaAuth.isAdmin(), false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.elements.loginForm.hidden, false);
  assert.equal(result.appCalls.refreshAuthorization > 0, true);
});

test('token refresh for the current user does not hide or reauthorize the application', async () => {
  const session = authenticatedSession('stable-user');
  const result = await startAuth({session, role: 'admin'});
  const callback = result.getAuthCallback();
  callback('TOKEN_REFRESHED', {...session, access_token: 'refreshed-token'});
  await Promise.resolve();
  assert.equal(result.elements.appShell.hidden, false);
  assert.equal(result.elements.authRoot.hidden, true);
  assert.equal(result.appCalls.init, 1);
  assert.equal(result.appCalls.refreshAuthorization, 0);
  assert.equal(result.getRoleReads(), 1);
  assert.equal(result.window.LumaAuth.getSession().access_token, 'refreshed-token');
});

test('a valid recovery session shows only the set-new-password screen', async () => {
  const result = await startAuth();
  result.getAuthCallback()('PASSWORD_RECOVERY', authenticatedSession());
  assert.equal(result.elements.recoveryPasswordForm.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.window.LumaAuth.getRole(), null);
  assert.equal(result.appCalls.init, 0);
});

test('a verified invitation event preserves the existing Complete Your Account flow', async () => {
  const result = await startAuth({locationSearch: '?type=invite&code=valid-exchange-code'});
  const invitationSession = authenticatedSession('invited-user');
  result.getAuthCallback()('SIGNED_IN', invitationSession);
  assert.equal(result.elements.accountSetupForm.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.window.LumaAuth.getSession().user.id, 'invited-user');
});

test('an invitation session already restored during initialization still requires account setup', async () => {
  const invitationSession = authenticatedSession('restored-invited-user');
  const result = await startAuth({
    session: invitationSession,
    locationSearch: '?type=invite&code=valid-exchange-code',
  });
  assert.equal(result.elements.accountSetupForm.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.window.LumaAuth.getRole(), null);
});

test('invited-user password submission updates the password and opens the application', async () => {
  const invitationSession = authenticatedSession('invited-password-user');
  const result = await startAuth({locationSearch: '?type=invite&code=valid-exchange-code'});
  result.getAuthCallback()('SIGNED_IN', invitationSession);
  result.elements.newPassword.value = 'UniqueLuma1';
  result.elements.confirmPassword.value = 'UniqueLuma1';
  await result.elements.accountSetupForm.dispatch('submit');
  assert.deepEqual(JSON.parse(JSON.stringify(result.updateUserCalls)), [{password: 'UniqueLuma1'}]);
  assert.equal(result.elements.appShell.hidden, false);
  assert.equal(result.window.LumaAuth.getRole(), 'user');
});

test('an arbitrary recovery query cannot unlock the set-new-password screen', async () => {
  const result = await startAuth({
    session: authenticatedSession(),
    locationSearch: '?type=recovery&code=not-a-valid-supabase-exchange',
  });
  assert.equal(result.elements.recoveryPasswordForm.hidden, true);
  assert.equal(result.elements.invalidRecoveryPanel.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
});

test('scanner-safe recovery email link pauses at explicit confirmation before Supabase verification', async () => {
  const recoverySession = authenticatedSession('recovery-user');
  const result = await startAuth({
    session: authenticatedSession(),
    locationSearch: '?recovery_action=confirm&token_hash=secure-recovery-token-123456&type=recovery',
    verificationSession: recoverySession,
  });
  assert.equal(result.elements.recoveryConfirmationPanel.hidden, false);
  assert.equal(result.elements.recoveryPasswordForm.hidden, true);
  assert.equal(result.elements.appShell.hidden, true);
  assert.equal(result.getVerifyOtpCalls(), 0);

  await result.elements.recoveryConfirmationContinueBtn.dispatch('click');
  assert.equal(result.getVerifyOtpCalls(), 1);
  assert.equal(result.elements.recoveryConfirmationPanel.hidden, true);
  assert.equal(result.elements.recoveryPasswordForm.hidden, false);
  assert.equal(result.window.LumaAuth.getSession().user.id, 'recovery-user');
});

test('verified password recovery updates the password, signs out globally, and returns to login', async () => {
  const recoverySession = authenticatedSession('recovery-password-user');
  const result = await startAuth({session: recoverySession, captchaConfigured: true});
  result.getAuthCallback()('PASSWORD_RECOVERY', recoverySession);
  result.elements.recoveryNewPassword.value = 'RecoveredLuma1';
  result.elements.recoveryConfirmPassword.value = 'RecoveredLuma1';
  await result.elements.recoveryPasswordForm.dispatch('submit');
  assert.deepEqual(JSON.parse(JSON.stringify(result.updateUserCalls)), [{password: 'RecoveredLuma1'}]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.signOutCalls)), [{scope: 'global'}]);
  assert.equal(result.elements.loginForm.hidden, false);
  assert.equal(result.elements.appShell.hidden, true);
  assert.match(result.elements.loginStatus.textContent, /changed successfully/i);
});

test('signed-in Change Password sends a CAPTCHA-protected link only to the authenticated email', async () => {
  const session = authenticatedSession('change-password-user');
  const result = await startAuth({
    session,
    captchaConfigured: true,
    captchaTokens: {change: 'verified-captcha-token'},
  });
  await result.elements.changePasswordBtn.dispatch('click');
  await Promise.resolve();
  await result.elements.changePasswordForm.dispatch('submit');
  assert.deepEqual(JSON.parse(JSON.stringify(result.resetPasswordCalls)), [{
    email: 'change-password-user@example.com',
    options: {
      redirectTo: 'http://127.0.0.1:5500/',
      captchaToken: 'verified-captcha-token',
    },
  }]);
  assert.match(result.elements.changePasswordStatus.textContent, /link sent/i);
});

test('forgot password is separate from the normal login screen', async () => {
  const result = await startAuth();
  await result.elements.forgotPasswordBtn.dispatch('click');
  assert.equal(result.elements.forgotPasswordForm.hidden, false);
  assert.equal(result.elements.loginForm.hidden, true);
  assert.equal(result.elements.forgotPasswordSubmitBtn.disabled, true);
  assert.match(result.elements.forgotPasswordStatus.textContent, /not configured/i);
});

test('new passwords require length, uppercase, lowercase, and a digit', async () => {
  const result = await startAuth();
  assert.equal(result.window.LumaAuth.validatePassword('Password').valid, false);
  assert.equal(result.window.LumaAuth.validatePassword('password1').valid, false);
  assert.equal(result.window.LumaAuth.validatePassword('PASSWORD1').valid, false);
  assert.equal(result.window.LumaAuth.validatePassword('Password1').valid, true);
});
