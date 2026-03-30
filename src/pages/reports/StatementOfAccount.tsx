import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

interface AccountRef {
  id: string;
  code: string;
  name: string;
}

interface StatementRow {
  date: string;
  account_id: string;
  account: string;
  serial_number: string;
  source: string;
  activity: string;
  debit: string;
  credit: string;
  balance: string;
}

interface StatementPayload {
  account: AccountRef;
  opening_balance: string;
  results: StatementRow[];
}

interface StatementResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: StatementPayload;
}

const inputSt: CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 8,
  border: '1px solid #e0e0e0',
  padding: '0 10px',
  fontSize: 13.5,
  color: '#1a1a1a',
  outline: 'none',
  fontFamily: "'Heebo', sans-serif",
  backgroundColor: '#fff',
};

function fmt(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '0.00');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StatementOfAccount() {
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [accountId, setAccountId] = useState('');
  const [accountCode, setAccountCode] = useState('');

  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [payload, setPayload] = useState<StatementPayload | null>(null);
  const [total, setTotal] = useState(0);

  const filterRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === accountId) ?? null, [accounts, accountId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const { data } = await api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/');
      const flat: AccountRef[] = [];
      function walk(nodes: any[]) {
        nodes.forEach((n) => {
          if (!n?.is_archived && n?.id && n?.code) flat.push({ id: n.id, code: String(n.code), name: String(n.name ?? '') });
          if (Array.isArray(n.children)) walk(n.children);
        });
      }
      if (Array.isArray(data)) walk(data);
      flat.sort((a, b) => a.code.localeCompare(b.code));
      setAccounts(flat);
    } catch {
      /* silent */
    }
  }, []);

  const fetchStatement = useCallback(async (opts?: { exportCsv?: boolean }) => {
    setError('');
    if (!accountId && !accountCode.trim()) {
      setPayload(null);
      setTotal(0);
      return;
    }

    const params = new URLSearchParams();
    if (accountId) params.set('account', accountId);
    else params.set('account_code', accountCode.trim());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (search.trim()) params.set('search', search.trim());
    if (source.trim()) params.set('source', source.trim());
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (opts?.exportCsv) params.set('export', 'csv');

    try {
      if (opts?.exportCsv) {
        setExporting(true);
        const res = await api.get(`/api/v1/accounting/reports/statement-of-account/?${params}`, { responseType: 'blob' });
        const name = selectedAccount ? `${selectedAccount.code}-${selectedAccount.name}` : (accountCode.trim() || 'statement');
        downloadBlob(res.data as Blob, `statement-of-account_${name}_${dateFrom || 'all'}_${dateTo || 'all'}.csv`);
        return;
      }

      setLoading(true);
      const { data } = await api.get<StatementResponse>(`/api/v1/accounting/reports/statement-of-account/?${params}`);
      setPayload(data.results ?? null);
      setTotal(data.count ?? 0);
    } catch (err) {
      setError(parseApiError(err));
      setPayload(null);
      setTotal(0);
    } finally {
      setLoading(false);
      setExporting(false);
    }
  }, [accountId, accountCode, dateFrom, dateTo, search, source, page, pageSize, selectedAccount]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { void fetchStatement(); }, search.trim() ? 350 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [accountId, accountCode, dateFrom, dateTo, search, source, page, fetchStatement]);

  function resetFilters() {
    setSearch('');
    setSource('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setFilterOpen(false);
  }

  const TH: CSSProperties = {
    padding: '10px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '9px 10px',
    fontSize: 12.5,
    color: '#333',
    borderBottom: '1px solid #eef2f5',
    borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240, maxWidth: 360 }}>
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setAccountCode('');
                setPage(1);
              }}
              style={{ ...inputSt, cursor: 'pointer' }}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>or</div>
          <div style={{ width: 140 }}>
            <input
              value={accountCode}
              onChange={(e) => {
                setAccountCode(e.target.value);
                setAccountId('');
                setPage(1);
              }}
              placeholder="Account code"
              style={{ ...inputSt, height: 36 }}
            />
          </div>
          <div style={{ position: 'relative', width: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search" style={{ ...inputSt, paddingLeft: 30 }} />
          </div>
        </div>

        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer' }}
          >
            <Filter size={14} /> Filter
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 320, overflow: 'hidden', padding: 12 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date from</div>
                    <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ ...inputSt, height: 34 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date to</div>
                    <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ ...inputSt, height: 34 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Source</div>
                  <input value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} placeholder="Invoice / Bill / Credit Note / JE…" style={{ ...inputSt, height: 34 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={resetFilters}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                  <button onClick={() => setFilterOpen(false)}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => void fetchStatement({ exportCsv: true })}
          disabled={exporting || (!accountId && !accountCode.trim())}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, paddingInline: 14, borderRadius: 8,
            border: '1px solid #d1f1e7',
            backgroundColor: exporting ? '#e5e7eb' : '#f0fdf9',
            color: exporting ? '#6b7280' : '#0f766e',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Date</th>
              <th style={TH}>Account</th>
              <th style={TH}>Serial Number</th>
              <th style={TH}>Source</th>
              <th style={TH}>Activity</th>
              <th style={{ ...TH, textAlign: 'right' }}>Debit SAR</th>
              <th style={{ ...TH, textAlign: 'right' }}>Credit SAR</th>
              <th style={{ ...TH, textAlign: 'right', borderRight: 'none' }}>Balance SAR</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading statement…</td></tr>
            ) : !payload ? (
              <tr><td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Select an account to view statement.</td></tr>
            ) : payload.results.length === 0 ? (
              <tr><td colSpan={8} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No entries found.</td></tr>
            ) : (
              <>
                {/* Opening balance row */}
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ ...TD, fontWeight: 600 }}>Opening</td>
                  <td style={{ ...TD, fontWeight: 600 }}>{payload.account.code} - {payload.account.name}</td>
                  <td style={TD}>—</td>
                  <td style={TD}>—</td>
                  <td style={TD}>Opening Balance</td>
                  <td style={{ ...TD, textAlign: 'right' }}>—</td>
                  <td style={{ ...TD, textAlign: 'right' }}>—</td>
                  <td style={{ ...TD, textAlign: 'right', borderRight: 'none', fontWeight: 700 }}>{fmt(payload.opening_balance)}</td>
                </tr>
                {payload.results.map((r, idx) => (
                  <tr key={idx}>
                    <td style={TD}>{r.date}</td>
                    <td style={TD}>{r.account}</td>
                    <td style={TD}>{r.serial_number}</td>
                    <td style={TD}>{r.source}</td>
                    <td style={{ ...TD, maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.activity}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.debit)}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.credit)}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderRight: 'none' }}>{fmt(r.balance)}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {!loading && payload && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{total} entries</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ height: 30, paddingInline: 10, borderRadius: 7, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#555', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12.5, opacity: page <= 1 ? 0.6 : 1 }}
              >
                Prev
              </button>
              <span style={{ fontSize: 12.5, color: '#6b7280' }}>Page {page}</span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                style={{ height: 30, paddingInline: 10, borderRadius: 7, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#555', cursor: (page * pageSize >= total) ? 'not-allowed' : 'pointer', fontSize: 12.5, opacity: (page * pageSize >= total) ? 0.6 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

