/// <reference types="vitest" />
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundersTable from '../../components/Calculator/FoundersTable';
import { CalculatorProvider, useCalculator } from '../../context/CalculatorContext';
import { FOUNDER_PRESET } from '../../data/presets';

describe('FoundersTable component', () => {
  it('loads baseline and updates wallet size via context', async () => {
    function DisplayWallet() {
      const calc = useCalculator();
      return <div data-testid="wallet">{calc.walletSize}</div>;
    }

    render(
      <CalculatorProvider>
        <FoundersTable />
        <DisplayWallet />
      </CalculatorProvider>,
    );

    // Click Load baseline
    const loadBtn = screen.getByRole('button', { name: /Load baseline/i });
    await userEvent.click(loadBtn);

    // After loading, the walletSize in context should equal the sum of preset amounts
    const expectedSum = FOUNDER_PRESET.reduce((s, p) => s + Number(p.amount || 0), 0);
    const wallet = await screen.findByTestId('wallet');
    expect(Number(wallet.textContent)).toBe(expectedSum);
  });

  it('clear button removes rows', async () => {
    render(
      <CalculatorProvider>
        <FoundersTable />
      </CalculatorProvider>,
    );

    // Initially seeded with preset rows
    const rowsBefore = await screen.findAllByRole('row');
    expect(rowsBefore.length).toBeGreaterThan(1);

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    await userEvent.click(clearBtn);

    // After clearing, only header/footer rows remain (no data rows)
    const rowsAfter = screen.getAllByRole('row');
    // Expect the number of rows to be <= previous
    expect(rowsAfter.length).toBeLessThan(rowsBefore.length);
  });
});
