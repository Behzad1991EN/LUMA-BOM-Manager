'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

test('profile service updates only the allowed profile fields for the signed-in user', async () => {
  const source = fs.readFileSync(path.join(ROOT, 'profile-service.js'), 'utf8');
  let updatePayload;
  let filteredUserId;
  const returned = {id: 'user-1', role: 'user', full_name: 'Updated Name'};
  const builder = {
    update(payload) { updatePayload = payload; return this; },
    eq(column, value) { assert.equal(column, 'id'); filteredUserId = value; return this; },
    select() { return this; },
    async single() { return {data: returned, error: null}; },
  };
  const window = {
    LumaAuth: {getSession: () => ({user: {id: 'user-1'}})},
    LumaSupabase: {getClient: () => ({from(table) { assert.equal(table, 'profiles'); return builder; }})},
  };
  vm.runInContext(source, vm.createContext({window}), {filename: 'profile-service.js'});

  const result = await window.LumaProfileService.updateCurrentProfile({
    full_name: ' Updated Name ',
    job_title: '',
    company: 'KSI',
    phone: '123',
    role: 'admin',
    id: 'another-user',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(updatePayload)), {
    full_name: 'Updated Name',
    job_title: null,
    company: 'KSI',
    phone: '123',
  });
  assert.equal(filteredUserId, 'user-1');
  assert.equal(result, returned);
});

test('profile migration combines own-row RLS, column grants, and immutable security fields', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '20260829001400_extend_user_profiles.sql'), 'utf8');
  assert.match(sql, /using\s*\(\(select auth\.uid\(\)\) = id\)/i);
  assert.match(sql, /with check\s*\(\(select auth\.uid\(\)\) = id\)/i);
  assert.match(sql, /grant update \(full_name, job_title, company, phone\)/i);
  assert.match(sql, /new\.role is distinct from old\.role/i);
  assert.match(sql, /new\.id is distinct from old\.id/i);
  assert.doesNotMatch(sql, /grant update \([^)]*role/i);
});

