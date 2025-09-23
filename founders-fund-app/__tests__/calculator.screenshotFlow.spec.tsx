import React from 'react';
import { renderWithProviders, resetPersist } from '@/test/test-utils';
import { screen, act, waitFor } from '@testing-library/react';
import AllocationDashboard from '@/components/Allocation/AllocationDashboard';
import { useAllocationStore } from '@/store/allocationStore';

beforeEach(() => {
  resetPersist();
  process.env.NEXT_PUBLIC_SHOW_DEBUG = '0';
});

test('saving a new screenshot populates wallet and recomputes', async () => {
  renderWithProviders(<AllocationDashboard />);

  // Wait for initial bootstrap
  await waitFor(() => {
    expect(screen.getByTestId('wallet-size-value')).toHaveTextContent('Awaiting screenshot');
  });

  // Apply screenshot via store action (UI button can call the same)
  await act(async () => {
    useAllocationStore.getState().saveScreenshot({
      imageId: 'img-001',
      walletSize: 26005,
      unrealized: 52.3,
      capturedAt: '2025-09-06T23:59:59Z'
    });
  });

  // Values should update
  await waitFor(() => {
    expect(screen.getByTestId('wallet-size-value')).toHaveTextContent('$26,005');
  });

  expect(screen.getByTestId('unrealized-value')).toHaveTextContent('$52');
  expect(screen.getByTestId('realized-value')).toHaveTextContent('$5,953'); // (26005 - 20000 - 52.3)

  // Re-applying the same screenshot id should be ignored
  const stateBefore = useAllocationStore.getState();
  await act(async () => {
    useAllocationStore.getState().saveScreenshot({
      imageId: 'img-001', // same
      walletSize: 99999,
      unrealized: 0,
      capturedAt: '2025-09-06T23:59:59Z'
    });
  });

  const stateAfter = useAllocationStore.getState();
  expect(stateAfter.wallet.lastAppliedScreenshotId).toBe(stateBefore.wallet.lastAppliedScreenshotId);

  // Wallet values should remain unchanged
  expect(screen.getByTestId('wallet-size-value')).toHaveTextContent('$26,005');
});

test('bootstrap only runs once on cold start', async () => {
  const store = useAllocationStore.getState();

  // Simulate first render
  renderWithProviders(<AllocationDashboard />);

  await waitFor(() => {
    expect(store.boot.hasBootstrapped).toBe(true);
  });

  // Simulate re-render - bootstrap should not run again
  const contributionsBefore = store.state.contributions.length;

  // Force re-render by triggering a state change
  act(() => {
    store.ensureDefaultLoaded();
  });

  // Contributions count should remain the same (no duplicate bootstrap)
  expect(store.state.contributions.length).toBe(contributionsBefore);
});