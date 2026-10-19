import { apiBase, supabaseUrl, supabasePublishableKey } from './config.js?v=participants-11';
export const usesSupabase = Boolean(supabaseUrl && supabasePublishableKey);
let adminSession = null;

function projectUrl(path) {
  const base = new URL(supabaseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Geçersiz Supabase adresi.');
  // New publishable keys are public; legacy JWT keys must carry the anon role.
  if (!supabasePublishableKey.startsWith('sb_publishable_')) {
    let role;
    try { const part = supabasePublishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); role = JSON.parse(atob(part)).role; } catch {}
    if (role !== 'anon') throw new Error('Yalnızca herkese açık publishable/anon anahtarı kullanılabilir.');
  }
  return new URL(path, base).href;
}

async function supabaseFetch(path, data, accessToken) {
  const headers = { apikey:supabasePublishableKey, 'Content-Type':'application/json' };
  if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
  const response = await fetch(projectUrl(path), { method:'POST', headers, body:JSON.stringify(data) });
  let result;
  try { result = await response.json(); } catch { throw new Error('Sunucudan geçersiz yanıt alındı.'); }
  if (!response.ok) throw new Error(result.message || result.msg || result.error_description || 'İşlem tamamlanamadı.');
  return result;
}

async function authorizedSession() {
  if (!adminSession) throw new Error('Yönetici erişimi gerekli.');
  if (Date.now() >= adminSession.expiresAt - 30000) {
    const refreshed = await supabaseFetch('auth/v1/token?grant_type=refresh_token', { refresh_token:adminSession.refreshToken });
    adminSession = { accessToken:refreshed.access_token, refreshToken:refreshed.refresh_token, expiresAt:Date.now()+refreshed.expires_in*1000 };
  }
  return adminSession.accessToken;
}

export async function requestApi(path, body) {
  if (usesSupabase) {
    const calls = {
      status:['gift_status',{}], register:['gift_register',{ p_name:body?.name }], result:['gift_result',{ p_token:body?.token }],
      settings:['gift_configure',{ p_deadline:body?.deadline,p_budget:body?.budget }], 'admin/check':['gift_admin_status',{}],
      'admin/participants':['gift_admin_participants',{}], 'admin/delete':['gift_delete_registration',{p_id:body?.id}],
      'admin/reopen':['gift_reopen',{p_deadline:body?.deadline,p_budget:body?.budget}]
    };
    if (!calls[path]) throw new Error('Desteklenmeyen işlem.');
    const [name, args] = calls[path];
    const token = path === 'settings' || path.startsWith('admin/') ? await authorizedSession() : undefined;
    return supabaseFetch('rest/v1/rpc/' + name, args, token);
  }
  const response = await fetch(apiUrl(path), body === undefined ? {} : { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body) });
  let result;
  try { result = await response.json(); } catch { throw new Error('Sunucudan geçersiz yanıt alındı.'); }
  if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı.');
  return result;
}

export async function loginOrganizer({ email, password, key }) {
  if (!usesSupabase) return requestApi('admin/check', { key });
  const session = await supabaseFetch('auth/v1/token?grant_type=password', { email,password });
  // Signing in is insufficient: the database must also authorize this user.
  try {
    const status = await supabaseFetch('rest/v1/rpc/gift_admin_status', {}, session.access_token);
    adminSession = { accessToken:session.access_token,refreshToken:session.refresh_token,expiresAt:Date.now()+session.expires_in*1000 };
    return status;
  } catch (error) { adminSession = null; throw error; }
}
export function logoutOrganizer() { adminSession = null; }

export function apiUrl(path) {
  if (!apiBase) return '/api/' + path;
  const base = new URL(apiBase);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Backend adresi HTTPS ana adresi olmalı.');
  return new URL('api/' + path, base).href;
}
