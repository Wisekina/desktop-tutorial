import { t, locale, translateError } from './i18n.js?v=ja-22';
import { ornamentLayout } from './ornaments.js';
import { welcomeEntrance } from './welcome.js?v=ja-22';
import { setupMusic } from './music.js?v=ja-22';
import { postcardEntrance } from './postcard-motion.js?v=ja-22';
import { staticPreview } from './runtime.js?v=ja-22';
import { requestApi } from './connection.js?v=ja-22';
const $ = id => document.getElementById(id);
welcomeEntrance();
setupMusic({ button:$('music-toggle'),label:$('music-label'),t });
const previewEnabled = new URL(location.href).searchParams.get('preview') === '1';
const resultDialog = $('draw-postcard-dialog');
const entrance = postcardEntrance(resultDialog, document.querySelector('.scene'));
let postcardPresented = false;
$('close-draw-postcard').addEventListener('click', () => resultDialog.close());
$('open-draw-postcard').addEventListener('click', () => { entrance.cancel(); resultDialog.showModal(); });
let storedToken;
try { storedToken = localStorage.getItem('neseli-token'); } catch {}
let status, token = location.hash.startsWith('#k=') ? location.hash.slice(3) : storedToken;
if (token) { try { localStorage.setItem('neseli-token', token); } catch {} }
let ownResult, ownResultCount, ownResultDeadline, ownResultLastChecked = 0, offset = 0, lastCount = -1;
const api = async (path, body) => {
  try { return await requestApi(path,body); }
  catch (error) { throw new Error(translateError(error.message)); }
};
const formatDate = value => new Intl.DateTimeFormat(locale(), { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
function drawOrnaments(count) {
  if (count === lastCount) return;
  const previous = lastCount;
  lastCount = count;
  const colors = ['#db7561', '#e5be64', '#bca4c7', '#e9e1c5', '#9fbcad'];
  const group = $('ornaments');
  const positions = ornamentLayout(count);
  group.replaceChildren();
  positions.forEach(({x,y,r}, i) => {
    const item = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    item.classList.add('ornament');
    if (previous < 0 || i < previous) item.classList.add('ornament-settled');
    for (const [tag, attrs] of [['path', { d: `M${x} ${y-r-4}v4`, stroke: '#d5b477', 'stroke-width': Math.min(1,r/3) }], ['circle', { cx: x, cy: y, r, fill: colors[i % colors.length] }], ['circle', { cx: x-r*.28, cy: y-r*.28, r:r*.23, fill: '#ffffff66' }]]) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      item.append(element);
    }
    group.append(item);
  });
}
function countdown() {
  if (!status?.deadline) return;
  const seconds = Math.max(0, Math.floor((Date.parse(status.deadline) - Date.now() - offset) / 1000));
  $('countdown').textContent = seconds ? t(seconds>=86400 ? 'daysLeft' : seconds>=3600 ? 'hoursLeft' : seconds>=60 ? 'minutesLeft' : 'secondsLeft', { d:Math.floor(seconds / 86400), h:Math.floor(seconds / 3600) % 24, m:Math.floor(seconds / 60) % 60, s:seconds % 60 }) : t('closedCountdown');
  $('join').disabled = !seconds;
}
async function refresh() {
  if (staticPreview) {
    $('preview-banner').hidden = false;
    $('preview-banner').textContent = t('previewBanner');
    $('message').textContent = t('previewMessage');
    $('budget').textContent = t('unsetBudget');
    $('deadline').textContent = t('unsetDeadline');
    $('people-count').textContent = '—';
    $('name').disabled = true;
    $('join').disabled = true;
    return;
  }
  status = await api('status'); offset = status.serverTime - Date.now();
  $('budget').textContent = status.budget ? new Intl.NumberFormat(locale()).format(status.budget) + ' TL' : t('unsetBudget');
  $('deadline').textContent = status.deadline ? formatDate(status.deadline) : t('unsetDeadline');
  $('people-count').textContent = status.count;
  $('return-reminder').textContent = status.deadline ? t('returnReminderDate', { date:formatDate(status.deadline) }) : t('returnReminder');
  drawOrnaments(status.count); countdown();
  if (!status.deadline && !token) $('message').textContent = t('notConfigured');
  if (status.deadline && !token) $('message').textContent = Date.parse(status.deadline) <= status.serverTime ? t('closed') : '';
  if (token) await loadPersonal();
}
async function loadPersonal() {
  // Reopening a test draw revokes the old result while keeping personal access.
  if (ownResult && ((!status.drawn && ownResult.recipient) || ownResultDeadline !== status.deadline)) {
    ownResult = null; entrance.cancel(); postcardPresented = false;
    $('recipient').textContent = ''; $('gift').hidden = true; $('reveal').hidden = true;
  }
  if (!ownResult || (ownResultCount !== undefined && status.count < ownResultCount) || Date.now()-ownResultLastChecked >= 60000 || (status.drawn && !ownResult.recipient)) {
    try { ownResult = await api('result', { token }); ownResultCount = status.count; ownResultDeadline = status.deadline; ownResultLastChecked = Date.now(); }
    catch (error) {
      if (error.message !== translateError('Kişisel bağlantı geçersiz.')) throw error;
      try { if (localStorage.getItem('neseli-token') === token) localStorage.removeItem('neseli-token'); } catch {}
      token = undefined; ownResult = null; ownResultCount = undefined;
      entrance.cancel(); postcardPresented = false; $('open-draw-postcard').hidden = true;
      $('recipient').textContent = '';
      history.replaceState(null,'',location.pathname+location.search);
      $('success').hidden = true; $('registration').hidden = false; $('gift').hidden = true; $('reveal').hidden = true;
      $('message').textContent = t('registrationRemoved');
      return;
    }
  }
  ownResultCount = status.count;
  $('registration').hidden = true; $('success').hidden = false;
  $('welcome').textContent = t('welcome', { name:ownResult.name });
  const personalUrl = new URL('./', location.href); personalUrl.hash = 'k=' + token;
  $('personal-link').value = personalUrl.href;
  $('result-message').textContent = status.drawn ? t('arrived') : status.deadline && status.serverTime >= Date.parse(status.deadline) ? t('tooFew') : status.deadline ? t('waitingDate', { date:formatDate(status.deadline) }) : t('waiting');
  $('reveal').hidden = !ownResult.recipient || !$('gift').hidden;
  $('open-draw-postcard').hidden = !ownResult.recipient;
  if (ownResult.recipient && !postcardPresented) {
    postcardPresented = true;
    entrance.play();
  }
}
$('register-form').addEventListener('submit', async event => {
  event.preventDefault(); $('join').disabled = true; $('message').textContent = '';
  try {
    const data = await api('register', { name: $('name').value }); token = data.token;
    // The token stays in the fragment; it is never sent in a URL to the server.
    history.replaceState(null, '', '#k=' + token);
    try { localStorage.setItem('neseli-token', token); } catch {}
    await refresh();
  } catch (error) { $('message').textContent = error.message; countdown(); }
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('personal-link').value); $('copy').textContent = t('copied'); }
  catch { $('personal-link').select(); $('message').textContent = t('copyFallback'); }
});
$('reveal').addEventListener('click', () => { $('recipient').textContent = ownResult.recipient; $('gift').hidden = false; $('reveal').hidden = true; });
refresh().catch(error => { $('message').textContent = error.message; });
if (!staticPreview) setInterval(() => refresh().catch(() => { $('message').textContent = t('connection'); }), 10000);
setInterval(countdown, 1000);
window.addEventListener('app-language', () => refresh().catch(error => { $('message').textContent = error.message; }));

const cardPreview = $('postcard-preview-dialog');
function openCardPreview() {
  if (!previewEnabled) return;
  const card = $('reveal').cloneNode(true); card.removeAttribute('id'); card.hidden = false;
  card.setAttribute('aria-label', t('cardPreview'));
  card.addEventListener('click', () => { $('sample-card-note').textContent = t('cardPreviewNote'); });
  $('postcard-preview-content').replaceChildren(card);
  $('close-card-preview').setAttribute('aria-label', t('close'));
  cardPreview.showModal();
}
$('open-card-preview').hidden = !previewEnabled;
$('organizer-link').hidden = !previewEnabled;
$('open-card-preview').addEventListener('click', openCardPreview);
$('close-card-preview').addEventListener('click', () => cardPreview.close());

if (previewEnabled && location.hash === '#kartpostal') {
  const languageDialog = $('language-dialog');
  if (languageDialog.open) window.addEventListener('app-language', openCardPreview, { once: true });
  else openCardPreview();
}
