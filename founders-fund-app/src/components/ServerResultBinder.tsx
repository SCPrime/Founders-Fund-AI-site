'use client';
import { useEffect } from 'react';
// import { useCalcStore } from '@/store/calc'; // adapt to your store

export default function ServerResultBinder({ result }: { result: unknown }) {
  // const setOutputs = useCalcStore(s => s.setServerOutputs);
  useEffect(() => {
    if (!result) return;
    // setOutputs(result); // TODO: call your store setter here
    console.log('Server recompute result:', result);
  }, [result]);
  return null;
}
