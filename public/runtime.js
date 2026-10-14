// GitHub Pages serves the interface only. Never report a successful real
// registration when the shared backend is unavailable.
export const staticPreview = location.hostname.endsWith('.github.io');
