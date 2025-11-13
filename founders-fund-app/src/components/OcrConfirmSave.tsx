'use client';

import { useState } from 'react';

type ProposedContribution = {
  owner: 'investor' | 'founders';
  name: string;
  type: 'investor_contribution' | 'founders_contribution' | 'entry_fee';
  amount: number;
  ts: string; // yyyy-mm-dd
  earnsDollarDaysThisWindow?: boolean;
};

export default function OcrConfirmSave({
  file,
  ocrText,
  ai,
  proposedContributions,
  portfolioId,
  userLabel,
  onSaved,
}: {
  file: File | null;
  ocrText?: string;
  ai?: any;
  proposedContributions: ProposedContribution[];
  portfolioId?: string;
  userLabel?: string;
  onSaved?: (payload: { scanId: string; committedCount: number; imageUrl?: string }) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const form = new FormData();
      if (file) form.set('file', file);
      form.set(
        'meta',
        JSON.stringify({
          portfolioId,
          userLabel,
          ocrText,
          ai,
          contributions: proposedContributions,
        }),
      );
      const res = await fetch('/api/scan/save', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error || 'Save failed');
        return;
      }
      setMsg(`Saved! entries: ${json.committedCount}`);
      onSaved?.(json);
    } catch (e: any) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        {...(saving ? { 'aria-busy': true } : {})}
        aria-label={saving ? 'Saving to history' : 'Confirm and save to history'}
      >
        {saving ? 'Saving…' : 'Confirm & Save to History'}
      </button>
      {msg && <div className="mt-2 text-xs">{msg}</div>}
    </div>
  );
}
