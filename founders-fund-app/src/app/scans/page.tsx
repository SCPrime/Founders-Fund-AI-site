import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ScansPage() {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div style={{ padding: 16 }}>
      <h1>Scan History</h1>
      <p><Link href="/">← Back to app</Link></p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>When</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Label</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Portfolio</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Image</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Contributions</th>
          </tr>
        </thead>
        <tbody>
          {scans.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{new Date(s.createdAt).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{s.userLabel || '—'}</td>
              <td style={{ padding: 8 }}>{s.portfolioId || '—'}</td>
              <td style={{ padding: 8 }}>{s.imageUrl ? <a href={s.imageUrl} target="_blank" style={{ color: 'blue' }}>view</a> : '—'}</td>
              <td style={{ padding: 8 }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>
                  {JSON.stringify(s.contributions ?? [], null, 2)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {scans.length === 0 && (
        <p style={{ marginTop: 20, fontStyle: 'italic' }}>
          No scans yet. Use the OCR feature and click &quot;Confirm &amp; Save&quot; to build your scan history.
        </p>
      )}
    </div>
  );
}