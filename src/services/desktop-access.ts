import { normalizeLanguage } from '../ui/strings';

export function isDesktopWeb(platform: string, device?: { userAgent: string; maxTouchPoints?: number }) {
  if (platform !== 'web' || !device) return false;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(device.userAgent)) return false;
  if (/Macintosh/i.test(device.userAgent) && (device.maxTouchPoints ?? 0) > 1) return false;
  return true;
}

export function browserLanguage(value: string) {
  const code = value.toLowerCase().split(/[-_]/)[0];
  return normalizeLanguage(code === 'tl' ? 'fil' : code);
}
