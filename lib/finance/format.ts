export function roundUpToDollar(value: number): number {
  return Math.ceil(value);
}

export function asCurrencyRoundedUp(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(roundUpToDollar(value));
}