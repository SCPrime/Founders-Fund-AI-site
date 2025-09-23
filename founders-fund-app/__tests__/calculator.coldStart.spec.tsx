import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, resetPersist } from '@/test/test-utils';
import AllocationDashboard from '@/components/Allocation/AllocationDashboard';

beforeEach(() => {
  resetPersist();
  process.env.NEXT_PUBLIC_SHOW_DEBUG = '0';
});

test('cold start shows preset rows and wallet placeholders', async () => {
  renderWithProviders(<AllocationDashboard />);

  // Wait for bootstrap to complete
  await waitFor(() => {
    expect(screen.getByTestId('row-Founders')).toBeInTheDocument();
  });

  // Preset rows appear
  expect(screen.getByTestId('row-Founders')).toBeInTheDocument();
  expect(screen.getByTestId('row-Laura')).toBeInTheDocument();
  expect(screen.getByTestId('row-Laura-1')).toBeInTheDocument();
  expect(screen.getByTestId('row-Laura-2')).toBeInTheDocument();
  expect(screen.getByTestId('row-Laura-3')).toBeInTheDocument();
  expect(screen.getByTestId('row-Damon')).toBeInTheDocument();

  // Wallet is gated by screenshot
  expect(screen.getByTestId('wallet-size-value')).toHaveTextContent('Awaiting screenshot');
  expect(screen.getByTestId('unrealized-value')).toHaveTextContent('Awaiting screenshot');
  expect(screen.getByTestId('realized-value')).toHaveTextContent('—');
});

test('debug surfaces are hidden in production', () => {
  process.env.NEXT_PUBLIC_SHOW_DEBUG = '0';
  renderWithProviders(<AllocationDashboard />);

  // Debug button should not be visible
  expect(screen.queryByText('Advanced Debug')).not.toBeInTheDocument();
});

test('debug surfaces are visible in development', () => {
  process.env.NEXT_PUBLIC_SHOW_DEBUG = '1';
  renderWithProviders(<AllocationDashboard />);

  // Debug button should be visible
  expect(screen.getByText('Advanced Debug')).toBeInTheDocument();
});