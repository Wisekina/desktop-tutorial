// GitHub Pages serves the interface only. Never report a successful real
// registration when the shared backend is unavailable.
import { apiBase, supabaseUrl, supabasePublishableKey } from './config.js';
export const staticPreview = location.hostname.endsWith('.github.io') && !apiBase && !(supabaseUrl && supabasePublishableKey);