test('password changes use CAPTCHA-protected recovery links and no direct signed-in password update', () => {
  const source = fs.readFileSync(path.join(ROOT, 'auth.js'), 'utf8');
  assert.match(source, /event === 'PASSWORD_RECOVERY'/);
  assert.match(source, /auth\.verifyOtp\(\{token_hash: tokenHash, type: 'recovery'\}\)/);
  assert.match(source, /resetPasswordForEmail\([^]*captchaToken:/);
  assert.match(source, /const credentials = \{email:[^\n]*options: \{captchaToken: captchaToken\}\}/);
  assert.match(source, /signInWithPassword\(credentials\)/);
  assert.equal((source.match(/resetPasswordForEmail\(/g) || []).length, 2);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /auth\.signOut\(\{scope: 'global'\}\)/);
  assert.doesNotMatch(source, /current_password|currentPassword|changeNewPassword|changeConfirmPassword/);
  assert.equal((source.match(/auth\.updateUser\(\{password:/g) || []).length, 2);
  assert.match(source, /GENERIC_RESET_CONFIRMATION/);
  assert.doesNotMatch(source, /console\.error\([^\n]*password/i);
});

test('invitation, recovery, and signed-in change flows show the requested warning below their fields', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const warningLines = [
    'Do Not Use KSI account password',
    'Use at least 8 characters',
    'Use numbers + upper and Lower case letters',
  ];
  for (const line of warningLines) assert.equal(html.split(line).length - 1, 3);
  for (const [formId, finalFieldId, submitId] of [
    ['accountSetupForm', 'confirmPassword', 'setPasswordBtn'],
    ['recoveryPasswordForm', 'recoveryConfirmPassword', 'recoveryPasswordSubmitBtn'],
    ['changePasswordForm', 'changePasswordCaptcha', 'changePasswordSubmitBtn'],
  ]) {
    const formStart = html.indexOf(`id="${formId}"`);
    const formEnd = html.indexOf('</form>', formStart);
    const form = html.slice(formStart, formEnd);
    const fieldPosition = form.indexOf(`id="${finalFieldId}"`);
    const warningPosition = form.indexOf('class="password-security-notice"');
    const submitPosition = form.indexOf(`id="${submitId}"`);
    assert.ok(fieldPosition > -1 && fieldPosition < warningPosition);
    assert.ok(warningPosition < submitPosition);
  }
  assert.equal((html.match(/data-password-rule="length"/g) || []).length, 2);
  assert.equal((html.match(/data-password-rule="uppercase"/g) || []).length, 2);
  assert.equal((html.match(/data-password-rule="lowercase"/g) || []).length, 2);
  assert.equal((html.match(/data-password-rule="digit"/g) || []).length, 2);
  assert.doesNotMatch(html, /id="currentPassword"/);
});

test('browser auth configuration contains the public hCaptcha site key and no privileged secret', () => {
  const config = fs.readFileSync(path.join(ROOT, 'auth-config.js'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'supabase-client.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.doesNotMatch(config, /service_role|database password/i);
  assert.doesNotMatch(config, /HCAPTCHA_SECRET\s*=/i);
  assert.doesNotMatch(client, /service_role|secret key|database password/i);
  assert.match(config, /HCAPTCHA_SITE_KEY\s*=\s*'a4c844ec-e33e-4268-bedc-5934b7be9360'/);
  assert.equal((html.match(/https:\/\/js\.hcaptcha\.com\/1\/api\.js/g) || []).length, 1);
  assert.match(html, /captcha-service\.js/);
  assert.doesNotMatch(html, /turnstile|challenges\.cloudflare/i);
  assert.match(client, /sb_publishable_/);
});

test('password-reset redirects follow the current static deployment origin and path', () => {
  const source = fs.readFileSync(path.join(ROOT, 'auth-config.js'), 'utf8');
  for (const [location, expected] of [
    [{origin: 'http://localhost:5500', pathname: '/'}, 'http://localhost:5500/'],
    [{origin: 'http://127.0.0.1:5500', pathname: '/'}, 'http://127.0.0.1:5500/'],
    [{origin: 'https://behzad1991en.github.io', pathname: '/LUMA-BOM-Manager-Staging/'}, 'https://behzad1991en.github.io/LUMA-BOM-Manager-Staging/'],
    [{origin: 'https://behzad1991en.github.io', pathname: '/LUMA-BOM-Manager/'}, 'https://behzad1991en.github.io/LUMA-BOM-Manager/'],
  ]) {
    const window = {location};
    vm.runInContext(source, vm.createContext({window}), {filename: 'auth-config.js'});
    assert.equal(window.LumaAuthConfig.getPasswordResetRedirectUrl(), expected);
  }
});

test('local Supabase auth config mirrors the password policy, resend limit, redirects, and scanner-safe templates', () => {
  const config = fs.readFileSync(path.join(ROOT, 'supabase', 'config.toml'), 'utf8');
  const recoveryTemplate = fs.readFileSync(path.join(ROOT, 'supabase', 'templates', 'recovery.html'), 'utf8');
  assert.match(config, /minimum_password_length\s*=\s*8/);
  assert.match(config, /password_requirements\s*=\s*"lower_upper_letters_digits"/);
  assert.match(config, /max_frequency\s*=\s*"60s"/);
  assert.match(config, /LUMA-BOM-Manager-Staging\//);
  assert.match(config, /auth\.email\.notification\.password_changed/);
  assert.match(recoveryTemplate, /recovery_action=confirm/);
  assert.match(recoveryTemplate, /token_hash=\{\{ \.TokenHash \}\}/);
  assert.doesNotMatch(recoveryTemplate, /\.ConfirmationURL/);
});

test('signed-in profile menu is at the top of the left column without a Sidebar title', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const accountPosition = html.indexOf('class="sidebar-account-section"');
  const workspacePosition = html.indexOf('class="sidebar-section"');
  const headerStart = html.indexOf('class="app-header"');
  const headerEnd = html.indexOf('</header>', headerStart);
  assert.ok(accountPosition > -1 && accountPosition < workspacePosition);
  assert.doesNotMatch(html, />\s*Sidebar\s*</i);
  assert.doesNotMatch(html.slice(headerStart, headerEnd), /id="accountMenuBtn"/);
});
