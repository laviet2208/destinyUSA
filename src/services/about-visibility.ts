export function aboutAppIsVisible(value: unknown) {
  return value === undefined ? true : Number(value) === 1;
}
