'use client';

import { useState, useRef } from 'react';
import { useCalculator } from '@/context/CalculatorContext';
import { preprocessImageForOCR, type ProcessingResult } from '@/utils/imagePreprocessor';

interface ExtractedFields {
  winStart?: string;
  winEnd?: string;
  walletSize?: number;
  realizedProfit?: number;
  moonbagReal?: number;
  moonbagUnreal?: number;
  includeUnreal?: 'yes' | 'no';
  moonbagFounderPct?: number;
  mgmtFeePct?: number;
  entryFeePct?: number;
  feeReducesInvestor?: 'yes' | 'no';
  founderCount?: number;
  drawPerFounder?: number;
  applyDraws?: 'yes' | 'no';
  domLeadPct?: number;
}

interface OCRResponse {
  success: boolean;
  extractedFields: ExtractedFields;
  fieldsCaptured: number;
  message: string;
  processingSteps?: string[];
  estimatedQuality?: number;
  fieldMappings?: {
    'Left side of graph': {
      'Total Wallet Size/Total Value': string;
      'Unrealized PNL': string;
      'Total Balance': string;
    };
    'Right side of graph': {
      'Realized PNL': string;
      'Total Transactions/TXNS': string;
      'Total Trades': string;
    };
    'Timestamp': {
      'Date from image': string;
    };
  };
}

