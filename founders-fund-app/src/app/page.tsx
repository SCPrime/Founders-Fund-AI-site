'use client';

import { useState } from 'react';
import StatusBar from '@/components/StatusBar';
import Tabs from '@/components/Tabs';
import AllocationSettings from '@/components/Calculator/AllocationSettings';
import FoundersTable from '@/components/Calculator/FoundersTable';
import InvestorsTable from '@/components/Calculator/InvestorsTable';
import ResultsTables from '@/components/Calculator/ResultsTables';
import PreviewArea from '@/components/Preview/PreviewArea';
import ScreenshotUploader from '@/components/OCR/ScreenshotUploader';
import AIAssistant from '@/components/AI/AIAssistant';
import History from '@/components/History';
import Charts from '@/components/Charts';
import Audit from '@/components/Audit';
import { CalculatorProvider } from '@/context/CalculatorContext';

export default function Home() {
  const [tab, setTab] = useState('calc');

  return (
    <CalculatorProvider>
      <div className="wrap">
        <StatusBar />
        <h1>Founders Fund</h1>
        <Tabs active={tab} onChange={setTab} />
        {tab === 'calc' && (
          <>
            <AllocationSettings />
            <FoundersTable />
            <InvestorsTable />
            <ResultsTables />
            <PreviewArea />
            <ScreenshotUploader />
          </>
        )}
        {tab === 'history' && <History />}
        {tab === 'charts' && <Charts />}
        {tab === 'audit' && <Audit />}
        {tab === 'assistant' && <AIAssistant />}
      </div>
    </CalculatorProvider>
  );
}
