import { t, locale, translateError } from './i18n.js?v=organizer-8';
import { ornamentLayout } from './ornaments.js';
import { staticPreview } from './runtime.js';
const $ = id => document.getElementById(id);
const previewEnabled = new URL(location.href).searchParams.get('preview') === '1';
let storedToken;
try { storedToken = localStorage.getItem('neseli-token'); } catch {}
let status, token = location.hash.startsWith('#k=') ? location.hash.slice(3) : storedToken;
if (token) { try { localStorage.setItem('neseli-token', token); } catch {} }
let ownResult, offset = 0, lastCount = -1;
const api = async (path, body) => {
  const response = await fetch('/api/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(translateError(data.error || t('generic')));
  return data;
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
  $('countdown').textContent = seconds ? t('countdown', { d:Math.floor(seconds / 86400), h:Math.floor(seconds / 3600) % 24, m:Math.floor(seconds / 60) % 60, s:seconds % 60 }) : t('closedCountdown');
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
  ownResult = await api('result', { token });
  $('registration').hidden = true; $('success').hidden = false;
  $('welcome').textContent = t('welcome', { name:ownResult.name });
  const personalUrl = new URL('./', location.href); personalUrl.hash = 'k=' + token;
  $('personal-link').value = personalUrl.href;
  $('result-message').textContent = status.drawn ? t('arrived') : status.deadline && status.serverTime >= Date.parse(status.deadline) ? t('tooFew') : status.deadline ? t('waitingDate', { date:formatDate(status.deadline) }) : t('waiting');
  $('reveal').hidden = !ownResult.recipient || !$('gift').hidden;
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