export default function EnhancedOCRUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculator = useCalculator();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setProcessingSteps(['Starting image processing...']);

    try {
      // Step 1: Preview the original image
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Step 2: Preprocess image for better OCR
      setProcessingSteps(prev => [...prev, 'Preprocessing image for optimal OCR...']);

      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target!.result as string);
        reader.readAsDataURL(file);
      });

      let processingResult: ProcessingResult | null = null;

      // Only preprocess in browser environment
      if (typeof window !== 'undefined') {
        try {
          processingResult = await preprocessImageForOCR(imageDataUrl, {
            enhanceContrast: true,
            adjustBrightness: true,
            removeNoise: true,
            sharpenText: true,
            normalizeSize: true,
            targetWidth: 1200
          });
          setProcessingSteps(prev => [...prev, ...processingResult!.processingSteps]);
        } catch (preprocessError) {
          console.warn('Image preprocessing failed, using original:', preprocessError);
          setProcessingSteps(prev => [...prev, 'Using original image (preprocessing failed)']);
        }
      }

      // Step 3: Perform enhanced OCR using Tesseract.js with better config
      setProcessingSteps(prev => [...prev, 'Running enhanced OCR for financial data...']);

      // Dynamic import for client-side only
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');

      // Enhanced Tesseract configuration for financial documents
      await worker.setParameters({
        tessedit_pageseg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%-/$:()/ \n\t',
        tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine
        preserve_interword_spaces: '1',
      });

      const imageToProcess = processingResult?.processedImageData || imageDataUrl;

      const { data } = await worker.recognize(imageToProcess);

      await worker.terminate();

      setProcessingSteps(prev => [...prev, `OCR completed. Confidence: ${data.confidence.toFixed(1)}%`]);

      // Step 4: Send to backend for structured data extraction
      setProcessingSteps(prev => [...prev, 'Extracting structured financial data...']);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ocrText', data.text);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: OCRResponse = await response.json();

      if (result.success) {
        setOcrResult({
          ...result,
          processingSteps: processingSteps,
          estimatedQuality: processingResult?.estimatedQuality || 85 // Enhanced Tesseract with preprocessing
        });
        setProcessingSteps(prev => [...prev, `Successfully extracted ${result.fieldsCaptured} fields from financial data`]);

        // Step 5: Auto-populate calculator fields
        applyExtractedFields(result.extractedFields);
        setProcessingSteps(prev => [...prev, 'Calculator fields updated successfully']);
      } else {
        throw new Error('OCR processing failed');
      }

    } catch (err) {
      console.error('OCR Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setProcessingSteps(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyExtractedFields = (fields: ExtractedFields) => {
    // Apply extracted fields to calculator context
    if (fields.winStart) calculator.setWinStart(fields.winStart);
    if (fields.winEnd) calculator.setWinEnd(fields.winEnd);
    if (fields.walletSize !== undefined) calculator.setWalletSize(fields.walletSize);
    if (fields.realizedProfit !== undefined) calculator.setRealizedProfit(fields.realizedProfit);
    if (fields.moonbagReal !== undefined) calculator.setMoonbagReal(fields.moonbagReal);
    if (fields.moonbagUnreal !== undefined) calculator.setMoonbagUnreal(fields.moonbagUnreal);
    if (fields.includeUnreal) calculator.setIncludeUnreal(fields.includeUnreal);
    if (fields.moonbagFounderPct !== undefined) calculator.setMoonbagFounderPct(fields.moonbagFounderPct);
    if (fields.mgmtFeePct !== undefined) calculator.setMgmtFeePct(fields.mgmtFeePct);
    if (fields.entryFeePct !== undefined) calculator.setEntryFeePct(fields.entryFeePct);
    if (fields.feeReducesInvestor) calculator.setFeeReducesInvestor(fields.feeReducesInvestor);
    if (fields.founderCount !== undefined) calculator.setFounderCount(fields.founderCount);
    if (fields.drawPerFounder !== undefined) calculator.setDrawPerFounder(fields.drawPerFounder);
    if (fields.applyDraws) calculator.setApplyDraws(fields.applyDraws);
    if (fields.domLeadPct !== undefined) calculator.setDomLeadPct(fields.domLeadPct);
  };

  return (
    <div className="enhanced-ocr-upload">
      <div className="upload-section">
        <h3>Enhanced Financial Document OCR</h3>
        <p>Upload a trading dashboard screenshot to automatically extract and populate calculator fields with advanced OCR processing</p>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isProcessing}
          ref={fileInputRef}
          className="file-input"
        />

        {imagePreview && (
          <div className="image-preview">
            <h4>Original Image:</h4>
            <img
              src={imagePreview}
              alt="Uploaded document"
              style={{ maxWidth: '300px', maxHeight: '200px', objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="processing-status">
          <h4>Processing Steps:</h4>
          <div className="steps-list">
            {processingSteps.map((step, index) => (
              <div key={index} className="step">
                <span className="step-number">{index + 1}.</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}

      {ocrResult && (
        <div className="ocr-results">
          <h4>Extraction Results:</h4>
          <div className="results-summary">
            <p><strong>Fields Captured:</strong> {ocrResult.fieldsCaptured}</p>
            <p><strong>Processing Quality:</strong> {ocrResult.estimatedQuality}%</p>
            <p><strong>Status:</strong> {ocrResult.message}</p>
          </div>

          <div className="extracted-fields">
            <h5>Extracted Fields:</h5>
            <div className="fields-grid">
              {Object.entries(ocrResult.extractedFields).map(([key, value]) => (
                <div key={key} className="field-item">
                  <span className="field-name">{key}:</span>
                  <span className="field-value">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .enhanced-ocr-upload {
          padding: 20px;
          border: 2px dashed #ddd;
          border-radius: 8px;
          margin: 20px 0;
        }

        .upload-section h3 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .file-input {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .image-preview {
          margin: 15px 0;
          text-align: center;
        }

        .processing-status {
          margin: 20px 0;
          padding: 15px;
          background: #f0f8ff;
          border-radius: 6px;
        }

        .steps-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .step {
          display: flex;
          margin: 5px 0;
          padding: 5px;
        }

        .step-number {
          font-weight: bold;
          margin-right: 8px;
          color: #007bff;
        }

        .step-text {
          flex: 1;
        }

        .error-message {
          margin: 20px 0;
          padding: 15px;
          background: #ffe6e6;
          border: 1px solid #ff9999;
          border-radius: 6px;
          color: #cc0000;
        }

        .ocr-results {
          margin: 20px 0;
          padding: 15px;
          background: #e8f5e8;
          border-radius: 6px;
        }

        .results-summary p {
          margin: 5px 0;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-top: 10px;
        }

        .field-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .field-name {
          font-weight: bold;
          color: #555;
        }

        .field-value {
          color: #007bff;
        }
      `}</style>
    </div>
  );
}