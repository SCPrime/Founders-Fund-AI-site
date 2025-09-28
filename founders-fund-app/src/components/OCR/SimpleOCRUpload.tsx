'use client';

import { useState, useRef } from 'react';
import { useAllocationStore } from '@/store/allocationStore';

interface OCRResult {
  walletSize: number;
  unrealized: number;
  ocrText?: string;
  aiResponse?: string;
}

interface OCRError {
  error: string;
  details?: string;
}

export default function SimpleOCRUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get store actions
  const updateWalletSize = useAllocationStore((state) => state.updateWalletSize);
  const updateUnrealizedPnl = useAllocationStore((state) => state.updateUnrealizedPnl);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      console.log('Uploading file for OCR processing:', file.name);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OCR processing failed');
      }

      console.log('OCR processing successful:', data);
      setResult(data);

    } catch (err) {
      console.error('OCR upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const applyResults = () => {
    if (!result) return;

    if (result.walletSize > 0) {
      updateWalletSize(result.walletSize);
      console.log('Applied wallet size:', result.walletSize);
    }

    if (result.unrealized !== 0) {
      updateUnrealizedPnl(result.unrealized);
      console.log('Applied unrealized P&L:', result.unrealized);
    }

    // Clear results after applying
    setResult(null);
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="panel">
      <h3>📸 Screenshot Upload & OCR</h3>
      <p>Upload a screenshot of your account balance to automatically extract wallet size and unrealized P&L.</p>

      {/* Upload Area */}
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          backgroundColor: dragOver ? 'var(--background-secondary)' : 'transparent',
          transition: 'all 0.2s ease',
          marginBottom: '20px'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div>
            <div className="loading-spinner" style={{ margin: '0 auto 10px' }}></div>
            <p>Processing image with OCR and AI...</p>
            <small>This may take 10-30 seconds</small>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
            <p><strong>Click to upload</strong> or drag & drop an image</p>
            <small>Supports PNG, JPG, GIF, WebP</small>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{
          padding: '12px',
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--error)',
          borderRadius: '4px',
          color: 'var(--error)',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="results-panel" style={{
          padding: '20px',
          backgroundColor: 'var(--background-secondary)',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4>📊 Extracted Data</h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label>💰 Wallet Size</label>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--success)'
              }}>
                ${result.walletSize.toLocaleString()}
              </div>
            </div>

            <div>
              <label>📈 Unrealized P&L</label>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: result.unrealized >= 0 ? 'var(--success)' : 'var(--error)'
              }}>
                {result.unrealized >= 0 ? '+' : ''}${result.unrealized.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              className="btn btn-primary"
              onClick={applyResults}
              style={{ flex: 1 }}
            >
              ✅ Apply to Portfolio
            </button>
            <button
              className="btn btn-secondary"
              onClick={clearResults}
            >
              ❌ Clear
            </button>
          </div>

          {/* Debug Info (collapsible) */}
          <details style={{ marginTop: '15px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '14px' }}>
              🔍 Debug Information
            </summary>
            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              backgroundColor: 'var(--background)',
              padding: '10px',
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              <div><strong>AI Response:</strong></div>
              <pre style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                {result.aiResponse || 'No AI response'}
              </pre>

              <div><strong>OCR Text (first 300 chars):</strong></div>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
                {result.ocrText?.substring(0, 300) || 'No OCR text'}
                {(result.ocrText?.length || 0) > 300 && '...'}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions" style={{
        fontSize: '14px',
        color: 'var(--text-secondary)',
        marginTop: '20px'
      }}>
        <h5>💡 Tips for Best Results:</h5>
        <ul style={{ marginLeft: '20px' }}>
          <li>Use clear, high-resolution screenshots</li>
          <li>Make sure portfolio balance and unrealized P&L are visible</li>
          <li>Avoid blurry or cropped images</li>
          <li>Screenshots from popular trading platforms work best</li>
        </ul>
      </div>

      <style jsx>{`
        .upload-area.drag-over {
          border-color: var(--accent) !important;
          background-color: var(--accent-bg) !important;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          animation: fadeIn 0.3s ease;
        }

        .results-panel {
          animation: slideIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}