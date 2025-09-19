import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvestorsTable from '../../components/Calculator/InvestorsTable';
import { CalculatorProvider } from '../../context/CalculatorContext';

describe('InvestorsTable component', () => {
  it('loads baseline and renders investor names', async () => {
    render(
      <CalculatorProvider>
        <InvestorsTable />
      </CalculatorProvider>,
    );

    const loadBtn = screen.getByRole('button', { name: /Load baseline/i });
    await userEvent.click(loadBtn);

    // Expect at least one investor name input to be populated
    const nameInputs = await screen.findAllByDisplayValue(/Laura|Damon/i);
    expect(nameInputs.length).toBeGreaterThan(0);
  });
});
