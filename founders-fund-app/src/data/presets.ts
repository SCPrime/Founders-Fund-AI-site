// Preset baseline data (from audit snapshot)
export const INVESTOR_PRESET = [
  { name: 'Laura', date: '2025-07-22', amount: '5000', rule: 'net', cls: 'investor' },
  { name: 'Laura', date: '2025-07-31', amount: '5000', rule: 'net', cls: 'investor' },
  { name: 'Laura', date: '2025-08-25', amount: '2500', rule: 'net', cls: 'investor' },
  { name: 'Laura', date: '2025-09-06', amount: '2500', rule: 'net', cls: 'investor' },
  { name: 'Damon', date: '2025-08-02', amount: '5000', rule: 'net', cls: 'investor' },
];

// Founders contributions baseline - fund owners who seeded the fund
export const FOUNDER_PRESET = [
  { name: 'Founders', date: '2025-07-10', amount: 5000, cls: 'founder' }, // Initial founder seed capital
];

export const INVESTOR_CLASSES = ['founder', 'investor'];
