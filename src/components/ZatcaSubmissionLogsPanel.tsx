import type { CSSProperties } from 'react';

/** Serialized `ZatcaSubmissionLog` from the API (authority-grade tracing). */
export interface ZatcaSubmissionLogRow {
  id?: string;
  provider_request_id?: string | null;
  provider_correlation_id?: string | null;
  provider_status?: string | null;
  response_headers?: Record<string, string> | Record<string, unknown> | null;
  status?: string | null;
  response_reference?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const mono: CSSProperties = { fontFamily: 'ui-monospace, monospace', fontSize: 10.5, wordBreak: 'break-all' };

function formatHeaders(h: Record<string, string> | Record<string, unknown> | null | undefined): string {
  if (!h || typeof h !== 'object') return '';
  const entries = Object.entries(h).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join('\n');
}

export function ZatcaSubmissionLogsPanel({ logs }: { logs: ZatcaSubmissionLogRow[] }) {
  if (!logs.length) return null;

  const ordered = [...logs].reverse();

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        ZATCA submission log
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>
        Provider request IDs, correlation headers, and workflow status for support tickets and reconciliation (newest first).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordered.map((log, idx) => (
          <div
            key={log.id ?? `log-${idx}`}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 10px',
              backgroundColor: '#fafafa',
              fontSize: 11.5,
              color: '#374151',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 6 }}>
              {log.status ? (
                <span>
                  <span style={{ color: '#9ca3af' }}>Workflow</span>{' '}
                  <strong>{log.status}</strong>
                </span>
              ) : null}
              {log.provider_status ? (
                <span>
                  <span style={{ color: '#9ca3af' }}>Provider status</span>{' '}
                  <strong>{log.provider_status}</strong>
                </span>
              ) : null}
            </div>
            {log.response_reference ? (
              <div style={{ ...mono, marginBottom: 4 }}>
                <span style={{ color: '#9ca3af', fontFamily: "'Heebo', sans-serif" }}>response_reference </span>
                {log.response_reference}
              </div>
            ) : null}
            {log.provider_request_id ? (
              <div style={{ ...mono, marginBottom: 4 }}>
                <span style={{ color: '#9ca3af', fontFamily: "'Heebo', sans-serif" }}>provider_request_id </span>
                {log.provider_request_id}
              </div>
            ) : null}
            {log.provider_correlation_id ? (
              <div style={{ ...mono, marginBottom: 4 }}>
                <span style={{ color: '#9ca3af', fontFamily: "'Heebo', sans-serif" }}>provider_correlation_id </span>
                {log.provider_correlation_id}
              </div>
            ) : null}
            {log.created_at ? (
              <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>{log.created_at}</div>
            ) : null}
            {log.response_headers && Object.keys(log.response_headers).length > 0 ? (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, color: '#6b7280', userSelect: 'none' }}>
                  Response headers (normalized)
                </summary>
                <pre
                  style={{
                    ...mono,
                    margin: '8px 0 0',
                    padding: 8,
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    maxHeight: 160,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {formatHeaders(log.response_headers)}
                </pre>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
