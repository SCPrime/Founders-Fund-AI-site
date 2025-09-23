'use client';

import { useState } from 'react';
import StatusBar from '@/components/StatusBar';
import Tabs from '@/components/Tabs';
import AllocationSettings from '@/components/Calculator/AllocationSettings';
import InvestorsTable from '@/components/Calculator/InvestorsTable';
import ResultsTables from '@/components/Calculator/ResultsTables';
import PreviewArea from '@/components/Preview/PreviewArea';
import AIAssistant from '@/components/AI/AIAssistant';
import History from '@/components/History';
import Charts from '@/components/Charts';
import Audit from '@/components/Audit';
import DebugOCR from '@/components/OCR/DebugOCR';
import ValidationPanel from '@/components/ValidationPanel';
import CacheBuster from '@/components/CacheBuster';
import AllocationDashboard from '@/components/Allocation/AllocationDashboard';
import AppInitializer from '@/components/AppInitializer';
import { CalculatorProvider } from '@/context/CalculatorContext';
import { OCRProvider } from '@/context/OCRContext';

export default function Home() {
  const [tab, setTab] = useState('calc');
  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === '1';

  return (
    <CalculatorProvider>
      <OCRProvider>
        <AppInitializer />
        <CacheBuster />
      <div className="wrap">
        <StatusBar />
        <h1>Founders Fund{SHOW_DEBUG ? ' - Debug OCR Mode' : ''}</h1>
        <Tabs active={tab} onChange={setTab} />
        {tab === 'calc' && (
          <>
            {SHOW_DEBUG && (
              <DebugOCR
                onExtractComplete={(data) => {
                  console.log('OCR Debug Data:', data);
                }}
                onError={(error) => {
                  console.error('OCR Debug Error:', error);
                }}
              />
            )}
            <AllocationSettings />
            <InvestorsTable />
            <ValidationPanel />
            <ResultsTables />
            <PreviewArea />
          </>
        )}
        {tab === 'allocation' && <AllocationDashboard />}
        {tab === 'history' && <History />}
        {tab === 'charts' && <Charts />}
        {tab === 'audit' && <Audit />}
        {tab === 'assistant' && <AIAssistant />}
      </div>
      </OCRProvider>
    </CalculatorProvider>
  );
}
