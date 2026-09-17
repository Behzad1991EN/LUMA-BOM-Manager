'use strict';

(function initializeAuthentication(global) {
  const USER_ROLES = Object.freeze({USER: 'user', ADMIN: 'admin'});
  const VALID_ROLES = new Set(Object.values(USER_ROLES));
  const config = global.LumaAuthConfig || Object.freeze({
    PASSWORD_MIN_LENGTH: 8,
    HCAPTCHA_SITE_KEY: '',
    isCaptchaConfigured: () => false,
    getPasswordResetRedirectUrl: () => `${global.location.origin}${global.location.pathname}`,
  });
  const MIN_PASSWORD_LENGTH = config.PASSWORD_MIN_LENGTH || 8;
  const ACCOUNT_SETUP_STORAGE_KEY = 'luma_auth_account_setup_user_id';
  const RECOVERY_STORAGE_KEY = 'luma_auth_password_recovery_user_id';
  const EMAIL_REQUEST_COOLDOWN_MS = 60 * 1000;
  const GENERIC_RESET_CONFIRMATION = 'If an account exists for this email, a password reset link has been sent.';
  const state = {
    session: null,
    role: null,
    profile: null,
    appInitialized: false,
    invitationLinkDetected: false,
    recoveryLinkDetected: false,
    invitationVerifiedUserId: '',
    recoveryVerifiedUserId: '',
    recoveryConfirmationTokenHash: '',
    recoveryVerificationPending: false,
    invalidRecoveryConfirmation: false,
    pendingSignOutMessage: '',
    authorizationRequestId: 0,
    authorizingUserId: null,
    loginBusy: false,
    forgotBusy: false,
    changeBusy: false,
    forgotCooldownUntil: 0,
    changeCooldownUntil: 0,
  };

  function getElements() {
    const ids = [
      'authRoot', 'authLoading', 'authLoginHeading', 'loginForm', 'loginEmail', 'loginPassword',
      'loginCaptcha', 'loginSubmitBtn', 'forgotPasswordBtn', 'loginStatus', 'accountSetupForm',
      'accountSetupEmail', 'newPassword', 'confirmPassword', 'setPasswordBtn', 'accountSetupStatus',
      'forgotPasswordForm', 'forgotPasswordEmail', 'forgotCaptcha', 'forgotPasswordSubmitBtn',
      'forgotPasswordBackBtn', 'forgotPasswordStatus', 'recoveryConfirmationPanel',
      'recoveryConfirmationContinueBtn', 'recoveryConfirmationBackBtn', 'recoveryConfirmationStatus',
      'recoveryPasswordForm', 'recoveryPasswordEmail',
      'recoveryNewPassword', 'recoveryConfirmPassword', 'recoveryPasswordSubmitBtn',
      'recoveryPasswordStatus', 'invalidRecoveryPanel', 'invalidRecoveryMessage',
      'invalidRecoveryRequestBtn', 'invalidRecoveryBackBtn', 'appShell', 'authenticatedUserName',
      'authenticatedUserEmail', 'accountMenuBtn', 'accountMenu', 'myProfileBtn', 'changePasswordBtn',
      'logoutBtn', 'accountModalBackdrop', 'accountModalTitle', 'accountModalCloseBtn', 'profileForm',
      'profileFullName', 'profileJobTitle', 'profileCompany', 'profilePhone', 'profileEmail',
      'profileRole', 'profileStatus', 'profileSaveBtn', 'profileChangePasswordBtn', 'changePasswordForm',
      'changePasswordEmail', 'changePasswordCaptcha', 'changePasswordStatus', 'changePasswordCancelBtn',
      'changePasswordSubmitBtn',
    ];
    return Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  }

  function storageRemove(key) { try { global.localStorage.removeItem(key); } catch {} }

  function getAuthLinkParameters() {
    const search = new URLSearchParams(global.location.search);
    const hash = new URLSearchParams(global.location.hash.replace(/^#/, ''));
    return {
      type: search.get('type') || hash.get('type') || '',
      hasAuthCredential: Boolean(search.get('code') || hash.get('code') || search.get('token_hash') || hash.get('token_hash') || hash.get('access_token')),
      recoveryAction: search.get('recovery_action') || '',
      recoveryTokenHash: search.get('token_hash') || '',
      hasError: Boolean(search.get('error') || hash.get('error') || search.get('error_description') || hash.get('error_description')),
    };
  }

  function validateRecoveryTokenHash(value) {
    const tokenHash = String(value || '');
    return /^[A-Za-z0-9._~-]{20,512}$/.test(tokenHash) ? tokenHash : '';
  }

  function detectAuthLink() {
    const parameters = getAuthLinkParameters();
    state.invitationLinkDetected = parameters.recoveryAction !== 'confirm' && parameters.type === 'invite' && parameters.hasAuthCredential;
    state.recoveryLinkDetected = parameters.recoveryAction !== 'confirm' && parameters.type === 'recovery' && parameters.hasAuthCredential;
    state.recoveryConfirmationTokenHash = parameters.recoveryAction === 'confirm' && parameters.type === 'recovery'
      ? validateRecoveryTokenHash(parameters.recoveryTokenHash)
      : '';
    state.invalidRecoveryConfirmation = parameters.recoveryAction === 'confirm' && !state.recoveryConfirmationTokenHash;
    storageRemove(ACCOUNT_SETUP_STORAGE_KEY);
    storageRemove(RECOVERY_STORAGE_KEY);
    return parameters;
  }

  function requiresAccountSetup(session) {
    if (!session?.user || state.recoveryLinkDetected) return false;
    return state.invitationVerifiedUserId === session.user.id;
  }

  function requiresPasswordRecovery(session) {
    if (!session?.user) return false;
    return state.recoveryVerifiedUserId === session.user.id;
  }

  function markAccountSetupRequired(session) { state.invitationVerifiedUserId = session?.user?.id || ''; }
  function markRecoveryRequired(session) { state.recoveryVerifiedUserId = session?.user?.id || ''; }
  function clearAccountSetupRequirement() { state.invitationLinkDetected = false; state.invitationVerifiedUserId = ''; storageRemove(ACCOUNT_SETUP_STORAGE_KEY); }
  function clearRecoveryRequirement() { state.recoveryLinkDetected = false; state.recoveryVerifiedUserId = ''; storageRemove(RECOVERY_STORAGE_KEY); }

  function clearAuthParametersFromUrl() {
    const url = new URL(global.location.href);
    ['type', 'code', 'token_hash', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'error', 'error_code', 'error_description', 'recovery_action', 'confirmation_url'].forEach(key => url.searchParams.delete(key));
    url.hash = '';
    global.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }

  function normalizeDatabaseRole(role) {
    const databaseRole = String(role || '').toLowerCase();
    return VALID_ROLES.has(databaseRole) ? databaseRole : USER_ROLES.USER;
  }

  function setRuntimeRole(role) {
    state.role = role === null ? null : normalizeDatabaseRole(role);
    document.body.dataset.authRole = state.role || '';
  }

  function logSafeError(context, error) {
    console.error(context, {name: String(error?.name || 'Error'), code: String(error?.code || ''), status: Number(error?.status || 0) || undefined});
  }

  async function loadCurrentUserRole(session) {
    const {data, error} = await global.LumaSupabase.getClient().from('profiles').select('role').eq('id', session.user.id).single();
    if (error) throw error;
    return normalizeDatabaseRole(data?.role);
  }

  function setStatus(element, message = '', kind = 'error') {
    element.textContent = message;
    element.className = `login-status ${kind}`;
    element.hidden = !message;
  }

  function hideAuthPanels() {
    const elements = getElements();
    ['loginForm', 'accountSetupForm', 'forgotPasswordForm', 'recoveryConfirmationPanel', 'recoveryPasswordForm', 'invalidRecoveryPanel'].forEach(id => { elements[id].hidden = true; });
  }

  function updateLoginSubmitAvailability() {
    getElements().loginSubmitBtn.disabled = state.loginBusy || !config.isCaptchaConfigured() || !global.LumaCaptcha?.hasValidCaptcha('login');
  }

  function updateForgotSubmitAvailability() {
    getElements().forgotPasswordSubmitBtn.disabled = state.forgotBusy || Date.now() < state.forgotCooldownUntil || !config.isCaptchaConfigured() || !global.LumaCaptcha?.hasValidCaptcha('forgot');
  }

  function updateChangeSubmitAvailability() {
    getElements().changePasswordSubmitBtn.disabled = state.changeBusy || Date.now() < state.changeCooldownUntil || !config.isCaptchaConfigured() || !global.LumaCaptcha?.hasValidCaptcha('change');
  }

  function setLoginBusy(isBusy) {
    const {loginEmail, loginPassword, loginSubmitBtn} = getElements();
    state.loginBusy = isBusy;
    loginEmail.disabled = isBusy;
    loginPassword.disabled = isBusy;
    loginSubmitBtn.textContent = isBusy ? 'Signing In...' : 'Sign In';
    updateLoginSubmitAvailability();
  }

  function setForgotBusy(isBusy) {
    const {forgotPasswordEmail, forgotPasswordSubmitBtn} = getElements();
    state.forgotBusy = isBusy;
    forgotPasswordEmail.disabled = isBusy;
    forgotPasswordSubmitBtn.textContent = isBusy ? 'Sending...' : 'Send Reset Link';
    updateForgotSubmitAvailability();
  }

  function setChangeBusy(isBusy) {
    const {changePasswordSubmitBtn} = getElements();
    state.changeBusy = isBusy;
    changePasswordSubmitBtn.textContent = isBusy ? 'Sending...' : 'Send Password Change Link';
    updateChangeSubmitAvailability();
  }

  function beginEmailRequestCooldown(kind) {
    state[`${kind}CooldownUntil`] = Date.now() + EMAIL_REQUEST_COOLDOWN_MS;
    if (kind === 'forgot') updateForgotSubmitAvailability();
    else updateChangeSubmitAvailability();
    global.setTimeout(() => {
      state[`${kind}CooldownUntil`] = 0;
      if (kind === 'forgot') updateForgotSubmitAvailability();
      else updateChangeSubmitAvailability();
    }, EMAIL_REQUEST_COOLDOWN_MS);
  }

  function setPasswordFormBusy(prefix, isBusy) {
    const elements = getElements();
    const map = prefix === 'recovery'
      ? ['recoveryNewPassword', 'recoveryConfirmPassword', 'recoveryPasswordSubmitBtn', 'Setting Password...', 'Set New Password']
      : ['newPassword', 'confirmPassword', 'setPasswordBtn', 'Setting Password...', 'Set Password'];
    elements[map[0]].disabled = isBusy;
    elements[map[1]].disabled = isBusy;
    elements[map[2]].disabled = isBusy;
    elements[map[2]].textContent = isBusy ? map[3] : map[4];
  }

  function resetCaptcha(kind) {
    global.LumaCaptcha?.resetCaptcha(kind);
    if (kind === 'login') updateLoginSubmitAvailability();
    else if (kind === 'forgot') updateForgotSubmitAvailability();
    else updateChangeSubmitAvailability();
  }

  function captchaUi(kind) {
    const elements = getElements();
    if (kind === 'login') return {container: elements.loginCaptcha, status: elements.loginStatus};
    if (kind === 'forgot') return {container: elements.forgotCaptcha, status: elements.forgotPasswordStatus};
    return {container: elements.changePasswordCaptcha, status: elements.changePasswordStatus};
  }

  function updateCaptchaSubmitAvailability(kind) {
    if (kind === 'login') updateLoginSubmitAvailability();
    else if (kind === 'forgot') updateForgotSubmitAvailability();
    else updateChangeSubmitAvailability();
  }

  function handleCaptchaState(kind, captchaState) {
    const {status} = captchaUi(kind);
    if (captchaState === 'verified') setStatus(status, '');
    else if (captchaState === 'expired') setStatus(status, 'CAPTCHA verification expired. Please try again.');
    else if (captchaState === 'error') setStatus(status, 'CAPTCHA verification failed. Please try again.');
    updateCaptchaSubmitAvailability(kind);
  }

  function renderCaptcha(kind) {
    const {container, status} = captchaUi(kind);
    container.hidden = false;
    if (!config.isCaptchaConfigured() || !global.LumaCaptcha?.isConfigured()) {
      setStatus(status, 'CAPTCHA is not configured. Contact the application administrator.');
      updateCaptchaSubmitAvailability(kind);
      return;
    }
    global.LumaCaptcha.renderCaptcha(kind, container, captchaState => handleCaptchaState(kind, captchaState));
    updateCaptchaSubmitAvailability(kind);
  }

  function closeAccountMenu() {
    const {accountMenu, accountMenuBtn} = getElements();
    accountMenu.hidden = true;
    accountMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function closeAccountModal() {
    const {accountModalBackdrop} = getElements();
    accountModalBackdrop.hidden = true;
    resetCaptcha('change');
  }

  function resetAuthenticatedUi() {
    const {authenticatedUserEmail, authenticatedUserName} = getElements();
    state.profile = null;
    authenticatedUserEmail.textContent = '';
    authenticatedUserName.textContent = '';
    closeAccountMenu();
    closeAccountModal();
  }

  function showLogin(message = '') {
    const {authRoot, authLoading, authLoginHeading, loginForm, loginEmail, appShell, loginStatus} = getElements();
    state.authorizationRequestId += 1;
    state.authorizingUserId = null;
    state.session = null;
    global.LumaCommercialAnalysis?.reset?.();
    setRuntimeRole(null);
    resetAuthenticatedUi();
    appShell.hidden = true;
    if (state.appInitialized) global.LumaApp.refreshAuthorization();
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = false;
    hideAuthPanels();
    loginForm.hidden = false;
    resetCaptcha('login');
    resetCaptcha('forgot');
    setLoginBusy(false);
    setStatus(loginStatus, message);
    renderCaptcha('login');
    requestAnimationFrame(() => loginEmail.focus());
  }

  function showForgotPassword() {
    const {authRoot, authLoading, authLoginHeading, forgotPasswordForm, forgotPasswordEmail, forgotPasswordStatus, loginEmail, appShell} = getElements();
    state.session = null;
    setRuntimeRole(null);
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = true;
    hideAuthPanels();
    forgotPasswordForm.hidden = false;
    resetCaptcha('login');
    resetCaptcha('forgot');
    forgotPasswordEmail.value = loginEmail.value.trim();
    setStatus(forgotPasswordStatus, '');
    setForgotBusy(false);
    renderCaptcha('forgot');
    requestAnimationFrame(() => forgotPasswordEmail.focus());
  }

  function showRecoveryConfirmation() {
    const {authRoot, authLoading, authLoginHeading, recoveryConfirmationPanel, recoveryConfirmationStatus, appShell} = getElements();
    state.authorizationRequestId += 1;
    state.authorizingUserId = null;
    state.session = null;
    setRuntimeRole(null);
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = true;
    hideAuthPanels();
    recoveryConfirmationPanel.hidden = false;
    setStatus(recoveryConfirmationStatus, '');
  }

  async function continueRecoveryConfirmation() {
    const tokenHash = validateRecoveryTokenHash(state.recoveryConfirmationTokenHash);
    const {recoveryConfirmationContinueBtn, recoveryConfirmationStatus} = getElements();
    if (!tokenHash) {
      setStatus(getElements().recoveryConfirmationStatus, 'This password-change link is invalid. Request a new link.');
      return;
    }
    recoveryConfirmationContinueBtn.disabled = true;
    recoveryConfirmationContinueBtn.textContent = 'Confirming...';
    state.recoveryVerificationPending = true;
    try {
      const {data, error} = await global.LumaSupabase.getClient().auth.verifyOtp({token_hash: tokenHash, type: 'recovery'});
      if (error || !data?.session) throw error || new Error('Recovery session unavailable.');
      state.recoveryConfirmationTokenHash = '';
      state.recoveryVerificationPending = false;
      state.recoveryLinkDetected = true;
      markRecoveryRequired(data.session);
      clearAuthParametersFromUrl();
      showRecoveryPassword(data.session);
    } catch (error) {
      state.recoveryVerificationPending = false;
      logSafeError('Password recovery confirmation failed.', error);
      setStatus(recoveryConfirmationStatus, 'This password link is invalid or has expired. Request a new password link.');
    } finally {
      recoveryConfirmationContinueBtn.disabled = false;
      recoveryConfirmationContinueBtn.textContent = 'Continue Password Change';
    }
  }

  function cancelRecoveryConfirmation() {
    state.recoveryConfirmationTokenHash = '';
    state.invalidRecoveryConfirmation = false;
    clearAuthParametersFromUrl();
    showLogin();
  }

  function showAccountSetup(session) {
    const {authRoot, authLoading, authLoginHeading, accountSetupForm, accountSetupEmail, newPassword, appShell, accountSetupStatus} = getElements();
    state.session = session;
    state.authorizingUserId = null;
    setRuntimeRole(null);
    if (state.appInitialized) global.LumaApp.refreshAuthorization();
    markAccountSetupRequired(session);
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = true;
    hideAuthPanels();
    accountSetupForm.hidden = false;
    accountSetupEmail.textContent = session.user.email || 'your invited account';
    setPasswordFormBusy('invite', false);
    setStatus(accountSetupStatus, '');
    updatePasswordRequirementUi('newPassword');
    requestAnimationFrame(() => newPassword.focus());
  }

  function showRecoveryPassword(session) {
    const {authRoot, authLoading, authLoginHeading, recoveryPasswordForm, recoveryPasswordEmail, recoveryNewPassword, recoveryPasswordStatus, appShell} = getElements();
    state.session = session;
    state.authorizingUserId = null;
    setRuntimeRole(null);
    if (state.appInitialized) global.LumaApp.refreshAuthorization();
    markRecoveryRequired(session);
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = true;
    hideAuthPanels();
    recoveryPasswordForm.hidden = false;
    recoveryPasswordEmail.textContent = session.user.email || 'your account';
    setPasswordFormBusy('recovery', false);
    setStatus(recoveryPasswordStatus, '');
    updatePasswordRequirementUi('recoveryNewPassword');
    requestAnimationFrame(() => recoveryNewPassword.focus());
  }

  function showInvalidRecovery() {
    const {authRoot, authLoading, authLoginHeading, invalidRecoveryPanel, appShell} = getElements();
    state.session = null;
    setRuntimeRole(null);
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.hidden = true;
    authLoginHeading.hidden = true;
    hideAuthPanels();
    invalidRecoveryPanel.hidden = false;
  }

  function showAuthLinkLoading(message) {
    const {authRoot, authLoading, authLoginHeading, appShell} = getElements();
    appShell.hidden = true;
    authRoot.hidden = false;
    authLoading.textContent = message;
    authLoading.hidden = false;
    authLoginHeading.hidden = true;
    hideAuthPanels();
  }

  function showAuthorizationLoading(session) {
    const {authRoot, authLoading, authLoginHeading, appShell} = getElements();
    state.session = session;
    setRuntimeRole(null);
    appShell.hidden = true;
    if (state.appInitialized) global.LumaApp.refreshAuthorization();
    authRoot.hidden = false;
    authLoading.textContent = 'Loading your access...';
    authLoading.hidden = false;
    authLoginHeading.hidden = true;
    hideAuthPanels();
  }

  function updateAccountIdentity(profile = state.profile) {
    const {authenticatedUserEmail, authenticatedUserName} = getElements();
    const email = state.session?.user?.email || 'Authenticated user';
    const displayName = String(profile?.full_name || '').trim() || email;
    authenticatedUserName.textContent = displayName;
    authenticatedUserName.title = displayName;
    authenticatedUserEmail.textContent = email;
    authenticatedUserEmail.title = email;
  }

  function showAuthenticatedApp(session, role) {
    const {authRoot, authLoading, appShell} = getElements();
    state.session = session;
    setRuntimeRole(role);
    updateAccountIdentity();
    authLoading.hidden = true;
    authRoot.hidden = true;
    hideAuthPanels();
    if (!state.appInitialized) {
      global.LumaApp.init();
      state.appInitialized = true;
    } else {
      global.LumaApp.refreshAuthorization();
    }
    appShell.hidden = false;
  }

  async function routeAuthenticatedSession(session) {
    if (requiresPasswordRecovery(session)) {
      state.authorizationRequestId += 1;
      showRecoveryPassword(session);
      return;
    }
    if (requiresAccountSetup(session)) {
      state.authorizationRequestId += 1;
      showAccountSetup(session);
      return;
    }
    const userId = session?.user?.id;
    if (!userId) { showLogin(); return; }
    if (state.session?.user?.id === userId && state.role !== null && state.appInitialized) {
      state.session = session;
      updateAccountIdentity();
      return;
    }
    if (state.authorizingUserId === userId) { state.session = session; return; }
    const requestId = state.authorizationRequestId + 1;
    state.authorizationRequestId = requestId;
    state.authorizingUserId = userId;
    showAuthorizationLoading(session);
    let role = USER_ROLES.USER;
    try { role = await loadCurrentUserRole(session); }
    catch (error) { logSafeError('Unable to load the authorization role. Standard user access will be used.', error); }
    try {
      if (requestId !== state.authorizationRequestId || state.session?.user?.id !== userId) return;
      showAuthenticatedApp(session, role);
    } finally {
      if (requestId === state.authorizationRequestId && state.authorizingUserId === userId) state.authorizingUserId = null;
    }
  }

  function validatePassword(password) {
    const value = String(password || '');
    const rules = {
      length: value.length >= MIN_PASSWORD_LENGTH,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      digit: /\d/.test(value),
    };
    return {
      valid: Object.values(rules).every(Boolean),
      rules,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include an uppercase letter, a lowercase letter, and a number.`,
    };
  }

  function updatePasswordRequirementUi(inputId) {
    const input = getElements()[inputId];
    const root = document.querySelector?.(`[data-password-requirements="${inputId}"]`);
    if (!input || !root) return;
    const validation = validatePassword(input.value);
    root.querySelectorAll('[data-password-rule]').forEach(item => {
      item.classList.toggle('met', Boolean(validation.rules[item.getAttribute('data-password-rule')]));
    });
  }

  function validateNewPassword(password, confirmation) {
    if (!String(password || '').trim()) return 'Enter a new password.';
    const validation = validatePassword(password);
    if (!validation.valid) return validation.message;
    if (password !== confirmation) return 'Passwords do not match.';
    return '';
  }

  function passwordUpdateMessage(error, context) {
    const code = `${error?.code || ''} ${error?.name || ''}`.toLowerCase();
    if (code.includes('weak_password')) return validatePassword('').message;
    if (code.includes('same_password')) return 'Choose a password different from your current password.';
    if (code.includes('session_not_found') || code.includes('reauthentication_needed')) return context === 'recovery'
      ? 'This password-reset link is invalid or has expired. Request a new reset link.'
      : 'Your session is no longer valid. Sign in again and retry.';
    return 'Could not update the password. Request a new link and try again.';
  }

  function isCaptchaError(error) {
    return `${error?.code || ''} ${error?.message || ''}`.toLowerCase().includes('captcha');
  }

  async function handleLogin(event) {
    event.preventDefault();
    const {loginEmail, loginPassword, loginStatus} = getElements();
    setStatus(loginStatus, '');
    const captchaToken = global.LumaCaptcha?.getCaptchaToken('login') || '';
    if (!captchaToken) {
      setStatus(loginStatus, 'Please complete the CAPTCHA.');
      return;
    }
    setLoginBusy(true);
    try {
      const credentials = {email: loginEmail.value.trim(), password: loginPassword.value, options: {captchaToken: captchaToken}};
      const {data, error} = await global.LumaSupabase.getClient().auth.signInWithPassword(credentials);
      loginPassword.value = '';
      if (error || !data.session) {
        setStatus(loginStatus, isCaptchaError(error) ? 'CAPTCHA verification failed. Please try again.' : 'Unable to sign in. Check your email and password.');
        return;
      }
      await routeAuthenticatedSession(data.session);
    } catch (error) {
      logSafeError('Authentication sign-in failed.', error);
      setStatus(loginStatus, 'Unable to reach the authentication service. Please try again.');
    } finally {
      resetCaptcha('login');
      setLoginBusy(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const {forgotPasswordEmail, forgotPasswordStatus} = getElements();
    setStatus(forgotPasswordStatus, '');
    if (!config.isCaptchaConfigured()) {
      setStatus(forgotPasswordStatus, 'Password reset verification is not configured. Contact the application administrator.');
      return;
    }
    const captchaToken = global.LumaCaptcha?.getCaptchaToken('forgot') || '';
    if (!captchaToken) {
      setStatus(forgotPasswordStatus, 'Please complete the CAPTCHA.');
      return;
    }
    setForgotBusy(true);
    try {
      const {error} = await global.LumaSupabase.getClient().auth.resetPasswordForEmail(forgotPasswordEmail.value.trim(), {
        redirectTo: config.getPasswordResetRedirectUrl(),
        captchaToken: captchaToken,
      });
      if (error && isCaptchaError(error)) setStatus(forgotPasswordStatus, 'CAPTCHA verification failed. Please try again.');
      else {
        if (error) logSafeError('Password reset request was not accepted.', error);
        beginEmailRequestCooldown('forgot');
        setStatus(forgotPasswordStatus, GENERIC_RESET_CONFIRMATION, 'success');
      }
    } catch (error) {
      logSafeError('Password reset request failed.', error);
      setStatus(forgotPasswordStatus, GENERIC_RESET_CONFIRMATION, 'success');
    } finally {
      resetCaptcha('forgot');
      setForgotBusy(false);
    }
  }

  async function handleAccountSetup(event) {
    event.preventDefault();
    const {newPassword, confirmPassword, accountSetupStatus} = getElements();
    const validation = validateNewPassword(newPassword.value, confirmPassword.value);
    setStatus(accountSetupStatus, validation);
    if (validation) return;
    setPasswordFormBusy('invite', true);
    try {
      const {data, error} = await global.LumaSupabase.getClient().auth.updateUser({password: newPassword.value});
      if (error) throw error;
      if (data.user && state.session) state.session = {...state.session, user: data.user};
      newPassword.value = '';
      confirmPassword.value = '';
      clearAccountSetupRequirement();
      clearAuthParametersFromUrl();
      setStatus(accountSetupStatus, 'Password created successfully. Opening LUMA BOM Manager...', 'success');
      await new Promise(resolve => global.setTimeout(resolve, 700));
      await routeAuthenticatedSession(state.session);
    } catch (error) {
      logSafeError('Invited-user password setup failed.', error);
      setStatus(accountSetupStatus, passwordUpdateMessage(error, 'invite'));
    } finally { setPasswordFormBusy('invite', false); }
  }

  async function handleRecoveryPassword(event) {
    event.preventDefault();
    const {recoveryNewPassword, recoveryConfirmPassword, recoveryPasswordStatus} = getElements();
    const validation = validateNewPassword(recoveryNewPassword.value, recoveryConfirmPassword.value);
    setStatus(recoveryPasswordStatus, validation);
    if (validation) return;
    setPasswordFormBusy('recovery', true);
    let passwordUpdated = false;
    try {
      const client = global.LumaSupabase.getClient();
      const {error} = await client.auth.updateUser({password: recoveryNewPassword.value});
      if (error) throw error;
      passwordUpdated = true;
      recoveryNewPassword.value = '';
      recoveryConfirmPassword.value = '';
      clearRecoveryRequirement();
      clearAuthParametersFromUrl();
      const successMessage = 'Your password has been changed successfully. Please sign in again.';
      state.pendingSignOutMessage = successMessage;
      let {error: signOutError} = await client.auth.signOut({scope: 'global'});
      if (signOutError) {
        logSafeError('Global sign-out after password recovery failed.', signOutError);
        ({error: signOutError} = await client.auth.signOut({scope: 'local'}));
      }
      if (signOutError) throw signOutError;
      if (state.pendingSignOutMessage) {
        state.pendingSignOutMessage = '';
        showLogin(successMessage);
      }
    } catch (error) {
      logSafeError('Password recovery update failed.', error);
      state.pendingSignOutMessage = '';
      setStatus(recoveryPasswordStatus, passwordUpdated
        ? 'Your password was changed, but automatic sign-out failed. Close this browser window before signing in again.'
        : passwordUpdateMessage(error, 'recovery'));
    } finally { setPasswordFormBusy('recovery', false); }
  }

  function showProfilePanel() {
    const {accountModalTitle, profileForm, changePasswordForm} = getElements();
    accountModalTitle.textContent = 'My Profile';
    profileForm.hidden = false;
    changePasswordForm.hidden = true;
  }

  async function showChangePasswordPanel() {
    const {accountModalBackdrop, accountModalTitle, profileForm, changePasswordForm, changePasswordEmail, changePasswordStatus} = getElements();
    closeAccountMenu();
    accountModalBackdrop.hidden = false;
    accountModalTitle.textContent = 'Change Password';
    profileForm.hidden = true;
    changePasswordForm.hidden = false;
    changePasswordEmail.value = '';
    resetCaptcha('change');
    setStatus(changePasswordStatus, 'Loading your account...', 'success');
    setChangeBusy(true);
    try {
      const {data, error} = await global.LumaSupabase.getClient().auth.getUser();
      if (error || !data?.user?.email) throw error || new Error('Authenticated email unavailable.');
      changePasswordEmail.value = data.user.email;
      setStatus(changePasswordStatus, '');
      setChangeBusy(false);
      renderCaptcha('change');
    } catch (error) {
      logSafeError('Authenticated account lookup failed.', error);
      setStatus(changePasswordStatus, 'Could not verify your signed-in account. Sign in again and retry.');
      setChangeBusy(false);
    }
  }

  function populateProfileForm(profile) {
    const elements = getElements();
    elements.profileFullName.value = profile?.full_name || '';
    elements.profileJobTitle.value = profile?.job_title || '';
    elements.profileCompany.value = profile?.company || '';
    elements.profilePhone.value = profile?.phone || '';
    elements.profileEmail.value = state.session?.user?.email || '';
    elements.profileRole.value = state.role === USER_ROLES.ADMIN ? 'Administrator' : 'User';
  }

  async function openProfileModal() {
    const {accountModalBackdrop, profileStatus, profileSaveBtn} = getElements();
    closeAccountMenu();
    accountModalBackdrop.hidden = false;
    showProfilePanel();
    populateProfileForm(state.profile);
    setStatus(profileStatus, 'Loading profile...', 'success');
    profileSaveBtn.disabled = true;
    try {
      state.profile = await global.LumaProfileService.getCurrentProfile();
      populateProfileForm(state.profile);
      updateAccountIdentity(state.profile);
      setStatus(profileStatus, '');
    } catch (error) {
      logSafeError('Profile loading failed.', error);
      setStatus(profileStatus, 'Could not load your profile. Please try again.');
    } finally { profileSaveBtn.disabled = false; }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    const elements = getElements();
    setStatus(elements.profileStatus, '');
    elements.profileSaveBtn.disabled = true;
    elements.profileSaveBtn.textContent = 'Saving...';
    try {
      state.profile = await global.LumaProfileService.updateCurrentProfile({
        full_name: elements.profileFullName.value,
        job_title: elements.profileJobTitle.value,
        company: elements.profileCompany.value,
        phone: elements.profilePhone.value,
      });
      populateProfileForm(state.profile);
      updateAccountIdentity(state.profile);
      setStatus(elements.profileStatus, 'Profile saved.', 'success');
    } catch (error) {
      logSafeError('Profile update failed.', error);
      setStatus(elements.profileStatus, 'Could not save your profile. Please try again.');
    } finally {
      elements.profileSaveBtn.disabled = false;
      elements.profileSaveBtn.textContent = 'Save Profile';
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    const elements = getElements();
    setStatus(elements.changePasswordStatus, '');
    if (!config.isCaptchaConfigured()) {
      setStatus(elements.changePasswordStatus, 'Password-change verification is not configured. Contact the application administrator.');
      return;
    }
    const captchaToken = global.LumaCaptcha?.getCaptchaToken('change') || '';
    if (!captchaToken) {
      setStatus(elements.changePasswordStatus, 'Please complete the CAPTCHA.');
      return;
    }
    setChangeBusy(true);
    try {
      const client = global.LumaSupabase.getClient();
      const {data: userData, error: userError} = await client.auth.getUser();
      const authenticatedEmail = userData?.user?.email || '';
      if (userError || !authenticatedEmail || authenticatedEmail !== state.session?.user?.email) throw userError || new Error('Authenticated account mismatch.');
      const {error} = await client.auth.resetPasswordForEmail(authenticatedEmail, {
        redirectTo: config.getPasswordResetRedirectUrl(),
        captchaToken: captchaToken,
      });
      if (error) throw error;
      beginEmailRequestCooldown('change');
      setStatus(elements.changePasswordStatus, 'Password change link sent.\n\nCheck your email and open the link to continue.', 'success');
    } catch (error) {
      logSafeError('Authenticated password-change request failed.', error);
      setStatus(elements.changePasswordStatus, isCaptchaError(error) ? 'CAPTCHA verification failed. Please try again.' : 'Could not send the password-change link. Please try again later.');
    } finally {
      resetCaptcha('change');
      setChangeBusy(false);
    }
  }

  async function handleLogout() {
    const {logoutBtn} = getElements();
    closeAccountMenu();
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Signing Out...';
    try {
      const {error} = await global.LumaSupabase.getClient().auth.signOut({scope: 'local'});
      if (error) throw error;
      clearAccountSetupRequirement();
      clearRecoveryRequirement();
      showLogin();
    } catch (error) {
      logSafeError('Authentication sign-out failed.', error);
      alert('Could not sign out. Please try again.');
    } finally {
      logoutBtn.disabled = false;
      logoutBtn.textContent = 'Sign Out';
    }
  }

  function wireUiEvents() {
    const elements = getElements();
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.forgotPasswordBtn.addEventListener('click', showForgotPassword);
    elements.forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    elements.forgotPasswordBackBtn.addEventListener('click', () => showLogin());
    elements.recoveryConfirmationContinueBtn.addEventListener('click', continueRecoveryConfirmation);
    elements.recoveryConfirmationBackBtn.addEventListener('click', cancelRecoveryConfirmation);
    elements.accountSetupForm.addEventListener('submit', handleAccountSetup);
    elements.recoveryPasswordForm.addEventListener('submit', handleRecoveryPassword);
    elements.invalidRecoveryRequestBtn.addEventListener('click', showForgotPassword);
    elements.invalidRecoveryBackBtn.addEventListener('click', () => showLogin());
    elements.accountMenuBtn.addEventListener('click', () => {
      const willOpen = elements.accountMenu.hidden;
      elements.accountMenu.hidden = !willOpen;
      elements.accountMenuBtn.setAttribute('aria-expanded', String(willOpen));
    });
    elements.myProfileBtn.addEventListener('click', () => void openProfileModal());
    elements.changePasswordBtn.addEventListener('click', () => void showChangePasswordPanel());
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.accountModalCloseBtn.addEventListener('click', closeAccountModal);
    elements.accountModalBackdrop.addEventListener('click', event => { if (event.target === elements.accountModalBackdrop) closeAccountModal(); });
    elements.profileForm.addEventListener('submit', handleProfileSave);
    elements.profileChangePasswordBtn.addEventListener('click', () => void showChangePasswordPanel());
    elements.changePasswordForm.addEventListener('submit', handleChangePassword);
    elements.changePasswordCancelBtn.addEventListener('click', () => { showProfilePanel(); setStatus(elements.changePasswordStatus, ''); });
    elements.newPassword.addEventListener('input', () => updatePasswordRequirementUi('newPassword'));
    elements.recoveryNewPassword.addEventListener('input', () => updatePasswordRequirementUi('recoveryNewPassword'));
    document.addEventListener('click', event => {
      if (!elements.accountMenu.hidden && !elements.accountMenu.contains(event.target) && !elements.accountMenuBtn.contains(event.target)) closeAccountMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeAccountMenu();
        if (!elements.accountModalBackdrop.hidden) closeAccountModal();
      }
    });
  }

  async function startAuthentication() {
    const authLinkParameters = detectAuthLink();
    wireUiEvents();
    if (!global.LumaSupabase?.isConfigured()) {
      showLogin('Authentication setup is incomplete. Add the Supabase publishable key in supabase-client.js.');
      const {loginEmail, loginPassword, loginSubmitBtn} = getElements();
      loginEmail.disabled = true;
      loginPassword.disabled = true;
      loginSubmitBtn.disabled = true;
      return;
    }
    try {
      const client = global.LumaSupabase.getClient();
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          state.recoveryLinkDetected = true;
          markRecoveryRequired(session);
          showRecoveryPassword(session);
          return;
        }
        if (state.recoveryVerificationPending) return;
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && state.invitationLinkDetected) {
          markAccountSetupRequired(session);
          showAccountSetup(session);
          return;
        }
        if (state.recoveryConfirmationTokenHash) {
          showRecoveryConfirmation();
          return;
        }
        if (session) void routeAuthenticatedSession(session);
        else if (event === 'SIGNED_OUT') {
          clearAccountSetupRequirement();
          clearRecoveryRequirement();
          const message = state.pendingSignOutMessage;
          state.pendingSignOutMessage = '';
          showLogin(message);
        }
      });
      const {data, error} = await client.auth.getSession();
      if (error) throw error;
      if (state.recoveryConfirmationTokenHash) showRecoveryConfirmation();
      else if (state.invalidRecoveryConfirmation) showInvalidRecovery();
      else if (authLinkParameters.hasError && authLinkParameters.type === 'recovery') showInvalidRecovery();
      else if (data.session && state.invitationLinkDetected) {
        markAccountSetupRequired(data.session);
        showAccountSetup(data.session);
      }
      else if (data.session && (state.recoveryLinkDetected || state.invitationLinkDetected)) showInvalidRecovery();
      else if (data.session) await routeAuthenticatedSession(data.session);
      else if (state.recoveryLinkDetected) showInvalidRecovery();
      else if (state.invitationLinkDetected) showAuthLinkLoading('Confirming your invitation...');
      else {
        clearAccountSetupRequirement();
        if (authLinkParameters.hasError) clearRecoveryRequirement();
        showLogin(authLinkParameters.hasError ? 'This authentication link is invalid or has expired. Request a new link.' : '');
      }
    } catch (error) {
      logSafeError('Authentication initialization failed.', error);
      if (state.recoveryLinkDetected) showInvalidRecovery();
      else showLogin('Unable to initialize authentication. Please refresh and try again.');
    }
  }

  global.LumaAuth = Object.freeze({
    roles: USER_ROLES,
    getSession: () => state.session,
    getRole: () => state.role,
    getProfile: () => state.profile,
    isAdmin: () => state.role === USER_ROLES.ADMIN,
    openProfile: () => openProfileModal(),
    validatePassword,
  });

  document.addEventListener('DOMContentLoaded', startAuthentication);
})(window);
