import { t, translateError } from './i18n.js?v=toyota-4';
import { staticPreview } from './runtime.js';
const form = document.getElementById('settings');
if (!staticPreview) fetch('/api/status').then(r => r.json()).then(data => {
  if (data.deadline) {
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(data.deadline));
    document.getElementById('deadline').value = parts.replace(' ', 'T');
  }
  if (data.budget) document.getElementById('budget').value = data.budget;
}).catch(() => { document.getElementById('message').textContent = t('connection'); });
form.addEventListener('submit', async event => {
  event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
  try {
    const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: document.getElementById('key').value, deadline: document.getElementById('deadline').value + ':00+03:00', budget: Number(document.getElementById('budget').value) }) });
    const result = await response.json(); if (!response.ok) throw new Error(translateError(result.error));
    document.getElementById('message').textContent = t('settingsSaved'); document.getElementById('key').value = '';
  } catch (error) { document.getElementById('message').textContent = error.message; }
  finally { button.disabled = false; }
});

const qrForm = document.getElementById('qr-form');
const qrUrl = document.getElementById('qr-url');
const qrMessage = document.getElementById('qr-message');
const qrImage = document.getElementById('qr-image');
let qrReady = false;
if (location.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) qrUrl.value = location.origin + '/';
else qrMessage.textContent = t('qrNeedsUrl');
qrForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = qrForm.querySelector('button'); button.disabled = true;
  document.getElementById('qr-card').hidden = true; qrReady = false; qrMessage.textContent = '';
  try {
    const query = new URLSearchParams({ url: qrUrl.value.trim() });
    const response = await fetch('/api/qr?' + query);
    if (!response.ok) { const error = await response.json(); throw new Error(translateError(error.error)); }
    // Browser loads the same-origin PNG; no third-party QR service receives the URL.
    await new Promise((resolve, reject) => { qrImage.onload = resolve; qrImage.onerror = () => reject(new Error(t('connection'))); qrImage.src = '/api/qr?' + query; });
    document.getElementById('qr-destination').textContent = new URL(qrUrl.value.trim()).origin + '/';
    document.getElementById('qr-download').href = '/api/qr?' + query + '&download=1';
    qrImage.alt = t('qrAlt');
    document.getElementById('qr-card').hidden = false; qrReady = true; qrMessage.textContent = t('qrReady');
  } catch (error) { qrMessage.textContent = error.message; }
  finally { button.disabled = false; }
});
window.addEventListener('app-language', () => { qrImage.alt = t('qrAlt'); qrMessage.textContent = qrReady ? t('qrReady') : qrUrl.value ? '' : t('qrNeedsUrl'); });
if (staticPreview) {
  for (const control of document.querySelectorAll('form input,form button')) control.disabled = true;
  const explainPreview = () => {
    document.getElementById('message').textContent = t('previewBanner');
    qrMessage.textContent = t('previewBanner');
  };
  explainPreview(); window.addEventListener('app-language', explainPreview);
}
