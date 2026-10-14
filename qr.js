import QRCode from 'qrcode';

import { registrationUrl } from './public/qr-url.js';
export { registrationUrl } from './public/qr-url.js';

export async function makeRegistrationQr(value) {
  const url = registrationUrl(value);
  return QRCode.toBuffer(url, { type: 'png', width: 720, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#173b2d', light: '#ffffff' } });
}
