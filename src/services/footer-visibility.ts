export function appInfoFooterIsVisible(value: unknown) {
  return value === undefined ? true : Number(value) === 1;
}
