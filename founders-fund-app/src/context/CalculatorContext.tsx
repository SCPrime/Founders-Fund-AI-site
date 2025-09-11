import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'week' | 'max';

interface CalculatorSettings {
  view: ViewMode;
  winStart: string;
  winEnd: string;
  walletSize: number;
}

interface CalculatorContextValue extends CalculatorSettings {
  setView: (v: ViewMode) => void;
  setWinStart: (v: string) => void;
  setWinEnd: (v: string) => void;
  setWalletSize: (v: number) => void;
}

const CalculatorContext = createContext<CalculatorContextValue | undefined>(undefined);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewMode>('week');
  const [winStart, setWinStart] = useState<string>('');
  const [winEnd, setWinEnd] = useState<string>('');
  const [walletSize, setWalletSize] = useState<number>(0);

  return (
    <CalculatorContext.Provider
      value={{
        view,
        winStart,
        winEnd,
        walletSize,
        setView,
        setWinStart,
        setWinEnd,
        setWalletSize,
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
