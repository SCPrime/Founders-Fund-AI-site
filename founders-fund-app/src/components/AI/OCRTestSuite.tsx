'use client';

import React, { useState } from 'react';

interface OCRTestSuiteProps {
  onTestImage: (imageData: string, description: string) => void;
}

export default function OCRTestSuite({ onTestImage }: OCRTestSuiteProps) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  // Sample test images with financial data (base64 encoded)
  const testImages = [
    {
      id: 'spreadsheet',
      name: '📊 Financial Spreadsheet',
      description: 'Sample spreadsheet with investor data, amounts, and dates',
      data: generateTestImage('spreadsheet')
    },
    {
      id: 'statement',
      name: '📄 Investment Statement',
      description: 'Mock investment statement with fees and percentages',
      data: generateTestImage('statement')
    },
    {
      id: 'handwritten',
      name: '✍️ Handwritten Notes',
      description: 'Handwritten financial notes with amounts and names',
      data: generateTestImage('handwritten')
    },
    {
      id: 'receipt',
      name: '🧾 Transaction Receipt',
      description: 'Receipt with transaction amounts and dates',
      data: generateTestImage('receipt')
    }
  ];

  function generateTestImage(type: string): string {
    // Create a canvas with sample financial data
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text styles
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';

    let y = 40;
    const lineHeight = 25;

    switch (type) {
      case 'spreadsheet':
        ctx.font = 'bold 18px Arial';
        ctx.fillText('FOUNDERS FUND INVESTMENT TRACKER', 20, y);
        y += 40;

        ctx.font = '14px Arial';
        ctx.fillText('Name                Date           Amount      Type', 20, y);
        y += lineHeight;
        ctx.fillText('________________________________________________', 20, y);
        y += lineHeight;

        ctx.fillText('Founders            2025-07-10     $5,000      Seed Capital', 20, y);
        y += lineHeight;
        ctx.fillText('Laura Johnson       2025-07-22     $5,000      Investment', 20, y);
        y += lineHeight;
        ctx.fillText('Laura Johnson       2025-07-31     $5,000      Investment', 20, y);
        y += lineHeight;
        ctx.fillText('Laura Johnson       2025-08-25     $2,500      Investment', 20, y);
        y += lineHeight;
        ctx.fillText('Laura Johnson       2025-09-06     $2,500      Investment', 20, y);
        y += lineHeight;
        ctx.fillText('Damon Smith         2025-08-02     $5,000      Investment', 20, y);
        y += lineHeight * 2;

        ctx.fillText('Total Investments: $25,000', 20, y);
        y += lineHeight;
        ctx.fillText('Realized Profit: $20,000', 20, y);
        y += lineHeight;
        ctx.fillText('Unrealized Profit: $50,000', 20, y);
        y += lineHeight;
        ctx.fillText('Transaction Stats: 15/5 (75% win rate)', 20, y);
        y += lineHeight;
        ctx.fillText('Management Fee: 20%', 20, y);
        y += lineHeight;
        ctx.fillText('Entry Fee: 10%', 20, y);
        break;

      case 'statement':
        ctx.font = 'bold 18px Arial';
        ctx.fillText('INVESTMENT FUND STATEMENT', 20, y);
        y += 40;

        ctx.font = '14px Arial';
        ctx.fillText('Statement Date: September 19, 2025', 20, y);
        y += lineHeight * 2;

        ctx.fillText('Fund Performance Summary:', 20, y);
        y += lineHeight;
        ctx.fillText('• Total Wallet Size: $25,000', 30, y);
        y += lineHeight;
        ctx.fillText('• Realized Profit: $20,000', 30, y);
        y += lineHeight;
        ctx.fillText('• Unrealized Profit (Moonbag): $50,000', 30, y);
        y += lineHeight;
        ctx.fillText('• Trading Performance: 15 wins / 5 losses', 30, y);
        y += lineHeight;
        ctx.fillText('• Management Fee Rate: 20%', 30, y);
        y += lineHeight;
        ctx.fillText('• Entry Fee Rate: 10%', 30, y);
        y += lineHeight * 2;

        ctx.fillText('Recent Transactions:', 20, y);
        y += lineHeight;
        ctx.fillText('• 07/22/2025 - Laura - $5,000 contribution', 30, y);
        y += lineHeight;
        ctx.fillText('• 08/02/2025 - Damon - $5,000 contribution', 30, y);
        y += lineHeight;
        ctx.fillText('• 09/06/2025 - Laura - $2,500 contribution', 30, y);
        break;

      case 'handwritten':
        ctx.font = '16px cursive';
        ctx.fillText('Investment Notes', 20, y);
        y += 40;

        ctx.font = '14px cursive';
        ctx.fillText('Laura: $5,000 on 7/22/2025', 20, y);
        y += lineHeight;
        ctx.fillText('Laura: $5,000 on 7/31/2025', 20, y);
        y += lineHeight;
        ctx.fillText('Damon: $5,000 on 8/02/2025', 20, y);
        y += lineHeight;
        ctx.fillText('Laura: $2,500 on 8/25/2025', 20, y);
        y += lineHeight;
        ctx.fillText('Laura: $2,500 on 9/06/2025', 20, y);
        y += lineHeight * 2;

        ctx.fillText('Fees:', 20, y);
        y += lineHeight;
        ctx.fillText('Management: 20%', 30, y);
        y += lineHeight;
        ctx.fillText('Entry: 10%', 30, y);
        break;

      case 'receipt':
        ctx.font = 'bold 16px monospace';
        ctx.fillText('*** TRANSACTION RECEIPT ***', 20, y);
        y += 30;

        ctx.font = '12px monospace';
        ctx.fillText('Date: 2025-09-19', 20, y);
        y += lineHeight;
        ctx.fillText('Time: 14:30:22', 20, y);
        y += lineHeight * 2;

        ctx.fillText('INVESTMENT FUND DEPOSIT', 20, y);
        y += lineHeight;
        ctx.fillText('Investor: Laura Johnson', 20, y);
        y += lineHeight;
        ctx.fillText('Amount: $2,500.00', 20, y);
        y += lineHeight;
        ctx.fillText('Entry Fee (10%): $250.00', 20, y);
        y += lineHeight;
        ctx.fillText('Net Investment: $2,250.00', 20, y);
        y += lineHeight * 2;

        ctx.fillText('Fund Details:', 20, y);
        y += lineHeight;
        ctx.fillText('Management Fee: 20%', 20, y);
        y += lineHeight;
        ctx.fillText('Total Fund Size: $25,000', 20, y);
        break;
    }

    return canvas.toDataURL('image/png');
  }

  const handleTestImage = (imageId: string) => {
    const testImage = testImages.find(img => img.id === imageId);
    if (testImage) {
      setSelectedTest(imageId);
      onTestImage(testImage.data, testImage.description);
    }
  };

  return (
    <div style={{
      border: '1px solid #39d0d8',
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      backgroundColor: 'rgba(57, 208, 216, 0.05)'
    }}>
      <h4>🧪 OCR Test Suite</h4>
      <p style={{ fontSize: '14px', color: '#9aa4b2', marginBottom: '16px' }}>
        Test the OCR functionality with various types of financial documents:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
        {testImages.map((image) => (
          <div key={image.id} style={{
            border: selectedTest === image.id ? '2px solid #39d0d8' : '1px solid #334155',
            borderRadius: '6px',
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: selectedTest === image.id ? 'rgba(57, 208, 216, 0.1)' : 'var(--panel)',
            transition: 'all 0.2s ease'
          }}
          onClick={() => handleTestImage(image.id)}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{image.name}</div>
            <div style={{ fontSize: '12px', color: '#9aa4b2' }}>{image.description}</div>
            {selectedTest === image.id && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#39d0d8' }}>
                ✅ Selected for testing
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#9aa4b2' }}>
        💡 Click on any test image above to automatically process it with OCR and see the extraction results.
        Each test image contains different types of financial data to validate the OCR accuracy.
      </div>

      {selectedTest && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--ink)', borderRadius: '4px' }}>
          <strong>Current Test:</strong> {testImages.find(img => img.id === selectedTest)?.name}
        </div>
      )}
    </div>
  );
}