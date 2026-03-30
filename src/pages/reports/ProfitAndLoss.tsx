import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

type GroupBy = 'none' | 'month';
type LayoutMode = 'vertical' | 'horizontal';

interface PnlColumn {
  key: string;
  label: string;
}

interface PnlRow {
  type: 'section' | 'account' | 'section_total' | 'net' | string;
  code?: string;
  label?: string;
  account_id?: string;
  name?: string;
  values: Record<string, string>;
}

interface PnlResponse {
  meta: {
    date_from?: string;
    date_to?: string;
    group_by?: GroupBy;
    layout?: LayoutMode;
  };
  columns: PnlColumn[];
  rows: PnlRow[];
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

function isExpenseSection(code?: string) {
  return code === '51' || code === '52' || code === '53';
}

export default function ProfitAndLoss() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [layout, setLayout] = useState<LayoutMode>('vertical');

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<PnlResponse | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchReport = useCallback(async (opts?: { exportCsv?: boolean }) => {
    setError('');
    const params = new URLSearchParams();
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('group_by', groupBy);
    params.set('layout', layout);
    if (search.trim()) params.set('search', search.trim());
    if (opts?.exportCsv) params.set('export', 'csv');

    try {
      if (opts?.exportCsv) {
        setExporting(true);
        const res = await api.get(`/api/v1/accounting/reports/profit-and-loss/?${params}`, { responseType: 'blob' });
        const suffix = `${layout}_${groupBy}_${dateFrom || 'all'}_${dateTo || 'all'}`;
        downloadBlob(res.data as Blob, `profit-and-loss_${suffix}.csv`);
        return;
      }
      setLoading(true);
      const { data } = await api.get<PnlResponse>(`/api/v1/accounting/reports/profit-and-loss/?${params}`);
      setPayload(data);
    } catch (err) {
      setError(parseApiError(err));
      setPayload(null);
    } finally {
      setLoading(false);
      setExporting(false);
    }
  }, [dateFrom, dateTo, groupBy, layout, search]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchReport(); }, search.trim() ? 350 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dateFrom, dateTo, groupBy, layout, search, fetchReport]);

  const visibleRows = useMemo(() => {
    if (!payload) return [];
    if (!search.trim()) return payload.rows;
    const q = search.trim().toLowerCase();
    return payload.rows.filter((r) => {
      const title = `${r.label ?? ''} ${r.code ?? ''} ${r.name ?? ''}`.toLowerCase();
      return title.includes(q);
    });
  }, [payload, search]);

  const columns = payload?.columns ?? [{ key: 'total', label: 'Total' }];
  const valueKeys = columns.map((c) => c.key);

  const incomeRows = visibleRows.filter((r) => !isExpenseSection(r.code));
  const expenseRows = visibleRows.filter((r) => isExpenseSection(r.code));

  const TH: CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
  const TD: CSSProperties = {
    padding: '9px 12px',
    fontSize: 13,
    color: '#333',
    borderBottom: '1px solid #f1f3f5',
    borderRight: '1px solid #f1f3f5',
    verticalAlign: 'top',
  };

  function renderRowLabel(r: PnlRow) {
    if (r.type === 'section') return r.label ?? '';
    if (r.type === 'account') return `${r.code ?? ''} ${r.name ?? ''}`.trim();
    return r.label ?? r.name ?? '';
  }

  function renderAmount(v?: string) {
    const n = Number(v ?? '0');
    const c = n > 0 ? '#35C0A3' : (n < 0 ? '#dc2626' : '#4b5563');
    return <span style={{ color: c, fontVariantNumeric: 'tabular-nums' }}>{fmt(v ?? '0')}</span>;
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ ...inputSt, paddingLeft: 30 }} />
        </div>

        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} style={{ ...inputSt, width: 160, cursor: 'pointer' }}>
          <option value="none">View by Total</option>
          <option value="month">View by Month</option>
        </select>

        <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutMode)} style={{ ...inputSt, width: 170, cursor: 'pointer' }}>
          <option value="vertical">Vertical Layout</option>
          <option value="horizontal">Horizontal Layout</option>
        </select>

        <div ref={filterRef} style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer' }}>
            <Filter size={14} /> Filter
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 300, overflow: 'hidden', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date from</div>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputSt, height: 34 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Date to</div>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputSt, height: 34 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10 }}>
                <button onClick={() => { setDateFrom(''); setDateTo(''); setFilterOpen(false); }}
                  style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                  Reset
                </button>
                <button onClick={() => setFilterOpen(false)}
                  style={{ height: 34, paddingInline: 14, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => void fetchReport({ exportCsv: true })}
          disabled={exporting}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            height: 36, paddingInline: 14, borderRadius: 8,
            border: '1px solid #d1f1e7',
            backgroundColor: exporting ? '#e5e7eb' : '#f0fdf9',
            color: exporting ? '#6b7280' : '#0f766e',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: 13.5, fontWeight: 600,
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

      {loading ? (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', padding: 30, color: '#9ca3af' }}>Loading profit and loss…</div>
      ) : !payload ? (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', padding: 30, color: '#9ca3af' }}>No report data.</div>
      ) : layout === 'vertical' ? (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Account</th>
                {columns.map((c) => (
                  <th key={c.key} style={{ ...TH, textAlign: 'right' }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, idx) => {
                const isSection = r.type === 'section';
                const isSectionTotal = r.type === 'section_total';
                const isNet = r.type === 'net';
                return (
                  <tr key={`${r.type}-${r.code ?? ''}-${idx}`} style={{ backgroundColor: isSection ? '#fbfbfb' : (isNet ? '#fffceb' : '#fff') }}>
                    <td style={{ ...TD, borderRight: 'none', fontWeight: isSection || isSectionTotal || isNet ? 700 : 500, paddingLeft: r.type === 'account' ? 26 : 12 }}>
                      {renderRowLabel(r)}
                    </td>
                    {valueKeys.map((k) => (
                      <td key={k} style={{ ...TD, textAlign: 'right', borderRight: 'none', fontWeight: isSectionTotal || isNet ? 700 : 500 }}>
                        {r.type === 'section' ? '' : renderAmount(r.values?.[k])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { title: 'Income', rows: incomeRows, bg: '#eef8dc' },
            { title: 'Expense', rows: expenseRows, bg: '#fde8ef' },
          ].map((col) => (
            <div key={col.title} style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, backgroundColor: col.bg }}>{col.title}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {col.rows.map((r, idx) => (
                    <tr key={`${col.title}-${idx}`}>
                      <td style={{ ...TD, borderRight: 'none', fontWeight: r.type === 'section' || r.type === 'section_total' || r.type === 'net' ? 700 : 500, paddingLeft: r.type === 'account' ? 20 : 12 }}>
                        {renderRowLabel(r)}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', borderRight: 'none', width: 150, fontWeight: r.type === 'section_total' || r.type === 'net' ? 700 : 500 }}>
                        {r.type === 'section' ? '' : renderAmount(r.values?.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

