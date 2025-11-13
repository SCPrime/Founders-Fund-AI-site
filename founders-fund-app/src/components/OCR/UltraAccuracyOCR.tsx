'use client';

import { ProcessingResult, UltraImageProcessor } from '@/utils/ultraImageProcessor';
import React, { useRef, useState } from 'react';

interface UltraAccuracyOCRProps {
  onExtractComplete: (data: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

interface ProcessingState {
  status: 'idle' | 'preprocessing' | 'ensemble' | 'validation' | 'complete' | 'error';
  progress: number;
  message: string;
  currentStep: string;
}

interface UltraResult {
  data: Record<string, unknown>;
  confidence: number;
  modelConsensus: number;
  validationScore: number;
  processingDetails: string[];
  modelResults: Record<string, unknown>[];
}

export default function UltraAccuracyOCR({ onExtractComplete, onError }: UltraAccuracyOCRProps) {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: '',
    currentStep: '',
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
  const [ultraResult, setUltraResult] = useState<UltraResult | null>(null);
  const [imageQuality, setImageQuality] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ultraProcessor = useRef<UltraImageProcessor | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      ultraProcessor.current = new UltraImageProcessor();
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

    const maxSize = 15 * 1024 * 1024; // 15MB for ultra-processing
    if (file.size > maxSize) {
      onError('File too large. Maximum size is 15MB for ultra-accuracy processing.');
      return;
    }

    processImageFileUltra(file);
  };

  const processImageFileUltra = async (file: File) => {
    try {
      setProcessingState({
        status: 'preprocessing',
        progress: 5,
        message: 'Initializing ultra-accuracy OCR pipeline...',
        currentStep: 'Initialization',
      });

      // Convert to data URL
      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target!.result as string);
        reader.readAsDataURL(file);
      });

      setUploadedImage(imageDataUrl);

      // PHASE 1: Ultra-precision image preprocessing
      setProcessingState((prev) => ({
        ...prev,
        progress: 15,
        message: 'Phase 1: Ultra-precision image preprocessing...',
        currentStep: 'Advanced Image Enhancement',
      }));

      let processingResult: ProcessingResult | null = null;
      if (ultraProcessor.current) {
        processingResult = await ultraProcessor.current.processForUltraOCR(imageDataUrl, {
          targetDPI: 300,
          enhanceContrast: true,
          denoiseLevel: 2,
          sharpenStrength: 1.8,
          binarizeThreshold: 0.5,
          morphologyOperations: true,
        });

        setPreprocessedImage(processingResult.processedImageData);
        setImageQuality(processingResult.qualityMetrics as unknown as Record<string, unknown>);
      }

      // PHASE 2: Multi-model ensemble extraction
      setProcessingState((prev) => ({
        ...prev,
        status: 'ensemble',
        progress: 40,
        message: 'Phase 2: Multi-model AI ensemble extraction...',
        currentStep: 'GPT-4o + Claude + Validation',
      }));

      const formData = new FormData();
      formData.append('image', file);
      if (processingResult) {
        formData.append('preprocessedQuality', JSON.stringify(processingResult.qualityMetrics));
        formData.append('estimatedAccuracy', processingResult.estimatedAccuracy.toString());
      }

      const response = await fetch('/api/ultra-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Ultra-OCR API error: ${response.status}`);
      }

      setProcessingState((prev) => ({
        ...prev,
        status: 'validation',
        progress: 85,
        message: 'Phase 3: Advanced validation and consensus...',
        currentStep: 'Mathematical Validation',
      }));

      const result: UltraResult = await response.json();

      // PHASE 3: Final validation and confidence calculation
      setProcessingState((prev) => ({
        ...prev,
        progress: 95,
        message: 'Finalizing ultra-accuracy results...',
        currentStep: 'Confidence Calculation',
      }));

      // Enhanced confidence based on image quality
      let enhancedConfidence = result.confidence;
      if (processingResult) {
        const qualityBonus = Math.min(10, processingResult.estimatedAccuracy - 80);
        enhancedConfidence = Math.min(98, result.confidence + qualityBonus);
      }

      const finalResult = {
        ...result,
        confidence: enhancedConfidence,
        imageQuality: processingResult?.qualityMetrics,
        preprocessingSteps: processingResult?.processingSteps || [],
      };

      setProcessingState({
        status: 'complete',
        progress: 100,
        message: `Ultra-accuracy extraction complete! Confidence: ${enhancedConfidence.toFixed(1)}%`,
        currentStep: 'Complete',
      });

