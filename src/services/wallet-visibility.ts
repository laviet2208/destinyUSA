export function walletIsVisible(value: unknown) {
  return value === undefined ? true : Number(value) === 1;
}
