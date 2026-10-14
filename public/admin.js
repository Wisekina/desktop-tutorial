import { t, translateError } from './i18n.js?v=live-10';
import { staticPreview } from './runtime.js?v=live-10';
import { requestApi, usesSupabase, loginOrganizer, logoutOrganizer } from './connection.js?v=live-10';
import { registrationUrl } from './qr-url.js';
import { toDataURL } from './vendor/qrcode.js';
const $ = id => document.getElementById(id);
let organizerKey = null;
let qrReady = false;
$('supabase-login-fields').hidden = !usesSupabase;
$('node-login-fields').hidden = usesSupabase;
$('admin-email').required = usesSupabase;
$('admin-password').required = usesSupabase;
$('key').required = !usesSupabase;
function fillSettings(data) {
  if (data.deadline) $('deadline').value = new Intl.DateTimeFormat('sv-SE', { timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false }).format(new Date(data.deadline)).replace(' ','T');
  if (data.budget) $('budget').value = data.budget;
  const closed = !!data.drawn || (!!data.deadline && Date.parse(data.deadline) <= data.serverTime);
  for (const field of $('settings').querySelectorAll('input,button')) field.disabled = closed;
}
$('admin-login').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  $('login-message').textContent = '';
  try {
    const data = await loginOrganizer({ email:$('admin-email').value,password:$('admin-password').value,key:$('key').value });
    organizerKey = usesSupabase ? null : $('key').value;
    $('key').value = ''; $('admin-password').value = '';
    fillSettings(data); $('admin-login').hidden = true; $('admin-controls').hidden = false;
  } catch (error) { $('login-message').textContent = translateError(error.message); }
  finally { button.disabled = false; }
});
$('admin-logout').addEventListener('click', () => {
  logoutOrganizer(); organizerKey = null; $('admin-controls').hidden = true; $('admin-login').hidden = false;
  $('message').textContent = ''; $('login-message').textContent = '';
});
$('settings').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try {
    const data = await requestApi('settings', { key:organizerKey,deadline:$('deadline').value+':00+03:00',budget:Number($('budget').value) });
    fillSettings(data); $('message').textContent = t('settingsSaved');
  } catch (error) { $('message').textContent = translateError(error.message); }
  finally { button.disabled = false; }
});
const rootUrl = new URL('./', location.href);
if (location.protocol === 'https:' && !['localhost','127.0.0.1','[::1]'].includes(location.hostname)) $('qr-url').value = rootUrl.href;
else $('qr-message').textContent = t('qrNeedsUrl');
$('qr-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  $('qr-card').hidden = true; qrReady = false; $('qr-message').textContent = '';
  try {
    const url = registrationUrl($('qr-url').value.trim());
    const png = await toDataURL(url, { width:720,margin:4,errorCorrectionLevel:'H',color:{dark:'#173b2d',light:'#ffffff'} });
    $('qr-image').src = png; $('qr-image').alt = t('qrAlt'); $('qr-destination').textContent = url;
    $('qr-download').href = png; $('qr-card').hidden = false; qrReady = true; $('qr-message').textContent = t('qrReady');
  } catch (error) { $('qr-message').textContent = translateError(error.message); }
  finally { button.disabled = false; }
});
function previewExplanation() {
  if (!staticPreview) return;
  $('login-message').textContent = t('backendMissing');
  for (const control of $('admin-login').querySelectorAll('input,button')) control.disabled = true;
}
window.addEventListener('app-language', () => {
  $('qr-image').alt = t('qrAlt'); $('qr-message').textContent = qrReady ? t('qrReady') : $('qr-url').value ? '' : t('qrNeedsUrl');
  previewExplanation();
});
previewExplanation();
