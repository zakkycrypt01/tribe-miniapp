export function formatDisplayAmount(amt: number, decimals: number): string {
  if (!isFinite(amt) || isNaN(amt)) return '';
  const displayDigits = decimals <= 6 ? 2 : 6;
  return Number(amt.toFixed(displayDigits)).toString();
}

export function convertBaseToQuote(amountBase: number, marketPrice: number): number {
  return amountBase * marketPrice;
}

export function convertQuoteToBase(amountQuote: number, marketPrice: number): number {
  if (marketPrice === 0) return NaN;
  return amountQuote / marketPrice;
}
