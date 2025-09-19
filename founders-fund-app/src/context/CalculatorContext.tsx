import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'week' | 'max';

interface CalculatorSettings {
  view: ViewMode;
  winStart: string;
  winEnd: string;
  walletSize: number;
  realizedProfit: number;
  moonbagReal: number;
  moonbagUnreal: number;
  includeUnreal: 'yes' | 'no';
  moonbagFounderPct: number;
  mgmtFeePct: number;
  entryFeePct: number;
  feeReducesInvestor: 'yes' | 'no';
  founderCount: number;
  drawPerFounder: number;
  applyDraws: 'yes' | 'no';
  domLeadPct: number;
}

interface CalculatorContextValue extends CalculatorSettings {
  setView: (v: ViewMode) => void;
  setWinStart: (v: string) => void;
  setWinEnd: (v: string) => void;
  setWalletSize: (v: number) => void;
  setRealizedProfit: (v: number) => void;
  setMoonbagReal: (v: number) => void;
  setMoonbagUnreal: (v: number) => void;
  setIncludeUnreal: (v: 'yes' | 'no') => void;
  setMoonbagFounderPct: (v: number) => void;
  setMgmtFeePct: (v: number) => void;
  setEntryFeePct: (v: number) => void;
  setFeeReducesInvestor: (v: 'yes' | 'no') => void;
  setFounderCount: (v: number) => void;
  setDrawPerFounder: (v: number) => void;
  setApplyDraws: (v: 'yes' | 'no') => void;
  setDomLeadPct: (v: number) => void;
}

const CalculatorContext = createContext<CalculatorContextValue | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>('week');
  const [winStart, setWinStart] = useState<string>('2025-07-22');
  const [winEnd, setWinEnd] = useState<string>('2025-09-06');
  const [walletSize, setWalletSize] = useState<number>(25000);
  const [realizedProfit, setRealizedProfit] = useState<number>(20000);
  const [moonbagReal, setMoonbagReal] = useState<number>(0);
  const [moonbagUnreal, setMoonbagUnreal] = useState<number>(0);
  const [includeUnreal, setIncludeUnreal] = useState<'yes' | 'no'>('no');
  const [moonbagFounderPct, setMoonbagFounderPct] = useState<number>(75);
  const [mgmtFeePct, setMgmtFeePct] = useState<number>(20);
  const [entryFeePct, setEntryFeePct] = useState<number>(10);
  const [feeReducesInvestor, setFeeReducesInvestor] =
    useState<'yes' | 'no'>('yes');
  const [founderCount, setFounderCount] = useState<number>(2);
  const [drawPerFounder, setDrawPerFounder] = useState<number>(0);
  const [applyDraws, setApplyDraws] = useState<'yes' | 'no'>('no');
  const [domLeadPct, setDomLeadPct] = useState<number>(0);

  return (
    <CalculatorContext.Provider
      value={{
        view,
        winStart,
        winEnd,
        walletSize,
        realizedProfit,
        moonbagReal,
        moonbagUnreal,
        includeUnreal,
        moonbagFounderPct,
        mgmtFeePct,
        entryFeePct,
        feeReducesInvestor,
        founderCount,
        drawPerFounder,
        applyDraws,
        domLeadPct,
        setView,
        setWinStart,
        setWinEnd,
        setWalletSize,
        setRealizedProfit,
        setMoonbagReal,
        setMoonbagUnreal,
        setIncludeUnreal,
        setMoonbagFounderPct,
        setMgmtFeePct,
        setEntryFeePct,
        setFeeReducesInvestor,
        setFounderCount,
        setDrawPerFounder,
        setApplyDraws,
        setDomLeadPct,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) {
    throw new Error('useCalculator must be used within CalculatorProvider');
  }
  return ctx;
}
