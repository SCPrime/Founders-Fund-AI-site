'use client';

import { useState } from 'react';
import { API_ROUTES } from '@/lib/apiRoutes';
import { ensureEntryFees, type Leg } from '@/lib/fees';

type ProposedContribution = {
  owner: 'investor'|'founders';
  name: string;
  type: 'investor_contribution'|'founders_contribution'|'founders_entry_fee';
  amount: number;
  ts: string; // yyyy-mm-dd or ISO
  earnsDollarDaysThisWindow?: boolean;
};

type SimpleCalculatePayload = {
  legs: Leg[];
  // Server will fill in defaults for window, constants, etc.
};

export default function OcrConfirmSave({
  file,
  ocrText,
  ai,
  proposedContributions,
  portfolioId,
  userLabel,
  onSaved,
  onPushed,
}: {
  file: File | null;
  ocrText?: string;
  ai?: unknown;
  proposedContributions: ProposedContribution[];
  portfolioId?: string;
  userLabel?: string;
  onSaved?: (payload: { scanId: string; committedCount: number; imageUrl?: string }) => void;
  onPushed?: (result: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const effectivePortfolioId = portfolioId ?? 'baseline-figment-splits-2024';

  async function handleSaveOnly() {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      if (file) form.set('file', file);
      form.set('meta', JSON.stringify({
        portfolioId: effectivePortfolioId,
        userLabel,
        ocrText,
        ai,
        contributions: proposedContributions,
      }));
      const res = await fetch(API_ROUTES.SCAN_SAVE, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error || 'Save failed');
        return;
      }
      setMsg(`Saved! entries: ${json.committedCount}`);
      onSaved?.(json);
      return json;
    } catch (e: unknown) {
      setMsg((e as Error)?.message || 'Save failed');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handlePushToCalculator() {
    setBusy(true);
    setMsg(null);
    try {
      // 1) Save first (history + idempotent contributions)
      await handleSaveOnly();

      // 2) Build payload and ensure 10% fee legs are there
      const baseLegs: Leg[] = proposedContributions.map(c => ({
        owner: c.owner,
        name: c.name,
        type: c.type,
        amount: c.amount,
        ts: /^\d{4}-\d{2}-\d{2}$/.test(c.ts) ? `${c.ts}T00:00:00Z` : c.ts,
        earnsDollarDaysThisWindow: c.earnsDollarDaysThisWindow ?? true
      }));
      const payload: SimpleCalculatePayload = { legs: ensureEntryFees(baseLegs) };

      // 3) Request server recompute
      const res = await fetch(API_ROUTES.CALCULATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Calculate failed:', data);
        setMsg(`Calculate failed: ${data?.error ?? res.status}`);
        return;
      }

      // 4) Notify parent / store binder to update UI
      onPushed?.(data);
      setMsg('Calculator updated from server result.');
    } catch (e: unknown) {
      setMsg((e as Error)?.message || 'Push failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSaveOnly} disabled={busy} aria-busy={busy}>
          {busy ? 'Saving…' : 'Confirm & Save to History'}
        </button>
        <button onClick={handlePushToCalculator} disabled={busy} aria-busy={busy} style={{ fontWeight: 'bold' }}>
          {busy ? 'Pushing…' : 'Push to Calculator'}
        </button>
      </div>
      {msg && <div style={{ marginTop: 8, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}