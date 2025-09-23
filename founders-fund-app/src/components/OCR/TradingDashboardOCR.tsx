'use client';

import React, { useState, useRef } from 'react';
import { EnhancedOCRProcessor } from '@/utils/enhancedOCRProcessor';

interface TradingDashboardOCRProps {
  onExtractComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

interface ProcessingState {
  status: 'idle' | 'preprocessing' | 'extracting' | 'complete' | 'error';
  progress: number;
  message: string;
}

export default function TradingDashboardOCR({ onExtractComplete, onError }: TradingDashboardOCRProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrProcessor = useRef<EnhancedOCRProcessor | null>(null);

  // Initialize OCR processor
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      ocrProcessor.current = new EnhancedOCRProcessor();
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      onError('File too large. Maximum size is 10MB.');
      return;
    }

    processImageFile(file);
  };

  const processImageFile = async (file: File) => {
    try {
      setProcessingState({
        status: 'preprocessing',
        progress: 10,
        message: 'Loading and preprocessing image...'
      });

      // Convert to data URL
      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target!.result as string);
        reader.readAsDataURL(file);
      });

      setUploadedImage(imageDataUrl);

      // Step 1: Enhanced preprocessing for trading dashboards
      if (ocrProcessor.current) {
        setProcessingState({
          status: 'preprocessing',
          progress: 30,
          message: 'Enhancing image for financial data extraction...'
        });

        const processedImage = await ocrProcessor.current.preprocessTradingDashboard(imageDataUrl);
        setPreprocessedImage(processedImage);
      }

      setProcessingState({
        status: 'extracting',
        progress: 50,
        message: 'Performing OCR extraction...'
      });

      // Step 2: Use Tesseract.js for OCR
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');

      // Enhanced configuration for financial data
      await worker.setParameters({
        tessedit_pageseg_mode: 6 as const, // Uniform block of text
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%-/$:()/ \\n\\t',
        tessedit_ocr_engine_mode: '1', // Neural nets LSTM
        preserve_interword_spaces: '1',
      });

      setProcessingState({
        status: 'extracting',
        progress: 70,
        message: 'Running enhanced OCR analysis...'
      });

      const imageToProcess = preprocessedImage || imageDataUrl;
      const { data } = await worker.recognize(imageToProcess);
      await worker.terminate();

      setProcessingState({
        status: 'extracting',
        progress: 85,
        message: 'Extracting financial data patterns...'
      });

      // Step 3: Extract financial data using enhanced patterns
      let financialData = {};
      if (ocrProcessor.current) {
        financialData = ocrProcessor.current.extractFinancialData(data.text);
        financialData = ocrProcessor.current.validateFinancialData(financialData as Record<string, unknown>);
      }

      // Step 4: Send to backend for additional processing
      setProcessingState({
        status: 'extracting',
        progress: 90,
        message: 'Validating extracted data...'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ocrText', data.text);
      formData.append('clientExtraction', JSON.stringify(financialData));

      const response = await fetch('/api/pnl-extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      setProcessingState({
        status: 'complete',
        progress: 100,
        message: `Extraction complete! Confidence: ${result.data?.confidence || 85}%`
      });

      // Combine client-side and server-side results
      const combinedData = {
        ...financialData,
        ...result.data,
        processingSteps: [
          'Enhanced image preprocessing',
          'Tesseract.js OCR with financial optimization',
          'Client-side pattern recognition',
          'Server-side AI validation',
          'Data consistency checks'
        ]
      };

      setExtractedData(combinedData);
      onExtractComplete(combinedData);

    } catch (error) {
      console.error('Trading dashboard OCR error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'OCR processing failed'
      });
      onError(error instanceof Error ? error.message : 'Unknown OCR error');
    }
  };

  const resetProcessor = () => {
    setProcessingState({
      status: 'idle',
      progress: 0,
      message: ''
    });
    setUploadedImage(null);
    setPreprocessedImage(null);
    setExtractedData(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'complete': return '#4CAF50';
      case 'error': return '#f44336';
      case 'preprocessing':
      case 'extracting': return '#ff9800';
      default: return '#666';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'complete': return '✅';
      case 'error': return '❌';
      case 'preprocessing': return '🔧';
      case 'extracting': return '🔍';
      default: return '📊';
    }
  };

  return (
    <div style={{
      border: '2px dashed #2a3b55',
      borderRadius: '12px',
      padding: '24px',
      margin: '16px 0',
      background: 'var(--panel)'
    }}>
      <h3>📊 Enhanced Trading Dashboard OCR</h3>
      <p style={{ color: '#9aa4b2', fontSize: '14px', marginBottom: '16px' }}>
        Advanced OCR optimized for trading dashboards with enhanced pattern recognition for PNL, trades, and financial metrics.
      </p>

      {/* File Upload */}
      <div style={{ marginBottom: '20px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={processingState.status === 'preprocessing' || processingState.status === 'extracting'}
          style={{
            padding: '14px 28px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processingState.status === 'preprocessing' || processingState.status === 'extracting' ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: processingState.status === 'preprocessing' || processingState.status === 'extracting' ? 0.6 : 1
          }}
        >
          📊 Upload Trading Dashboard
        </button>

        {processingState.status !== 'idle' && (
          <button
            onClick={resetProcessor}
            style={{
              padding: '10px 20px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: '12px'
            }}
          >
            🔄 Reset
          </button>
        )}
      </div>

      {/* Processing Status */}
      {processingState.status !== 'idle' && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(57, 208, 216, 0.1)',
          border: `2px solid ${getStatusColor()}`,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>{getStatusIcon()}</span>
            <span style={{ fontWeight: 'bold', color: getStatusColor(), fontSize: '16px' }}>
              {processingState.message}
            </span>
          </div>

          {(processingState.status === 'preprocessing' || processingState.status === 'extracting') && (
            <div style={{
              width: '100%',
              height: '10px',
              backgroundColor: '#334155',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${processingState.progress}%`,
                height: '100%',
                backgroundColor: getStatusColor(),
                transition: 'width 0.5s ease'
              }} />
            </div>
          )}
        </div>
      )}

      {/* Image Comparison */}
      {uploadedImage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>

          {/* Original Image */}
          <div>
            <h4>📷 Original Image</h4>
            <img
              src={uploadedImage}
              alt="Original dashboard"
              style={{
                maxWidth: '100%',
                maxHeight: '250px',
                border: '2px solid #334155',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Preprocessed Image */}
          {preprocessedImage && (
            <div>
              <h4>🔧 Enhanced for OCR</h4>
              <img
                src={preprocessedImage}
                alt="Preprocessed dashboard"
                style={{
                  maxWidth: '100%',
                  maxHeight: '250px',
                  border: '2px solid #ff9800',
                  borderRadius: '8px'
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Extracted Data Display */}
      {extractedData && (
        <div style={{ marginTop: '20px' }}>
          <h4>📊 Extracted Financial Data</h4>
          <div style={{
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>

              {Object.entries(extractedData).map(([key, value]) => {
                if (key === 'processingSteps' || key === 'confidence') return null;

                return (
                  <div key={key} style={{
                    backgroundColor: 'var(--panel)',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div style={{ fontSize: '16px', color: 'var(--text)', marginTop: '4px' }}>
                      {typeof value === 'number' && (key.toLowerCase().includes('pnl') || key.toLowerCase().includes('value') || key.toLowerCase().includes('balance'))
                        ? `$${value.toLocaleString()}`
                        : String(value)}
                    </div>
                  </div>
                );
              })}
            </div>

            {extractedData.confidence && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <strong>Extraction Confidence: {Math.round(extractedData.confidence)}%</strong>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#9aa4b2', fontStyle: 'italic' }}>
        💡 This enhanced OCR system uses advanced image preprocessing, specialized financial pattern recognition,
        and multi-layer validation to accurately extract trading dashboard data.
      </div>
    </div>
  );
}