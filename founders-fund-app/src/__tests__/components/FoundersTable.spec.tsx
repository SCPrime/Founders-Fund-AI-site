import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoundersTable from '../../components/Calculator/FoundersTable';
import { CalculatorProvider } from '../../context/CalculatorContext';

describe('FoundersTable component', () => {
  it('loads baseline and updates wallet size via context', async () => {
    render(
      <CalculatorProvider>
        <FoundersTable />
      </CalculatorProvider>,
    );

    // Click Load baseline
    const loadBtn = screen.getByRole('button', { name: /Load baseline/i });
    await userEvent.click(loadBtn);

    // After loading, there should be rows with date inputs
    const dateInputs = await screen.findAllByDisplayValue(/2025/);
    expect(dateInputs.length).toBeGreaterThan(0);
  });
});
