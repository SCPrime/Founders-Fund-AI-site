// Preset baseline data (from audit snapshot)
export const INVESTOR_PRESET = [
  { name: 'Laura', date: '2025-07-22', amount: '5000', rule: 'net', cls: 'founder' },
  { name: 'Laura', date: '2025-07-31', amount: '5000', rule: 'net', cls: 'founder' },
  { name: 'Laura', date: '2025-08-25', amount: '2500', rule: 'net', cls: 'founder' },
  { name: 'Laura', date: '2025-09-06', amount: '2500', rule: 'net', cls: 'founder' },
  { name: 'Damon', date: '2025-08-02', amount: '5000', rule: 'net', cls: 'founder' },
];

// Founders contributions baseline (map of founder name to contribution rows)
export const FOUNDER_PRESET = [
  { name: 'Laura', date: '2025-07-22', amount: '5000' },
  { name: 'Laura', date: '2025-07-31', amount: '5000' },
  { name: 'Laura', date: '2025-08-25', amount: '2500' },
  { name: 'Laura', date: '2025-09-06', amount: '2500' },
  { name: 'Damon', date: '2025-08-02', amount: '5000' },
];

export const INVESTOR_CLASSES = ['founder', 'investor'];
