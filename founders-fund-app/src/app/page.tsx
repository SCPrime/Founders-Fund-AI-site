'use client';

import AIAssistant from '@/components/AI/AIAssistant';
import OCRChatBox from '@/components/AI/OCRChatBox';
import AllocationDashboard from '@/components/Allocation/AllocationDashboard';
import AppInitializer from '@/components/AppInitializer';
import Audit from '@/components/Audit';
import CacheBuster from '@/components/CacheBuster';
import AllocationSettings from '@/components/Calculator/AllocationSettings';
import FoundersTable from '@/components/Calculator/FoundersTable';
import InvestorsTable from '@/components/Calculator/InvestorsTable';
import ResultsTables from '@/components/Calculator/ResultsTables';
import Charts from '@/components/Charts';
import History from '@/components/History';
import DebugOCR from '@/components/OCR/DebugOCR';
import SimpleOCRUpload from '@/components/OCR/SimpleOCRUpload';
import PreviewArea from '@/components/Preview/PreviewArea';
import StatusBar from '@/components/StatusBar';
import StoreSynchronizer from '@/components/StoreSynchronizer';
import Tabs from '@/components/Tabs';
import ValidationPanel from '@/components/ValidationPanel';
import { CalculatorProvider } from '@/context/CalculatorContext';
import { OCRProvider } from '@/context/OCRContext';
import { useState } from 'react';

export default function Home() {
  const [tab, setTab] = useState('calc');
  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === '1';

  return (
    <CalculatorProvider>
      <OCRProvider>
        <AppInitializer />
        <StoreSynchronizer />
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
              <FoundersTable />
              <InvestorsTable />
              <ValidationPanel />
              <ResultsTables />
              <PreviewArea />
            </>
          )}
          {tab === 'allocation' && <AllocationDashboard />}
          {tab === 'ocr' && <SimpleOCRUpload />}
          {tab === 'history' && <History />}
          {tab === 'charts' && <Charts />}
          {tab === 'audit' && <Audit />}
          {tab === 'assistant' && <AIAssistant />}
          {tab === 'ocr-chat' && (
            <div className="h-[calc(100vh-200px)]">
              <OCRChatBox className="h-full" />
            </div>
          )}
        </div>
      </OCRProvider>
    </CalculatorProvider>
  );
}
