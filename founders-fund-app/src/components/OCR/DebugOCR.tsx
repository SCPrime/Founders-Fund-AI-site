'use client';

import { useOCR } from '@/context/OCRContext';
import { useAllocationStore } from '@/store/allocationStore';
import { useFundStore } from '@/store/fundStore';
import React, { useRef, useState } from 'react';

interface DebugOCRProps {
  onExtractComplete?: (data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

interface DebugResult {
  success: boolean;
  rawText: string;
  extractedData: Record<string, unknown>;
  extractionLog: string[];
  confidence: number;
  validation: Record<string, unknown>;
  finalConfidence: number;
  debug: Record<string, unknown>;
}

export default function DebugOCR({ onExtractComplete, onError }: DebugOCRProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateSettings, populateContributions } = useFundStore();
  const { saveScreenshot } = useAllocationStore();
  const { ocrData, setOCRData, clearOCRData } = useOCR();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setPushSuccess(null);
    // Don't clear debugResult - preserve previous results

    try {
      // Preview image and save to context
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setOCRData({ uploadedImage: e.target.result as string });
        }
      };
      reader.readAsDataURL(file);

      // Send to debug API
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/debug-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: DebugResult = await response.json();

      // Save to OCR context for persistence
      setOCRData({
        rawText: result.rawText,
        extractedData: result.extractedData,
        confidence: result.finalConfidence,
      });

