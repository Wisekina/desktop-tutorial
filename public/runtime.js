// GitHub Pages serves the interface only. Never report a successful real
// registration when the shared backend is unavailable.
import { apiBase, supabaseUrl, supabasePublishableKey } from './config.js?v=participants-11';
export const staticPreview = location.hostname.endsWith('.github.io') && !apiBase && !(supabaseUrl && supabasePublishableKey);
