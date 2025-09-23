import React from 'react';
import { render } from '@testing-library/react';
import { useAllocationStore } from '@/store/allocationStore';

// Store test utilities
export function renderWithProviders(ui: React.ReactElement) {
  return render(ui);
}

export function resetPersist() {
  try {
    localStorage.clear();
    // Reset Zustand store to initial state
    useAllocationStore.getState().reset();
  } catch {
    // Ignore localStorage errors in tests
  }
}

// Test helpers for store
export function __resetStore() {
  useAllocationStore.getState().reset();
}