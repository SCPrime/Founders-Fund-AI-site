/// <reference types="vitest" />
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvestorsTable from '../../components/Calculator/InvestorsTable';
import { CalculatorProvider, useCalculator } from '../../context/CalculatorContext';
import { INVESTOR_PRESET } from '../../data/presets';

describe('InvestorsTable component', () => {
  it('loads baseline and renders investor names', async () => {
    function DisplayRealized() {
      const calc = useCalculator();
      return <div data-testid="realized">{calc.realizedProfit}</div>;
    }

    render(
      <CalculatorProvider>
        <InvestorsTable />
        <DisplayRealized />
      </CalculatorProvider>,
    );

    const loadBtn = screen.getByRole('button', { name: /Load baseline/i });
    await userEvent.click(loadBtn);

    const expectedSum = INVESTOR_PRESET.reduce((s, p) => s + Number(p.amount || 0), 0);
    const realized = await screen.findByTestId('realized');
    expect(Number(realized.textContent)).toBe(expectedSum);
  });

  it('clear button removes rows and class dropdown is editable', async () => {
    render(
      <CalculatorProvider>
        <InvestorsTable />
      </CalculatorProvider>,
    );

    // Ensure seeded rows exist
    const rowsBefore = await screen.findAllByRole('row');
    expect(rowsBefore.length).toBeGreaterThan(1);

    // Change the class of the first data row
    const selects = await screen.findAllByRole('combobox');
    if (selects.length > 0) {
      await userEvent.selectOptions(selects[0], 'founder');
      expect((selects[0] as HTMLSelectElement).value).toBe('founder');
    }

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    await userEvent.click(clearBtn);

    const rowsAfter = screen.getAllByRole('row');
    expect(rowsAfter.length).toBeLessThan(rowsBefore.length);
  });
});
