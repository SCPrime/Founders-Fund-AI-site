'use client';

import { useEffect } from 'react';
import { useAllocationStore } from '@/store/allocationStore';

export default function AppInitializer() {
  const ensureDefaultLoaded = useAllocationStore((state) => state.ensureDefaultLoaded);

  useEffect(() => {
    // Bootstrap preset data on first load if no snapshots exist
    ensureDefaultLoaded();
  }, [ensureDefaultLoaded]);

  return null; // This component only handles initialization
}