      setUltraResult(finalResult);
      onExtractComplete(finalResult);
    } catch (error) {
      console.error('Ultra-accuracy OCR error:', error);
      setProcessingState({
        status: 'error',
        progress: 0,
        message: 'Ultra-accuracy OCR processing failed',
        currentStep: 'Error',
      });
      onError(error instanceof Error ? error.message : 'Unknown ultra-OCR error');
    }
  };

  const resetProcessor = () => {
    setProcessingState({
      status: 'idle',
      progress: 0,
      message: '',
      currentStep: '',
    });
    setUploadedImage(null);
    setPreprocessedImage(null);
    setUltraResult(null);
    setImageQuality(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'complete':
        return '#4CAF50';
      case 'error':
        return '#f44336';
      case 'preprocessing':
        return '#2196f3';
      case 'ensemble':
        return '#ff9800';
      case 'validation':
        return '#9c27b0';
      default:
        return '#666';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'complete':
        return '🎯';
      case 'error':
        return '❌';
      case 'preprocessing':
        return '🔧';
      case 'ensemble':
        return '🤖';
      case 'validation':
        return '✅';
      default:
        return '🚀';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return '#4CAF50'; // Green
    if (confidence >= 85) return '#ff9800'; // Orange
    if (confidence >= 70) return '#2196f3'; // Blue
    return '#f44336'; // Red
  };

  return (
    <div
      style={{
        border: '3px solid #4CAF50',
        borderRadius: '16px',
        padding: '28px',
        margin: '20px 0',
        background: 'linear-gradient(135deg, var(--panel) 0%, rgba(76, 175, 80, 0.05) 100%)',
        boxShadow: '0 8px 32px rgba(76, 175, 80, 0.2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '32px' }}>🎯</span>
        <div>
          <h2 style={{ margin: 0, color: '#4CAF50', fontSize: '24px' }}>Ultra-Accuracy OCR</h2>
          <p style={{ margin: 0, color: '#9aa4b2', fontSize: '14px' }}>
            95-98% confidence target • Multi-model ensemble • Advanced validation
          </p>
        </div>
      </div>

      {/* File Upload */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="ultra-ocr-file-input" className="sr-only">
          Upload image for ultra-accuracy OCR processing
        </label>
        <input
          id="ultra-ocr-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          aria-label="Upload image for ultra-accuracy OCR processing"
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={
            processingState.status !== 'idle' &&
            processingState.status !== 'complete' &&
            processingState.status !== 'error'
          }
          style={{
            padding: '16px 32px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            opacity:
              processingState.status !== 'idle' &&
              processingState.status !== 'complete' &&
              processingState.status !== 'error'
                ? 0.6
                : 1,
            boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          🚀 Upload for Ultra-Accuracy Analysis
        </button>

        {processingState.status !== 'idle' && (
          <button
            onClick={resetProcessor}
            style={{
              padding: '12px 24px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: '16px',
            }}
          >
            🔄 Reset
          </button>
        )}
      </div>

      {/* Processing Status */}
      {processingState.status !== 'idle' && (
        <div
          style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: `2px solid ${getStatusColor()}`,
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>{getStatusIcon()}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: getStatusColor(), fontSize: '18px' }}>
                {processingState.message}
              </div>
              <div style={{ fontSize: '14px', color: '#9aa4b2', marginTop: '4px' }}>
                {processingState.currentStep}
              </div>
            </div>
            <div style={{ fontSize: '20px', color: getStatusColor(), fontWeight: 'bold' }}>
              {processingState.progress}%
            </div>
          </div>

          {(processingState.status === 'preprocessing' ||
            processingState.status === 'ensemble' ||
            processingState.status === 'validation') && (
            <div
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#334155',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${processingState.progress}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}99)`,
                  transition: 'width 0.5s ease',
                  borderRadius: '6px',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Image Comparison */}
      {uploadedImage && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: preprocessedImage ? 'repeat(2, 1fr)' : '1fr',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📷 Original Image
            </h4>
            <img
              src={uploadedImage}
              alt="Original dashboard"
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                border: '2px solid #334155',
                borderRadius: '8px',
              }}
            />
          </div>

          {preprocessedImage && (
            <div>
              <h4
                style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                🔧 Ultra-Enhanced
                {imageQuality && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#4CAF50',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    Quality: {(imageQuality.textClarity as number)?.toFixed(1)}%
                  </span>
                )}
              </h4>
              <img
                src={preprocessedImage}
                alt="Ultra-enhanced dashboard"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(76, 175, 80, 0.2)',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Ultra Results */}
      {ultraResult && (
        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, color: '#4CAF50' }}>🎯 Ultra-Accuracy Results</h3>
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: getConfidenceColor(ultraResult.confidence),
                color: 'white',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              {ultraResult.confidence.toFixed(1)}% Confidence
            </div>
          </div>

          {/* Data Grid */}
          <div
            style={{
              backgroundColor: 'rgba(76, 175, 80, 0.05)',
              border: '2px solid #4CAF50',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              {Object.entries(ultraResult.data).map(([key, value]) => {
                if (key === 'timestamp' || key === 'extractionConfidence') return null;

                const isMonetary =
                  key.toLowerCase().includes('value') ||
                  key.toLowerCase().includes('pnl') ||
                  key.toLowerCase().includes('balance');

                return (
                  <div
                    key={key}
                    style={{
                      backgroundColor: 'var(--panel)',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: '#666',
                        textTransform: 'uppercase',
                        marginBottom: '8px',
                      }}
                    >
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </div>
                    <div
                      style={{
                        fontSize: '20px',
                        color: '#333',
                        fontWeight: 'bold',
                      }}
                    >
                      {value === null || value === undefined
                        ? 'N/A'
                        : isMonetary
                          ? `$${Number(value).toLocaleString()}`
                          : typeof value === 'number'
                            ? Number(value).toLocaleString()
                            : String(value)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {ultraResult.modelConsensus?.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Model Consensus</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>
                  {ultraResult.validationScore?.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Validation Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                  {ultraResult.modelResults?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>AI Models Used</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '20px',
          fontSize: '12px',
          color: '#9aa4b2',
          fontStyle: 'italic',
          textAlign: 'center',
        }}
      >
        🎯 Ultra-accuracy system combines multiple AI models, advanced image preprocessing,
        mathematical validation, and consensus algorithms to achieve 95-98% confidence targets.
      </div>
    </div>
  );
}
