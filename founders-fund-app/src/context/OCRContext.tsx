import { createContext, useContext, useState, ReactNode } from 'react';

interface ExtractedData {
  founders?: Array<{
    name?: string;
    amount?: number;
    date?: string;
    cls?: string;
  }>;
  investors?: Array<{
    name?: string;
    amount?: number;
    date?: string;
    cls?: string;
  }>;
  settings?: Record<string, unknown>;
}

interface OCRData {
  uploadedImage: string | null;
  rawText: string | null;
  extractedData: ExtractedData | null;
  confidence: number;
  timestamp: Date | null;
}

interface OCRContextValue {
  ocrData: OCRData;
  setOCRData: (data: Partial<OCRData>) => void;
  clearOCRData: () => void;
  hasOCRData: boolean;
}

const OCRContext = createContext<OCRContextValue | undefined>(undefined);

export function OCRProvider({ children }: { children: ReactNode }) {
  const [ocrData, setOCRDataState] = useState<OCRData>({
    uploadedImage: null,
    rawText: null,
    extractedData: null,
    confidence: 0,
    timestamp: null
  });

  const setOCRData = (data: Partial<OCRData>) => {
    setOCRDataState(prev => ({
      ...prev,
      ...data,
      timestamp: new Date()
    }));
  };

  const clearOCRData = () => {
    setOCRDataState({
      uploadedImage: null,
      rawText: null,
      extractedData: null,
      confidence: 0,
      timestamp: null
    });
  };

  const hasOCRData = !!(ocrData.uploadedImage || ocrData.rawText || ocrData.extractedData);

  return (
    <OCRContext.Provider value={{
      ocrData,
      setOCRData,
      clearOCRData,
      hasOCRData
    }}>
      {children}
    </OCRContext.Provider>
  );
}

export function useOCR() {
  const ctx = useContext(OCRContext);
  if (!ctx) {
    throw new Error('useOCR must be used within OCRProvider');
  }
  return ctx;
}