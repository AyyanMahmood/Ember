// Revenue totals must never add amounts across currencies into one number
// -- that's not a smaller total, it's an arithmetically wrong one. Selects
// the currency actually used by most of the given invoices and returns
// only those, so totals are computed within one currency; the rest are
// reported via otherCurrencyCount instead of silently vanishing or being
// mixed in. Originally established in AnalyticsPage.jsx; extracted here so
// Dashboard/Client Detail can share the identical selection rule.
export function selectDominantCurrency(invoices) {
  const currencyCounts = new Map();
  invoices.forEach((invoice) => {
    const c = invoice.currency || 'USD';
    currencyCounts.set(c, (currencyCounts.get(c) || 0) + 1);
  });

  let currency = 'USD';
  let bestCount = -1;
  for (const [c, count] of currencyCounts) {
    if (count > bestCount) {
      currency = c;
      bestCount = count;
    }
  }

  const matched = invoices.filter((invoice) => (invoice.currency || 'USD') === currency);
  const otherCurrencyCount = invoices.length - matched.length;

  return { currency, invoices: matched, otherCurrencyCount };
}
