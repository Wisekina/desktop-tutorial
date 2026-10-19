import { t, translateError } from './i18n.js?v=reopen-14';
import { staticPreview } from './runtime.js?v=reopen-14';
import { requestApi, usesSupabase, loginOrganizer, logoutOrganizer } from './connection.js?v=reopen-14';
import { registrationUrl } from './qr-url.js';
import { toDataURL } from './vendor/qrcode.js';
import { participantWorkbook } from './excel.js';
const $ = id => document.getElementById(id);
let organizerKey = null;
let organizerLoggedIn = false;
let participantData = null;
let qrReady = false;
let settingsClosed = false;
let savedDeadline, serverOffset = 0;
$('supabase-login-fields').hidden = !usesSupabase;
$('node-login-fields').hidden = usesSupabase;
$('admin-email').required = usesSupabase;
$('admin-password').required = usesSupabase;
$('key').required = !usesSupabase;
function fillSettings(data) {
  savedDeadline = data.deadline; serverOffset = data.serverTime - Date.now();
  if (data.deadline) $('deadline').value = new Intl.DateTimeFormat('sv-SE', { timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false }).format(new Date(data.deadline)).replace(' ','T');
  if (data.budget) $('budget').value = data.budget;
  settingsClosed = !!data.drawn || (!!data.deadline && Date.parse(data.deadline) <= data.serverTime);
  renderSettingsState();
}
function renderSettingsState() {
  $('settings').querySelector('button[type=submit]').textContent = t(settingsClosed ? 'reopenDraw' : 'adminSave');
  $('reopen-note').hidden = !settingsClosed;
}
$('admin-login').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  $('login-message').textContent = '';
  try {
    const data = await loginOrganizer({ email:$('admin-email').value,password:$('admin-password').value,key:$('key').value });
    organizerKey = usesSupabase ? null : $('key').value;
    $('key').value = ''; $('admin-password').value = '';
    fillSettings(data); $('admin-login').hidden = true; $('admin-controls').hidden = false; organizerLoggedIn = true;
    await loadParticipants();
  } catch (error) { $('login-message').textContent = translateError(error.message); }
  finally { button.disabled = false; }
});
$('admin-logout').addEventListener('click', () => {
  organizerLoggedIn = false; participantData = null; $('participants-list').replaceChildren();
  logoutOrganizer(); organizerKey = null; $('admin-controls').hidden = true; $('admin-login').hidden = false;
  $('message').textContent = ''; $('login-message').textContent = '';
});
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  // The deadline may pass while the organizer keeps this screen open.
  if (savedDeadline && Date.parse(savedDeadline) <= Date.now()+serverOffset) settingsClosed = true;
  renderSettingsState();
  if (settingsClosed && !window.confirm(t('confirmReopen'))) return;
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const reopening = settingsClosed;
  try {
    const data = await requestApi(reopening ? 'admin/reopen' : 'settings', { key:organizerKey,deadline:$('deadline').value+':00+03:00',budget:Number($('budget').value) });
    if (!organizerLoggedIn) return;
    fillSettings(data); $('message').textContent = t(reopening ? 'drawReopened' : 'settingsSaved');
    await loadParticipants();
  } catch (error) { $('message').textContent = error.message.includes('gift_reopen') ? t('reopenSetupMissing') : translateError(error.message); }
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
  renderSettingsState();
  $('qr-image').alt = t('qrAlt'); $('qr-message').textContent = qrReady ? t('qrReady') : $('qr-url').value ? '' : t('qrNeedsUrl');
  if (participantData) renderParticipants(participantData);
  previewExplanation();
});
previewExplanation();

function renderParticipants(data) {
  participantData = data;
  $('export-participants').disabled = !data.participants.length;
  $('participants-count').textContent = t('participantsCount',{count:data.participants.length});
  $('participants-lock').hidden = data.canDelete;
  $('participants-list').replaceChildren();
  for (const person of data.participants) {
    const row = document.createElement('tr');
    const details = document.createElement('td');
    const dateCell = document.createElement('td');
    const actionCell = document.createElement('td');
    const name = document.createElement('strong'); name.textContent = person.name; details.append(name);
    if (person.created_at) {
      const time = document.createElement('small');
      time.textContent = new Intl.DateTimeFormat(document.documentElement.lang === 'ja' ? 'ja-JP' : 'tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'}).format(new Date(person.created_at));
      dateCell.append(time);
    }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'delete-participant';
    button.textContent = t('deleteParticipant'); button.disabled = !data.canDelete;
    button.addEventListener('click',async () => {
      if (!window.confirm(t('confirmDelete',{name:person.name}))) return;
      button.disabled = true; $('participants-message').textContent = '';
      try {
        const updated = await requestApi('admin/delete',{id:person.id,key:organizerKey});
        if (!organizerLoggedIn) return;
        renderParticipants(updated); $('participants-message').textContent = t('participantDeleted');
      } catch (error) {
        $('participants-message').textContent = translateError(error.message);
        await loadParticipants();
      }
    });
    actionCell.append(button);
    row.append(details,dateCell,actionCell); $('participants-list').append(row);
  }
  if (!data.participants.length) {
    const empty = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 3; cell.textContent = t('participantsEmpty'); empty.append(cell); $('participants-list').append(empty);
  }
}
async function loadParticipants() {
  $('participants-message').textContent = '';
  const button = $('refresh-participants'); button.disabled = true;
  try {
    const data = await requestApi('admin/participants',{key:organizerKey});
    if (organizerLoggedIn) renderParticipants(data);
  } catch (error) {
    if (organizerLoggedIn) $('participants-message').textContent = error.message.includes('gift_admin_participants') ? t('participantsSetupMissing') : translateError(error.message);
  } finally { button.disabled = false; }
}
$('refresh-participants').addEventListener('click',loadParticipants);

$('export-participants').addEventListener('click', async () => {
  const button = $('export-participants'); button.disabled = true; $('participants-message').textContent='';
  try {
    const data = await requestApi('admin/participants',{key:organizerKey});
    if (!organizerLoggedIn) return;
    renderParticipants(data);
    const bytes = participantWorkbook(data.participants,{nameHeader:t('excelName'),dateHeader:t('excelDate'),sheetName:t('excelSheet'),locale:document.documentElement.lang==='ja'?'ja-JP':'tr-TR'});
    const blob = new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href=url; link.download='TOYOTA-katilimcilar-'+new Date().toISOString().slice(0,10)+'.xlsx';
    document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  } catch(error) { $('participants-message').textContent=translateError(error.message); }
  finally { button.disabled=!participantData?.participants.length; }
});
