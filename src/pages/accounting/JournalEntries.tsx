import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

type JEStatus = 'draft' | 'posted';

interface JELine {
  id?: string;
  account: string;
  account_code?: string;
  account_name?: string;
  account_type?: string;
  description: string;
  debit: string;
  credit: string;
  line_order: number;
}

interface JournalEntry {
  id: string;
  reference: string;
  date: string;
  description: string;
  status: JEStatus;
  is_reversal: boolean;
  is_reversed: boolean;
  reversal_reference: string | null;
  reversal_of: string | null;
  total_debit: string;
  total_credit: string;
  posted_at: string | null;
  created_at?: string;
  updated_at?: string;
  lines: JELine[];
}

interface AccountOpt {
  id: string;
  code: string;
  name: string;
}

function idem() {
  return crypto.randomUUID();
}

function fmt(v: string | number | undefined) {
  if (v === undefined || v === null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function flattenTree(nodes: any[], acc: AccountOpt[] = []): AccountOpt[] {
  for (const n of nodes ?? []) {
    if (!n.is_archived) {
      acc.push({ id: n.id, code: n.code ?? '', name: n.name ?? '' });
    }
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

// ── List ────────────────────────────────────────────────────────────────────
function JournalList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | JEStatus>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  /** API default includes reversal lines; set false to omit them from the list. */
  const [includeReversals, setIncludeReversals] = useState(true);
  const pageSize = 20;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search.trim()) p.set('search', search.trim());
      if (status) p.set('status', status);
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      if (!includeReversals) p.set('include_reversals', 'false');
      const { data } = await api.get<{ count: number; results: JournalEntry[] }>(
        `/api/v1/accounting/journal-entries/?${p}`,
      );
      setRows(data.results ?? []);
      setCount(data.count ?? 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dateFrom, dateTo, includeReversals]);

  useEffect(() => {
    setPage(1);
  }, [search, status, dateFrom, dateTo, includeReversals]);

  useEffect(() => {
    const t = setTimeout(() => void fetchList(), 280);
    return () => clearTimeout(t);
  }, [fetchList]);

  const TH: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#666',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#f4f5f7',
    textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: 13,
    color: '#2b2b2b',
    borderBottom: '1px solid #f1f5f9',
    borderRight: '1px solid #f1f5f9',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", backgroundColor: '#f4f6f8', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference or description"
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 30,
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              fontSize: 13.5,
              fontFamily: "'Heebo', sans-serif",
            }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | JEStatus)}
          style={{ height: 36, borderRadius: 8, border: '1px solid #e0e0e0', paddingInline: 10, fontFamily: "'Heebo', sans-serif" }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="#888" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ height: 34, borderRadius: 8, border: '1px solid #e0e0e0', paddingInline: 8 }} />
          <span style={{ color: '#888' }}>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ height: 34, borderRadius: 8, border: '1px solid #e0e0e0', paddingInline: 8 }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={includeReversals}
            onChange={(e) => setIncludeReversals(e.target.checked)}
            style={{ accentColor: '#35C0A3', width: 14, height: 14 }}
          />
          Show reversals
        </label>
        <button
          type="button"
          onClick={() => nav('/accounting/journal-entries/new')}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            paddingInline: 16,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#35C0A3',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          <Plus size={16} /> New journal entry
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Reference</th>
              <th style={TH}>Date</th>
              <th style={TH}>Description</th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, textAlign: 'right' }}>Debit</th>
              <th style={{ ...TH, textAlign: 'right' }}>Credit</th>
              <th style={{ ...TH, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ ...TD, textAlign: 'center', padding: 36, color: '#9ca3af' }}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...TD, textAlign: 'center', padding: 36, color: '#9ca3af' }}>
                  No journal entries found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/accounting/journal-entries/${r.id}`)}>
                  <td style={TD}>
                    <span style={{ fontWeight: 600, color: '#0f766e' }}>{r.reference || '—'}</span>
                    {r.is_reversal && (
                      <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: '#fef3c7', color: '#b45309' }}>
                        REVERSAL
                      </span>
                    )}
                  </td>
                  <td style={TD}>{r.date}</td>
                  <td style={{ ...TD, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description || '—'}</td>
                  <td style={TD}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: r.status === 'posted' ? '#dcfce7' : '#fef3c7',
                        color: r.status === 'posted' ? '#15803d' : '#b45309',
                      }}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_debit)}</td>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_credit)}</td>
                  <td style={TD} onClick={(e) => e.stopPropagation()}>
                    <Link to={`/accounting/journal-entries/${r.id}`} style={{ color: '#35C0A3', fontSize: 12.5 }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {count > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14, alignItems: 'center' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Page {page} · {count} total
          </span>
          <button
            type="button"
            disabled={page * pageSize >= count}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: page * pageSize >= count ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
function JournalEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JELine[]>([
    { account: '', description: '', debit: '', credit: '', line_order: 1 },
    { account: '', description: '', debit: '', credit: '', line_order: 2 },
  ]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [showReverse, setShowReverse] = useState(false);
  const [revDesc, setRevDesc] = useState('');
  const [revDate, setRevDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [revAutoPost, setRevAutoPost] = useState(true);
  const [reversing, setReversing] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/');
        setAccounts(flattenTree(data));
      } catch {
        setAccounts([]);
      }
    })();
  }, []);

  const loadEntry = useCallback(async () => {
    if (!id || isNew) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<JournalEntry>(`/api/v1/accounting/journal-entries/${id}/`);
      setEntry(data);
      setDate(data.date);
      setDescription(data.description ?? '');
      setLines(
        (data.lines ?? []).map((l, i) => ({
          id: l.id,
          account: l.account,
          account_code: l.account_code,
          account_name: l.account_name,
          description: l.description ?? '',
          debit: String(l.debit ?? '0'),
          credit: String(l.credit ?? '0'),
          line_order: l.line_order ?? i + 1,
        })),
      );
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const canEdit = isNew || entry?.status === 'draft';
  const isPosted = entry?.status === 'posted';

  const totals = useMemo(() => {
    let td = 0;
    let tc = 0;
    for (const l of lines) {
      td += Number(l.debit) || 0;
      tc += Number(l.credit) || 0;
    }
    return { td, tc, balanced: Math.abs(td - tc) < 0.005 };
  }, [lines]);

  function setLine(i: number, patch: Partial<JELine>) {
    setLines((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { account: '', description: '', debit: '', credit: '', line_order: prev.length + 1 },
    ]);
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_order: idx + 1 })));
  }

  async function saveDraft() {
    setError('');
    setInfoMessage('');
    setSaving(true);
    try {
      const payloadLines = lines.map((l, idx) => ({
        account: l.account,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || '',
        line_order: idx + 1,
      }));
      if (isNew) {
        const { data } = await api.post<JournalEntry>(
          '/api/v1/accounting/journal-entries/',
          { date, description, lines: payloadLines },
          { headers: { 'Idempotency-Key': idem() } },
        );
        nav(`/accounting/journal-entries/${data.id}`, { replace: true });
      } else if (entry) {
        const { data } = await api.patch<JournalEntry>(`/api/v1/accounting/journal-entries/${entry.id}/`, {
          date,
          description,
          lines: payloadLines,
        });
        setEntry(data);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function postEntry() {
    if (!entry || isNew) return;
    setError('');
    setInfoMessage('');
    setPosting(true);
    try {
      const { data } = await api.post<JournalEntry>(
        `/api/v1/accounting/journal-entries/${entry.id}/post/`,
        {},
        { headers: { 'Idempotency-Key': idem() } },
      );
      setEntry(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPosting(false);
    }
  }

  async function saveAndPost() {
    setError('');
    setInfoMessage('');
    setPosting(true);
    try {
      const payloadLines = lines.map((l, idx) => ({
        account: l.account,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || '',
        line_order: idx + 1,
      }));
      const { data: created } = await api.post<JournalEntry>(
        '/api/v1/accounting/journal-entries/',
        { date, description, lines: payloadLines },
        { headers: { 'Idempotency-Key': idem() } },
      );
      const { data: posted } = await api.post<JournalEntry>(
        `/api/v1/accounting/journal-entries/${created.id}/post/`,
        {},
        { headers: { 'Idempotency-Key': idem() } },
      );
      nav(`/accounting/journal-entries/${posted.id}`, { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPosting(false);
    }
  }

  async function deleteDraft() {
    if (!entry || entry.status !== 'draft') return;
    if (!window.confirm('Delete this draft journal entry?')) return;
    try {
      await api.delete(`/api/v1/accounting/journal-entries/${entry.id}/`);
      nav('/accounting/journal-entries');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  async function doReverse() {
    if (!entry || entry.status !== 'posted') return;
    setReversing(true);
    setError('');
    setInfoMessage('');
    try {
      const res = await api.post<{
        message?: string;
        reversal?: JournalEntry;
      }>(
        `/api/v1/accounting/journal-entries/${entry.id}/reverse/`,
        {
          description: revDesc || undefined,
          date: revDate || undefined,
          auto_post: revAutoPost,
        },
        { headers: { 'Idempotency-Key': idem() } },
      );
      setShowReverse(false);
      if (res.status === 202) {
        const msg = (res.data as { message?: string })?.message;
        setInfoMessage(msg || 'Reversal is pending approval.');
        void loadEntry();
        return;
      }
      const { data } = res;
      if (data.reversal?.id) {
        nav(`/accounting/journal-entries/${data.reversal.id}`);
      } else {
        void loadEntry();
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setReversing(false);
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%',
    height: 32,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    padding: '0 8px',
    fontSize: 13,
    fontFamily: "'Heebo', sans-serif",
  };

  if (loading && !isNew) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: "'Heebo', sans-serif" }}>
        Loading journal entry…
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", backgroundColor: '#f4f6f8', minHeight: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => nav('/accounting/journal-entries')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#0f766e', cursor: 'pointer', fontSize: 14 }}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111' }}>
          {isNew ? 'New journal entry' : entry?.reference || 'Journal entry'}
        </h1>
        {entry?.status && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 4,
              backgroundColor: entry.status === 'posted' ? '#dcfce7' : '#fef3c7',
              color: entry.status === 'posted' ? '#15803d' : '#b45309',
            }}
          >
            {entry.status.toUpperCase()}
          </span>
        )}
      </div>

      {infoMessage && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: 13 }}>
          {infoMessage}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, maxWidth: 200 }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} style={inputSt} placeholder="Memo" />
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Lines</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #e5e7eb' }}>Account</th>
              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #e5e7eb' }}>Description</th>
              <th style={{ padding: 8, textAlign: 'right', border: '1px solid #e5e7eb', width: 120 }}>Debit</th>
              <th style={{ padding: 8, textAlign: 'right', border: '1px solid #e5e7eb', width: 120 }}>Credit</th>
              {canEdit && <th style={{ padding: 8, width: 40, border: '1px solid #e5e7eb' }} />}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ padding: 4, border: '1px solid #e5e7eb' }}>
                  {canEdit ? (
                    <select
                      value={l.account}
                      onChange={(e) => setLine(i, { account: e.target.value })}
                      style={{ ...inputSt, cursor: 'pointer' }}
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>
                      {l.account_code} — {l.account_name}
                      {l.account_type && (
                        <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {l.account_type}
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td style={{ padding: 4, border: '1px solid #e5e7eb' }}>
                  {canEdit ? (
                    <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} style={inputSt} />
                  ) : (
                    l.description
                  )}
                </td>
                <td style={{ padding: 4, border: '1px solid #e5e7eb' }}>
                  {canEdit ? (
                    <input
                      type="number"
                      value={l.debit}
                      onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '0' : l.credit })}
                      style={{ ...inputSt, textAlign: 'right' }}
                    />
                  ) : (
                    <span style={{ display: 'block', textAlign: 'right' }}>{fmt(l.debit)}</span>
                  )}
                </td>
                <td style={{ padding: 4, border: '1px solid #e5e7eb' }}>
                  {canEdit ? (
                    <input
                      type="number"
                      value={l.credit}
                      onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '0' : l.debit })}
                      style={{ ...inputSt, textAlign: 'right' }}
                    />
                  ) : (
                    <span style={{ display: 'block', textAlign: 'right' }}>{fmt(l.credit)}</span>
                  )}
                </td>
                {canEdit && (
                  <td style={{ padding: 4, border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <button type="button" onClick={() => removeLine(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <button type="button" onClick={addLine} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: '#35C0A3', cursor: 'pointer', fontSize: 13 }}>
            <Plus size={14} /> Add line
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, marginTop: 12, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: totals.balanced ? '#15803d' : '#b45309' }}>
            Total debit {fmt(totals.td)} · Total credit {fmt(totals.tc)}
            {!totals.balanced && ' (not balanced)'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                paddingInline: 18,
                borderRadius: 8,
                border: '1px solid #d1f1e7',
                backgroundColor: '#f0fdf9',
                color: '#0f766e',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              <Save size={16} /> {saving ? 'Saving…' : 'Save draft'}
            </button>
            {!isNew && entry?.status === 'draft' && (
              <button
                type="button"
                onClick={() => void postEntry()}
                disabled={posting || saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  paddingInline: 18,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: posting ? '#a7f3d0' : '#35C0A3',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: posting ? 'not-allowed' : 'pointer',
                }}
              >
                <Send size={16} /> {posting ? 'Posting…' : 'Post'}
              </button>
            )}
            {isNew && (
              <button
                type="button"
                onClick={() => void saveAndPost()}
                disabled={posting || saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  paddingInline: 18,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: posting ? '#a7f3d0' : '#0f766e',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: posting || saving ? 'wait' : 'pointer',
                }}
              >
                <Send size={16} /> {posting ? 'Posting…' : 'Save & post'}
              </button>
            )}
            {!isNew && entry?.status === 'draft' && (
              <button
                type="button"
                onClick={() => void deleteDraft()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  paddingInline: 14,
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  backgroundColor: '#fff',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
          </>
        )}
        {isPosted && !entry?.is_reversed && (
          <button
            type="button"
            onClick={() => {
              setInfoMessage('');
              setRevDesc(entry?.reference ? `Reversal of ${entry.reference}` : '');
              setShowReverse(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              paddingInline: 16,
              borderRadius: 8,
              border: '1px solid #fde68a',
              backgroundColor: '#fffbeb',
              color: '#b45309',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} /> Reverse entry
          </button>
        )}
      </div>

      {isPosted && entry?.is_reversed && entry.reversal_reference && (
        <p style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          Reversed by <strong>{entry.reversal_reference}</strong>
        </p>
      )}

      {showReverse && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowReverse(false)}
        >
          <div
            style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Reverse journal entry</h3>
            <label style={{ fontSize: 12, color: '#6b7280' }}>Description</label>
            <input value={revDesc} onChange={(e) => setRevDesc(e.target.value)} style={{ ...inputSt, marginBottom: 10, marginTop: 4 }} />
            <label style={{ fontSize: 12, color: '#6b7280' }}>Date</label>
            <input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} style={{ ...inputSt, marginBottom: 10, marginTop: 4 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={revAutoPost} onChange={(e) => setRevAutoPost(e.target.checked)} />
              Post reversal immediately
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowReverse(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doReverse()}
                disabled={reversing}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#35C0A3', color: '#fff', fontWeight: 600, cursor: reversing ? 'wait' : 'pointer' }}
              >
                {reversing ? 'Working…' : 'Create reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JournalEntries() {
  const { id } = useParams<{ id: string }>();
  if (id) return <JournalEditor />;
  return <JournalList />;
}
