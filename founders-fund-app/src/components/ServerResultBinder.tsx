'use client';
import { useEffect } from 'react';
import { useAllocationStore } from '@/store/allocationStore';
import type { AllocationOutputs } from '@/types/allocation';

export default function ServerResultBinder({ result }: { result: unknown }) {
  const setServerOutputs = useAllocationStore(s => s.setServerOutputs);

  useEffect(() => {
    if (!result) return;

    // Validate that result has the expected shape
    if (typeof result === 'object' && result !== null && 'profitTotal' in result) {
      setServerOutputs(result as AllocationOutputs);
      console.log('✅ Server outputs bound to allocation store');
    } else {
      console.warn('Unexpected server result shape:', result);
    }
  }, [result, setServerOutputs]);

  return null;
}