      if (onExtractComplete && result.success) {
        onExtractComplete(result.extractedData);
      }
    } catch (err) {
      console.error('Debug OCR Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Debug OCR failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const pushToCalculator = async () => {
    if (!ocrData.extractedData) return;

    setIsPushing(true);
    try {
      const data = ocrData.extractedData;

      // Save screenshot wallet data to allocation store
      if (data.settings && (data.settings.walletSize || data.settings.moonbagUnreal)) {
        const walletSizeValue = data.settings.walletSize;
        const unrealizedValue = data.settings.moonbagUnreal;
        const walletSize =
          typeof walletSizeValue === 'number' && !isNaN(walletSizeValue) ? walletSizeValue : 0;
        const unrealized =
          typeof unrealizedValue === 'number' && !isNaN(unrealizedValue) ? unrealizedValue : 0;

        saveScreenshot({
          imageId: `ocr_upload_${Date.now()}`,
          walletSize: walletSize,
          unrealized: unrealized,
          capturedAt: new Date().toISOString(),
        });
      }

      // Legacy fund store update for backward compatibility
      if (data.settings) {
        const settingsUpdates: Record<string, unknown> = {};
        if (data.settings.walletSize) settingsUpdates.walletSize = data.settings.walletSize;
        if (data.settings.realizedProfit)
          settingsUpdates.realizedProfit = data.settings.realizedProfit;
        if (data.settings.moonbagUnreal)
          settingsUpdates.moonbagUnreal = data.settings.moonbagUnreal;
        if (data.settings.moonbagFounderPct)
          settingsUpdates.moonbagFounderPct = data.settings.moonbagFounderPct;
        if (data.settings.mgmtFeePct) settingsUpdates.mgmtFeePct = data.settings.mgmtFeePct;
        if (data.settings.entryFeePct) settingsUpdates.entryFeePct = data.settings.entryFeePct;

        if (Object.keys(settingsUpdates).length > 0) {
          updateSettings(settingsUpdates);
        }
      }

      // Combine founders and investors for the table
      const combinedData: Array<{
        name: string;
        date: string;
        amount: number;
        rule: 'net' | 'gross';
        cls: 'founder' | 'investor';
      }> = [];
      if (data.founders && Array.isArray(data.founders)) {
        combinedData.push(
          ...data.founders.map((f: Record<string, unknown>) => ({
            name: (f.name as string) || 'Founder',
            date: f.date as string,
            amount: typeof f.amount === 'number' ? f.amount : 0,
            rule: (f.rule === 'gross' ? 'gross' : 'net') as 'net' | 'gross',
            cls: 'founder' as const,
          })),
        );
      }
      if (data.investors && Array.isArray(data.investors)) {
        combinedData.push(
          ...data.investors.map((i: Record<string, unknown>) => ({
            name: (i.name as string) || 'Investor',
            date: i.date as string,
            amount: typeof i.amount === 'number' ? i.amount : 0,
            rule: (i.rule === 'gross' ? 'gross' : 'net') as 'net' | 'gross',
            cls: 'investor' as const,
          })),
        );
      }

      // Push to fund store using populateContributions
      if (combinedData.length > 0) {
        populateContributions(combinedData);
      }

      // Trigger AI assistant processing
      if (onExtractComplete) {
        onExtractComplete({
          ...ocrData.extractedData,
          rawText: ocrData.rawText,
        });
      }

      console.log('Data pushed to both stores successfully:', data);
      setPushSuccess('✅ Data successfully shared to Calculator with wallet values updated!');

      // Clear success message after 5 seconds
      setTimeout(() => setPushSuccess(null), 5000);
    } catch (err) {
      console.error('Error pushing to fund store:', err);
      setError('Failed to push data to fund store');
    } finally {
      setIsPushing(false);
    }
  };

  const resetDebug = () => {
    clearOCRData();
    setError(null);
    setPushSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      style={{
        border: '2px solid #ff9800',
        borderRadius: '12px',
        padding: '20px',
        margin: '16px 0',
        background: 'linear-gradient(135deg, var(--panel) 0%, rgba(255, 152, 0, 0.05) 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px' }}>🔍</span>
        <div>
          <h3 style={{ margin: 0, color: '#ff9800' }}>Debug OCR - Show Raw Extraction</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#9aa4b2' }}>
            See exactly what text and values are being extracted from your image
          </p>
        </div>
      </div>

      {/* Upload */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="debug-ocr-file-input" style={{ display: 'none' }}>
          Upload image for OCR processing
        </label>
        <input
          id="debug-ocr-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Upload image for OCR processing"
          onChange={handleFileUpload}
          disabled={isProcessing}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          {isProcessing ? '🔄 Processing...' : '🔍 Debug OCR Analysis'}
        </button>

        {ocrData.extractedData && (
          <button
            onClick={pushToCalculator}
            disabled={isPushing}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isPushing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginLeft: '12px',
              opacity: isPushing ? 0.6 : 1,
            }}
          >
            {isPushing ? '⏳ Pushing...' : '📊 Push to Calculator'}
          </button>
        )}

        {(ocrData.uploadedImage || ocrData.rawText || error) && (
          <button
            onClick={resetDebug}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: '12px',
            }}
          >
            🗑️ Reset
          </button>
        )}
      </div>

      {/* Image Preview */}
      {ocrData.uploadedImage && (
        <div style={{ marginBottom: '20px' }}>
          <h4>📷 Uploaded Image</h4>
          <img
            src={ocrData.uploadedImage}
            alt="Debug image"
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              border: '1px solid #ff9800',
              borderRadius: '8px',
            }}
          />
        </div>
      )}

      {/* Success Message */}
      {pushSuccess && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(53, 199, 89, 0.1)',
            border: '1px solid var(--good)',
            borderRadius: '8px',
            color: 'var(--good)',
            marginBottom: '20px',
          }}
        >
          <strong>{pushSuccess}</strong>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid var(--bad)',
            borderRadius: '8px',
            color: 'var(--bad)',
            marginBottom: '20px',
          }}
        >
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Debug Results */}
      {ocrData.extractedData && (
        <div style={{ marginTop: '20px' }}>
          {/* Confidence Display */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor:
                ocrData.confidence >= 90
                  ? 'rgba(53, 199, 89, 0.1)'
                  : ocrData.confidence >= 70
                    ? 'rgba(255, 176, 32, 0.1)'
                    : 'rgba(255, 107, 107, 0.1)',
              border: `2px solid ${
                ocrData.confidence >= 90
                  ? 'var(--good)'
                  : ocrData.confidence >= 70
                    ? 'var(--warn)'
                    : 'var(--bad)'
              }`,
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--text)' }}>
                Confidence: {ocrData.confidence}%
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Last updated: {ocrData.timestamp?.toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: '24px' }}>
              {ocrData.confidence >= 90 ? '🎯' : ocrData.confidence >= 70 ? '⚠️' : '❌'}
            </div>
          </div>

          {/* Raw Text */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text)' }}>📝 Raw Text Extracted</h4>
            <div
              style={{
                backgroundColor: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                color: 'var(--text)',
              }}
            >
              {ocrData.rawText || 'No raw text extracted'}
            </div>
          </div>

          {/* Structured Data */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text)' }}>📊 Structured Data Extracted</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              {Object.entries(ocrData.extractedData || {}).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: 'var(--panel)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '12px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      marginBottom: '6px',
                    }}
                  >
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      color: value !== null && value !== undefined ? 'var(--text)' : 'var(--muted)',
                      fontWeight: 'bold',
                    }}
                  >
                    {value !== null && value !== undefined
                      ? typeof value === 'number' &&
                        (key.includes('Value') || key.includes('PNL') || key.includes('Balance'))
                        ? `$${value.toLocaleString()}`
                        : String(value)
                      : 'Not Found'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Push Button Below Extracted Data */}
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
            }}
          >
            <h4 style={{ color: 'var(--text)', marginBottom: '12px' }}>
              📊 Push Data to Calculator
            </h4>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
              Click the button below to populate the calculator with this extracted data and verify
              the calculations.
            </p>
            <button
              onClick={pushToCalculator}
              disabled={isPushing}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--good)',
                color: 'var(--text)',
                border: '1px solid var(--good)',
                borderRadius: '8px',
                cursor: isPushing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: isPushing ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isPushing
                ? '⏳ Pushing to Fund Store...'
                : '📊 Push to Fund Store & Verify Calculations'}
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '16px',
          fontSize: '12px',
          color: 'var(--muted)',
          fontStyle: 'italic',
        }}
      >
        🔍 This debug tool shows the complete OCR extraction process to help identify and fix
        accuracy issues.
      </div>
    </div>
  );
}
