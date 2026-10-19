export function isAboutDocument(html: string) {
  return /<(?:!doctype|html|head|style)\b/i.test(html);
}

export function aboutNavigation(url: string, base: string): 'internal' | 'external' | 'blocked' {
  if (url === 'about:blank' || url.startsWith('about:blank#') || url === base || url.startsWith(base + '#')) return 'internal';
  try {
    const parsed = new URL(url);
    if (!parsed.username && !parsed.password && ['https:', 'http:', 'mailto:', 'tel:', 'viber:'].includes(parsed.protocol)) return 'external';
  } catch {}
  return 'blocked';
}
