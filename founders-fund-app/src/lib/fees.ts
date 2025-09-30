export type Leg = {
  id?: string;
  owner: 'investor' | 'founders';
  name: string;
  type: string;
  amount: number;
  ts: string; // ISO
  earnsDollarDaysThisWindow?: boolean;
};

function sameDay(a: string, b: string) {
  const d1 = new Date(a), d2 = new Date(b);
  return d1.getUTCFullYear() === d2.getUTCFullYear()
    && d1.getUTCMonth() === d2.getUTCMonth()
    && d1.getUTCDate() === d2.getUTCDate();
}

export function ensureEntryFees(legs: Leg[], feeRate = 0.10): Leg[] {
  const out = [...legs];
  // For each investor_contribution, ensure founders_entry_fee exists (same day, 10% amount)
  for (const l of legs) {
    if (l.owner !== 'investor' || l.type !== 'investor_contribution') continue;
    const expectedFee = +(l.amount * feeRate).toFixed(2);
    const exists = legs.some(x =>
      x.owner === 'founders' &&
      x.type === 'founders_entry_fee' &&
      sameDay(x.ts, l.ts) &&
      +x.amount === expectedFee
    );
    if (!exists) {
      out.push({
        owner: 'founders',
        name: 'Founders',
        type: 'founders_entry_fee',
        amount: expectedFee,
        ts: l.ts,
        earnsDollarDaysThisWindow: true
      });
    }
  }
  return out;
}
