export function registrationUrl(value) {
  if (typeof value !== 'string' || value.length > 1000) throw new Error('Geçerli bir yayın adresi girin.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Geçerli bir yayın adresi girin.'); }
  const host = url.hostname;
  if (url.protocol !== 'https:' || !host.includes('.') || host.endsWith('.localhost') || host.startsWith('127.') || host === '0.0.0.0' || host === '[::1]') throw new Error('Telefonlardan açılabilen bir HTTPS yayın adresi girin.');
  if (url.username || url.password || url.hash || url.search || !url.pathname.endsWith('/')) throw new Error('Kişisel sonuç bağlantısı yerine uygulamanın ana adresini girin.');
  return url.href;
}
