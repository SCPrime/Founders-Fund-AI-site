'use client';

import { useAllocationStore } from '@/store/allocationStore';
import { useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';

export default function StatusBar() {
  const { recompute, saveSnapshot, lastComputeTime } = useAllocationStore();

  const [autoSave, setAutoSave] = useState(true);
  const [calcTime, setCalcTime] = useState('');
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const handleReseed = () => {
    console.log('Reseed defaults');
  };

  const handleRecalc = () => {
    recompute();
    setCalcTime(lastComputeTime || 'Calculating...');
  };

  const handleSelfTest = () => {
    console.log('Self-Test');
  };

  const handleSaveSnap = () => {
    saveSnapshot();
    setMessage('Snapshot saved');
  };

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleScreenshot = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Uploaded screenshot', file.name);
      setOcrText('Processing...');
      const form = new FormData();
      form.append('file', file);

      fetch('/api/ocr', {
        method: 'POST',
        body: form,
      })
        .then(async res => {
          const json = await res.json();
          if (!res.ok) {
            setOcrText(`OCR error: ${json?.error || res.statusText}`);
            console.error('OCR error', json);
            return;
          }
          setOcrText(json.text || json.error || 'No text recognized');
          if (json.processed_png_base64) {
            setProcessedImage(`data:image/png;base64,${json.processed_png_base64}`);
          } else {
            setProcessedImage(null);
          }
        })
        .catch(err => {
          console.error('OCR request failed', err);
          setOcrText('OCR request failed');
        });
    }
  };

  const handleConfirmSave = async () => {
    if (!analysis) return;
    try {
      const res = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis }),
      });
      if (res.ok) {
        setMessage('Analysis saved successfully');
      } else {
        setMessage('Failed to save analysis');
      }
    } catch (err) {
      console.error('Save analysis error', err);
      setMessage('Failed to save analysis');
    } finally {
      setAnalysis(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="status">
      <span className="dot ok" />
      <b>Calculator ready.</b>
      <span id="seedMsg" className="small">
        Seeding defaults…
      </span>
      <button className="btn" onClick={handleReseed}>
        Force re-seed
      </button>
      <button className="btn" onClick={handleRecalc}>
        Recalculate
      </button>
      <button className="btn" onClick={handleSelfTest}>
        Self-Test
      </button>
      <label className="small">
        <input
          type="checkbox"
          checked={autoSave}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAutoSave(e.target.checked)}
        />{' '}
        Auto-save on Recalculate
      </label>
      <button className="btn" onClick={handleSaveSnap}>
        Save snapshot now
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        style={{ display: 'none' }}
        onChange={handleScreenshot}
      />
      <button className="btn" onClick={handleUploadClick}>
        Upload Screenshot
      </button>
      {ocrText && (
        <div className="small" style={{ marginLeft: '12px' }} id="ocrResult">
          <b>OCR:</b> {ocrText}{' '}
          <button
            className="btn"
            onClick={() => navigator.clipboard?.writeText(ocrText)}
            title="Copy OCR text"
          >
            Copy
          </button>
          {processedImage && (
            <a className="btn" href={processedImage} download="processed.png" style={{ marginLeft: '8px' }}>
              Download Processed Image
            </a>
          )}
        </div>
      )}
      {processedImage && (
        <Image id="ocrCanvas" src={processedImage} alt="processed" width={160} height={120} style={{ marginLeft: 12, borderRadius: 6 }} />
      )}
      <span className="small">{calcTime}</span>
      {analysis && (
        <div className="analysis-preview">
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
          <button className="btn" onClick={handleConfirmSave}>
            Save Analysis
          </button>
        </div>
      )}
      {message && <span className="small">{message}</span>}
    </div>
  );
}
