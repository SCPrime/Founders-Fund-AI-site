'use client';

import React, { useState, useRef } from 'react';
import OCRTestSuite from './OCRTestSuite';

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

interface OCRProcessorProps {
  onOCRComplete: (extractedData: ExtractedData) => void;
  onError: (error: string) => void;
}

interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export default function OCRProcessor({ onOCRComplete, onError }: OCRProcessorProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [ocrResults, setOcrResults] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload an image file (JPEG, PNG, GIF, BMP, or WebP).');
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
        status: 'uploading',
        progress: 10,
        message: 'Uploading image...'
      });

      // Display the image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);

      setProcessingState({
        status: 'processing',
        progress: 30,
        message: 'Initializing OCR engine...'
      });

      // Process with sophisticated OCR via API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/simple-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const result = await response.json();

      setProcessingState({
        status: 'processing',
        progress: 80,
        message: 'Extracting financial data...'
      });

      setExtractedText(result.text);
      setOcrResults(result.extractedData);

      setProcessingState({
        status: 'complete',
        progress: 100,
        message: `OCR completed with ${result.confidence.toFixed(1)}% confidence`
      });

      // Draw detection overlay on canvas
      drawDetectionOverlay(imageUrl, result.text);

      // Debug logging for troubleshooting
      console.log('OCR Results:', result.extractedData);
      console.log('Auto-population functions available:', {
        populateFoundersFromAI: typeof (window as any).populateFoundersFromAI,
        populateInvestorsFromAI: typeof (window as any).populateInvestorsFromAI
      });

      // Force auto-population with debug feedback
      // Note: Auto-population is handled by the parent component through onOCRComplete

      // Pass extracted data to parent
      onOCRComplete(result.extractedData);

    } catch (error) {
      console.error('OCR processing error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'OCR processing failed'
      });
      onError(error instanceof Error ? error.message : 'Unknown OCR error');
    }
  };

  const processTestImage = async (imageData: string, description: string) => {
    try {
      setProcessingState({
        status: 'processing',
        progress: 20,
        message: `Processing test image: ${description}`
      });

      // Convert base64 to blob
      const imageResponse = await fetch(imageData);
      const blob = await imageResponse.blob();
      const file = new File([blob], 'test-image.png', { type: 'image/png' });

      setUploadedImage(imageData);

      setProcessingState({
        status: 'processing',
        progress: 50,
        message: 'Running OCR analysis...'
      });

      // Process with OCR via API (same as normal upload)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/simple-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const result = await response.json();

      setProcessingState({
        status: 'processing',
        progress: 80,
        message: 'Extracting financial data...'
      });

      setExtractedText(result.text);
      setOcrResults(result.extractedData);

      setProcessingState({
        status: 'complete',
        progress: 100,
        message: `Test completed with ${result.confidence.toFixed(1)}% confidence`
      });

      // Draw detection overlay
      drawDetectionOverlay(imageData, result.text);

      // Pass extracted data to parent
      onOCRComplete(result.extractedData);

    } catch (error) {
      console.error('Test image processing error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'Test processing failed'
      });
      onError(error instanceof Error ? error.message : 'Test processing error');
    }
  };

  const drawDetectionOverlay = (imageUrl: string, text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = Math.min(img.width, 800);
      canvas.height = Math.min(img.height, 600);

      // Scale factors
      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Highlight detected financial data areas
      ctx.strokeStyle = '#39d0d8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      // Simulate detection areas for visual feedback
      const lines = text.split('\\n');
      lines.forEach((line, index) => {
        if (line.match(/\$[\d,]+|\d+\.?\d*%|\d{1,2}\/\d{1,2}\/\d{4}/)) {
          const y = (index + 1) * 20 * scaleY;
          const width = Math.min(line.length * 8 * scaleX, canvas.width - 20);
          ctx.strokeRect(10, y - 15, width, 18);
        }
      });
    };

    img.src = imageUrl;
  };


  const resetProcessor = () => {
    setProcessingState({
      status: 'idle',
      progress: 0,
      message: ''
    });
    setUploadedImage(null);
    setExtractedText('');
    setOcrResults(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'complete': return '#4CAF50';
      case 'error': return '#f44336';
      case 'processing': return '#ff9800';
      case 'uploading': return '#2196f3';
      default: return '#666';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'complete': return '✅';
      case 'error': return '❌';
      case 'processing': return '⚙️';
      case 'uploading': return '📤';
      default: return '📄';
    }
  };

  return (
    <div style={{
      border: '2px dashed #2a3b55',
      borderRadius: '8px',
      padding: '20px',
      margin: '16px 0',
      background: 'var(--panel)'
    }}>
      <h3>🔍 Sophisticated OCR Image Processor</h3>

      {/* File Upload Area */}
      <div style={{ marginBottom: '16px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={processingState.status === 'processing' || processingState.status === 'uploading'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processingState.status === 'processing' ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            opacity: processingState.status === 'processing' ? 0.6 : 1
          }}
        >
          📷 Select Financial Document Image
        </button>

        {processingState.status !== 'idle' && (
          <button
            onClick={resetProcessor}
            style={{
              padding: '8px 16px',
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
          padding: '12px',
          backgroundColor: 'rgba(57, 208, 216, 0.1)',
          border: `1px solid ${getStatusColor()}`,
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>{getStatusIcon()}</span>
            <span style={{ fontWeight: 'bold', color: getStatusColor() }}>
              {processingState.message}
            </span>
          </div>

          {processingState.status === 'processing' && (
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${processingState.progress}%`,
                height: '100%',
                backgroundColor: getStatusColor(),
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}
        </div>
      )}

      {/* Image Display and Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Image Preview */}
        {uploadedImage && (
          <div>
            <h4>📷 Uploaded Image</h4>
            <div style={{ position: 'relative' }}>
              <img
                src={uploadedImage}
                alt="Uploaded document"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              {processingState.status === 'complete' && (
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    maxWidth: '100%',
                    maxHeight: '300px',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Extracted Text */}
        {extractedText && (
          <div>
            <h4>📝 Extracted Text</h4>
            <div style={{
              backgroundColor: 'var(--ink)',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}>
              {extractedText}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Data Summary */}
      {ocrResults && (
        <div style={{ marginTop: '16px' }}>
          <h4>📊 Extracted Financial Data</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>

            {ocrResults.founders && ocrResults.founders.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(53, 199, 89, 0.1)',
                border: '1px solid #35c759',
                borderRadius: '6px',
                padding: '10px'
              }}>
                <strong>👥 Founders ({ocrResults.founders.length})</strong>
                {ocrResults.founders.map((founder, index: number) => (
                  <div key={index} style={{ fontSize: '12px', marginTop: '4px' }}>
                    {founder.name || 'Unnamed'}: ${founder.amount?.toLocaleString()} ({founder.date})
                  </div>
                ))}
              </div>
            )}

            {ocrResults.investors && ocrResults.investors.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(57, 208, 216, 0.1)',
                border: '1px solid #39d0d8',
                borderRadius: '6px',
                padding: '10px'
              }}>
                <strong>💼 Investors ({ocrResults.investors.length})</strong>
                {ocrResults.investors.map((investor, index: number) => (
                  <div key={index} style={{ fontSize: '12px', marginTop: '4px' }}>
                    {investor.name || 'Unnamed'}: ${investor.amount?.toLocaleString()} ({investor.date})
                  </div>
                ))}
              </div>
            )}

            {ocrResults.settings && Object.keys(ocrResults.settings).length > 0 && (
              <div style={{
                backgroundColor: 'rgba(255, 176, 32, 0.1)',
                border: '1px solid #ffb020',
                borderRadius: '6px',
                padding: '10px'
              }}>
                <strong>⚙️ Settings</strong>
                {Object.entries(ocrResults.settings).map(([key, value]) => (
                  <div key={key} style={{ fontSize: '12px', marginTop: '4px' }}>
                    {key}: {typeof value === 'number' && key.includes('Pct') ? `${value}%` :
                          typeof value === 'number' ? `$${value.toLocaleString()}` : String(value)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#9aa4b2', fontStyle: 'italic' }}>
        💡 Upload screenshots or photos of financial documents, spreadsheets, or statements.
        The OCR will extract amounts, dates, names, and percentages automatically.
      </div>

      {/* Test Suite */}
      <OCRTestSuite onTestImage={processTestImage} />
    </div>
  );
}