import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

function approvalIdempotencyKey() {
  return crypto.randomUUID();
}

const inputSt: CSSProperties = {
  width: '100%', height: 34, borderRadius: 7, border: '1px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff',
};

function approvalRowId(r: Record<string, unknown>): string | null {
  const id = r.id;
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);
  return null;
}

function isPendingApproval(r: Record<string, unknown>): boolean {
  const s = r.status ?? r.state ?? r.approval_status;
  return String(s ?? '').toLowerCase() === 'pending';
}

type PageInfo = { count: number; next: string | null; previous: string | null };

export default function ApprovalsQueue() {
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [denyTargetId, setDenyTargetId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [denySubmitting, setDenySubmitting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [status, scope]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status.trim()) params.set('status', status.trim());
      if (scope.trim()) params.set('scope', scope.trim());
      params.set('page', String(page));
      params.set('page_size', '50');
      const { data } = await api.get<
        | { count?: number; next?: string | null; previous?: string | null; results?: Record<string, unknown>[] }
        | Record<string, unknown>[]
      >(`/api/v1/main/approvals/?${params}`);
      if (Array.isArray(data)) {
        setRows(data as Record<string, unknown>[]);
        setPageInfo(null);
      } else {
        setRows((data?.results ?? []) as Record<string, unknown>[]);
        setPageInfo({
          count: data?.count ?? (data?.results?.length ?? 0),
          next: data?.next ?? null,
          previous: data?.previous ?? null,
        });
      }
    } catch (err) {
      setError(parseApiError(err));
      setRows([]);
      setPageInfo(null);
    } finally {
      setLoading(false);
    }
  }, [status, scope, page]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const TH: CSSProperties = {
    padding: '10px 12px', fontSize: 12, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const TD: CSSProperties = {
    padding: '9px 12px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'top',
  };

  const keys = rows.length ? Object.keys(rows[0]) : [];
  const showActionsCol = rows.length > 0;
  const colSpan = Math.max(keys.length, 1) + (showActionsCol ? 1 : 0);

  async function approveRow(approvalId: string) {
    setActionLoadingId(approvalId);
    setError('');
    try {
      await api.post(
        `/api/v1/main/approvals/${approvalId}/approve/`,
        {},
        { headers: { 'Idempotency-Key': approvalIdempotencyKey() } },
      );
      await fetchRows();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setActionLoadingId(null);
    }
  }

  function openDeny(approvalId: string) {
    setDenyTargetId(approvalId);
    setDenyReason('');
    setError('');
  }

  async function confirmDeny() {
    if (!denyTargetId) return;
    const reason = denyReason.trim();
    if (!reason) {
      setError('A reason is required to deny an approval.');
      return;
    }
    setDenySubmitting(true);
    setError('');
    try {
      await api.post(
        `/api/v1/main/approvals/${denyTargetId}/deny/`,
        { reason },
        { headers: { 'Idempotency-Key': approvalIdempotencyKey() } },
      );
      setDenyTargetId(null);
      setDenyReason('');
      await fetchRows();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setDenySubmitting(false);
    }
  }

  const btnOutline: CSSProperties = {
    height: 28, paddingInline: 10, borderRadius: 6, fontSize: 12,
    border: '1px solid #e0e0e0', backgroundColor: '#fff', cursor: 'pointer', color: '#374151',
  };
  const btnDanger: CSSProperties = {
    ...btnOutline, borderColor: '#fecaca', color: '#b91c1c', backgroundColor: '#fff5f5',
  };
  const btnPrimary: CSSProperties = {
    height: 28, paddingInline: 10, borderRadius: 6, fontSize: 12,
    border: 'none', backgroundColor: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 600,
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Approvals</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputSt, width: 180, cursor: 'pointer' }}>
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="denied">denied</option>
          <option value="executed">executed</option>
          <option value="failed">failed</option>
        </select>
        <input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Scope filter"
          style={{ ...inputSt, width: 200 }}
        />
        <button
          type="button"
          onClick={() => void fetchRows()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13 }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k} style={TH}>{k}</th>
              ))}
              {showActionsCol ? (
                <th style={{ ...TH, borderRight: 'none' }}>Actions</th>
              ) : null}
              {keys.length === 0 && !showActionsCol ? <th style={{ ...TH, borderRight: 'none' }}>—</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} style={{ ...TD, textAlign: 'center', padding: '36px 0', color: '#9ca3af', borderRight: 'none' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={colSpan} style={{ ...TD, textAlign: 'center', padding: '36px 0', color: '#9ca3af', borderRight: 'none' }}>No approval requests.</td></tr>
            ) : (
              rows.map((r, i) => {
                const aid = approvalRowId(r);
                const pending = isPendingApproval(r);
                const busy = aid != null && actionLoadingId === aid;
                return (
                  <tr key={String(r.id ?? i)}>
                    {keys.map((k, ki) => (
                      <td key={k} style={{ ...TD, borderRight: ki === keys.length - 1 && !showActionsCol ? 'none' : '1px solid #eef2f5' }}>
                        {formatCell(r[k])}
                      </td>
                    ))}
                    {showActionsCol ? (
                      <td style={{ ...TD, borderRight: 'none', whiteSpace: 'nowrap' }}>
                        {pending && aid ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => { void approveRow(aid); }}
                              style={{ ...btnPrimary, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer' }}
                            >
                              {busy ? '…' : 'Approve'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => openDeny(aid)} style={{ ...btnDanger, opacity: busy ? 0.7 : 1 }}>
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageInfo && pageInfo.count > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap', fontSize: 13, color: '#4b5563' }}>
          <span>{pageInfo.count} total</span>
          <button
            type="button"
            disabled={!pageInfo.previous}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ ...btnOutline, opacity: pageInfo.previous ? 1 : 0.45, cursor: pageInfo.previous ? 'pointer' : 'not-allowed' }}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={!pageInfo.next}
            onClick={() => setPage((p) => p + 1)}
            style={{ ...btnOutline, opacity: pageInfo.next ? 1 : 0.45, cursor: pageInfo.next ? 'pointer' : 'not-allowed' }}
          >
            Next
          </button>
        </div>
      ) : null}

      <p style={{ marginTop: 14, fontSize: 12, color: '#6b7280', lineHeight: 1.55, maxWidth: 720 }}>
        <strong style={{ color: '#374151' }}>Approve / deny rules:</strong>{' '}
        Approve uses <code style={{ fontSize: 11 }}>POST /api/v1/main/approvals/&lt;uuid&gt;/approve/</code>.
        The requester cannot approve their own request (<code style={{ fontSize: 11 }}>403 SELF_APPROVAL_FORBIDDEN</code>).
        Only pending items can be approved (<code style={{ fontSize: 11 }}>422 NOT_PENDING</code>).
        Deny uses <code style={{ fontSize: 11 }}>POST …/deny/</code> with body <code style={{ fontSize: 11 }}>{`{ "reason": "..." }`}</code> and a required{' '}
        <code style={{ fontSize: 11 }}>Idempotency-Key</code> header.
      </p>

      <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280', lineHeight: 1.55, maxWidth: 720 }}>
        <strong style={{ color: '#374151' }}>Financial integrity (server-side):</strong>{' '}
        There is no HTTP API for this report. Operators run{' '}
        <code style={{ fontSize: 11 }}>python manage.py report_financial_integrity</code>{' '}
        (add <code style={{ fontSize: 11 }}>--fail-on-error</code> for CI). Checks include posted documents without journal entries, over-allocations, and over-applications.
      </p>

      {denyTargetId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deny-approval-title"
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !denySubmitting) {
              setDenyTargetId(null);
              setDenyReason('');
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: '20px 22px', maxWidth: 440, width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div id="deny-approval-title" style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Deny approval</div>
            <label style={{ display: 'block', fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Reason (required)</label>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid #e0e0e0',
                padding: '10px 12px', fontSize: 13, fontFamily: "'Heebo', sans-serif", resize: 'vertical', marginBottom: 16,
              }}
              placeholder="Explain why this approval is denied..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                disabled={denySubmitting}
                onClick={() => {
                  if (!denySubmitting) {
                    setDenyTargetId(null);
                    setDenyReason('');
                  }
                }}
                style={btnOutline}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={denySubmitting}
                onClick={() => { void confirmDeny(); }}
                style={{ ...btnDanger, fontWeight: 600, cursor: denySubmitting ? 'wait' : 'pointer' }}
              >
                {denySubmitting ? 'Submitting…' : 'Confirm deny'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
