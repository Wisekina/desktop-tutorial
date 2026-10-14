import { t, locale, translateError } from './i18n.js';
const $ = id => document.getElementById(id);
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
  // All participants have one ornament. Golden-angle placement fills the tree evenly.
  for (let i = Math.max(0, previous); i < count; i++) {
    const fraction = ((i * .61803398875) % 1);
    const y = 184 + ((i * .38196601125) % 1) * 278;
    const width = (y - 100) * .37;
    const x = 250 + (fraction * 2 - 1) * width;
    const size = count > 120 ? 4 : 8;
    const item = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    item.classList.add('ornament');
    if (previous < 0) item.style.animation = 'none';
    for (const [tag, attrs] of [['path', { d: `M${x} ${y-15}v8`, stroke: '#d5b477', 'stroke-width': 1 }], ['circle', { cx: x, cy: y, r: size, fill: colors[i % colors.length] }], ['circle', { cx: x-2, cy: y-2, r: 2, fill: '#ffffff66' }]]) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      item.append(element);
    }
    group.append(item);
  }
}
function countdown() {
  if (!status?.deadline) return;
  const seconds = Math.max(0, Math.floor((Date.parse(status.deadline) - Date.now() - offset) / 1000));
  $('countdown').textContent = seconds ? t('countdown', { d:Math.floor(seconds / 86400), h:Math.floor(seconds / 3600) % 24, m:Math.floor(seconds / 60) % 60, s:seconds % 60 }) : t('closedCountdown');
  $('join').disabled = !seconds;
}
async function refresh() {
  status = await api('status'); offset = status.serverTime - Date.now();
  $('budget').textContent = status.budget ? new Intl.NumberFormat(locale()).format(status.budget) + ' TL' : t('unsetBudget');
  $('deadline').textContent = status.deadline ? formatDate(status.deadline) : t('unsetDeadline');
  $('people-count').textContent = status.count;
  drawOrnaments(status.count); countdown();
  if (!status.deadline && !token) $('message').textContent = t('notConfigured');
  if (status.deadline && !token) $('message').textContent = Date.parse(status.deadline) <= status.serverTime ? t('closed') : '';
  if (token) await loadPersonal();
}
async function loadPersonal() {
  ownResult = await api('result', { token });
  $('registration').hidden = true; $('success').hidden = false;
  $('welcome').textContent = t('welcome', { name:ownResult.name });
  $('personal-link').value = location.origin + '/#k=' + token;
  $('result-message').textContent = t(status.drawn ? 'arrived' : status.deadline && status.serverTime >= Date.parse(status.deadline) ? 'tooFew' : 'waiting');
  $('reveal').hidden = !ownResult.recipient || !$('gift').hidden;
}
$('register-form').addEventListener('submit', async event => {
  event.preventDefault(); $('join').disabled = true; $('message').textContent = '';
  try {
    const data = await api('register', { name: $('name').value }); token = data.token;
    // The token stays in the fragment; it is never sent in a URL to the server.
    history.replaceState(null, '', '/#k=' + token);
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
setInterval(() => refresh().catch(() => { $('message').textContent = t('connection'); }), 10000);
setInterval(countdown, 1000);
window.addEventListener('app-language', () => refresh().catch(error => { $('message').textContent = error.message; }));
