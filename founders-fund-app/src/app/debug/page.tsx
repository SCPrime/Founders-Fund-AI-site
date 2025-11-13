'use client';

import React, { useState, useEffect } from 'react';
import DebugOCR from '@/components/OCR/DebugOCR';
import WorkingCalculatorTest from '@/components/WorkingCalculatorTest';
import { CalculatorProvider } from '@/context/CalculatorContext';
import { OCRProvider } from '@/context/OCRContext';

export default function DebugPage() {
  const [testResults, setTestResults] = useState<any | null>(null);

  useEffect(() => {
    // Load test results to show expected behavior
    fetch('/api/test-debug')
      .then(res => res.json())
      .then(data => setTestResults(data))
      .catch(err => console.error('Failed to load test results:', err));
  }, []);

  return (
    <CalculatorProvider>
      <OCRProvider>
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#4CAF50', marginBottom: '20px' }}>🔍 Debug System</h1>

      {/* Working Calculator Test */}
      <div style={{ marginBottom: '30px' }}>
        <WorkingCalculatorTest />
      </div>

      <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>📸 OCR Debug System</h2>

      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
        <h2>How to Use This Debug System:</h2>
        <ol>
          <li><strong>Upload your trading dashboard image</strong> using the debug tool below</li>
          <li><strong>Review the raw text extraction</strong> to see what the AI can read</li>
          <li><strong>Check the structured data</strong> to see which fields are found</li>
          <li><strong>Examine the extraction log</strong> to understand where each value comes from</li>
          <li><strong>Review validation results</strong> to see confidence calculation</li>
        </ol>
      </div>

      {/* Expected Results */}
      {testResults && (
        <div style={{ marginBottom: '30px' }}>
          <h2>📊 Expected Results (Based on Your Dashboard Description)</h2>
          <div style={{
            backgroundColor: '#e8f5e8',
            border: '2px solid #4CAF50',
            borderRadius: '12px',
            padding: '20px'
          }}>

            {/* Raw Text Section */}
            <div style={{ marginBottom: '20px' }}>
              <h3>📝 Expected Raw Text:</h3>
              <div style={{
                backgroundColor: 'var(--ink)',
                border: '1px solid var(--line)',
                padding: '12px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '14px',
                whiteSpace: 'pre-line',
                color: 'var(--text)'
              }}>
                {testResults.expectedResults.rawText}
              </div>
            </div>

            {/* Structured Data Section */}
            <div style={{ marginBottom: '20px' }}>
              <h3>📊 Expected Structured Data:</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {Object.entries(testResults.expectedResults.extractedData).map(([key, value]) => (
                  <div key={key} style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{
                      fontWeight: 'bold',
                      fontSize: '12px',
                      color: '#666',
                      textTransform: 'uppercase'
                    }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div style={{ fontSize: '16px', color: '#333', fontWeight: 'bold' }}>
                      {typeof value === 'number' && (key.includes('Value') || key.includes('PNL') || key.includes('Balance')) ?
                        `$${Number(value).toLocaleString()}` :
                        String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <h3>🎯 Expected Confidence Breakdown:</h3>
              <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  <div>
                    <strong>Base:</strong> {testResults.confidenceBreakdown.baseConfidence}%
                  </div>
                  <div>
                    <strong>Fields Found:</strong> +{testResults.confidenceBreakdown.fieldsBonus}%
                  </div>
                  <div>
                    <strong>Math Valid:</strong> +{testResults.confidenceBreakdown.mathValidation}%
                  </div>
                  <div>
                    <strong>Win/Loss Valid:</strong> +{testResults.confidenceBreakdown.winLossValidation}%
                  </div>
                  <div>
                    <strong>Realistic:</strong> +{testResults.confidenceBreakdown.realisticValues}%
                  </div>
                  <div style={{
                    gridColumn: '1 / -1',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#4CAF50',
                    textAlign: 'center',
                    marginTop: '8px'
                  }}>
                    <strong>Final: {testResults.confidenceBreakdown.finalCapped}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Extraction Log */}
            <div>
              <h3>🔍 Expected Extraction Log:</h3>
              <ul style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {testResults.expectedResults.extractionLog.map((log: string, index: number) => (
                  <li key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                    {log}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Debug OCR Component */}
      <div>
        <h2>🔧 Debug Your Image:</h2>
        <DebugOCR
          onExtractComplete={(data) => {
            console.log('Debug extraction completed:', data);
          }}
          onError={(error) => {
            console.error('Debug extraction error:', error);
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#fff3e0',
        borderRadius: '8px',
        border: '2px solid #ff9800'
      }}>
        <h3>🎯 What to Look For:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <h4>✅ High Confidence (90%+)</h4>
            <ul>
              <li>All major fields extracted correctly</li>
              <li>Math validation passes</li>
              <li>Win/loss totals match</li>
              <li>Values are realistic</li>
            </ul>
          </div>
          <div>
            <h4>⚠️ Medium Confidence (70-89%)</h4>
            <ul>
              <li>Most fields found but some missing</li>
              <li>Minor validation issues</li>
              <li>OCR reading errors on some numbers</li>
            </ul>
          </div>
          <div>
            <h4>❌ Low Confidence (&lt;70%)</h4>
            <ul>
              <li>Many fields missing or incorrect</li>
              <li>Math validation fails</li>
              <li>Poor image quality</li>
              <li>Need better preprocessing</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: 'var(--ink)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        fontSize: '14px',
        color: 'var(--muted)'
      }}>
        <strong>Debug Process:</strong> Upload your trading dashboard → See raw text → Check structured extraction → Review confidence calculation → Identify issues
      </div>
        </div>
      </OCRProvider>
    </CalculatorProvider>
  );
}