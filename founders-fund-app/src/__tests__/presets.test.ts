import { describe, it, expect } from 'vitest';
import { INVESTOR_PRESET, FOUNDER_PRESET } from '../data/presets';

describe('presets', () => {
  it('investor preset has expected shape and sum', () => {
    expect(Array.isArray(INVESTOR_PRESET)).toBe(true);
    const sum = INVESTOR_PRESET.reduce((s, p) => s + Number(p.amount || 0), 0);
    expect(sum).toBeGreaterThan(0);
    INVESTOR_PRESET.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('date');
      expect(p).toHaveProperty('amount');
    });
  });

  it('founder preset has expected shape and sum', () => {
    expect(Array.isArray(FOUNDER_PRESET)).toBe(true);
    const sum = FOUNDER_PRESET.reduce((s, p) => s + Number(p.amount || 0), 0);
    expect(sum).toBeGreaterThan(0);
    FOUNDER_PRESET.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('date');
      expect(p).toHaveProperty('amount');
    });
  });
});
