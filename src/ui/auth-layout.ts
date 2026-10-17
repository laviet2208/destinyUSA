export function authLayout(width: number, height: number, top = 0, bottom = 0) {
  const viewport = Math.max(0, height - top - bottom);
  return {
    padding: width < 350 ? 20 : 23,
    heroHeight: Math.max(390, Math.min(540, Math.round(viewport * 0.62))),
    headlineSize: Math.max(32, Math.min(42, width * 0.092)),
    sceneScale: width < 350 || viewport < 730 ? 0.85 : 1,
    bottomPadding: Math.max(18, bottom + 12),
  };
}

export function passwordPresentation(password: string) {
  return Number(password.length >= 8) + Number(password.length >= 12)
    + Number(/[A-Z]/.test(password) && /[a-z]/.test(password))
    + Number(/\d/.test(password) && /[^a-zA-Z0-9]/.test(password));
}
