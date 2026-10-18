export function referralButtonsAreVisible(value: unknown) {
  return value === undefined ? true : Number(value) === 1;
}
