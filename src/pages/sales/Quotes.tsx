import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

interface Choice { id: string; label: string; }

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

interface QuoteListRow {
  id: string;
  quote_number: string;
  customer: string;
  customer_name: string;
  date: string;
  status: QuoteStatus;
  status_display: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
}

interface QuoteLine {
  id?: string;
  product: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string | null;
  discount_percent: string;
}

interface QuoteDetail {
  id: string;
  quote_number: string;
  customer: string;
  customer_name: string;
  date: string;
  note: string;
  attachment: string | null;
  status: QuoteStatus;
  status_display: string;
  issuer_details?: {
    company_name?: string;
    address?: string;
    vat_registration_number?: string;
    logo?: string | null;
  };
  subtotal_before_discount: string;
  discount_total: string;
  total_vat: string;
  total_amount: string;
  lines: QuoteLine[];
  created_at: string;
  updated_at: string;
}

interface CustomerChoice { id: string; company_name: string; }
interface TaxRateChoice { id: string; name: string; tax_type: string; rate: string; }
interface ProductChoice { id: string; code: string; name: string; }

const inputSt: CSSProperties = {
  width: '100%', height: 34, borderRadius: 7, border: '1px solid #e0e0e0',
  padding: '0 10px', fontSize: 13.5, color: '#1a1a1a', outline: 'none',
  fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff',
};

function fmt(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '0.00');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusPill(status: QuoteStatus) {
  let bg = '#fef3c7';
  let color = '#b45309';
  let label = status.toUpperCase();
  if (status === 'sent') { bg = '#dbeafe'; color = '#1d4ed8'; }
  if (status === 'accepted') { bg = '#dcfce7'; color = '#16a34a'; }
  if (status === 'rejected') { bg = '#fee2e2'; color = '#dc2626'; }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, paddingInline: 8, borderRadius: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, backgroundColor: bg, color }}>
      {label}
    </span>
  );
}

function QuotesList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<QuoteListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customer, setCustomer] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statuses, setStatuses] = useState<Choice[]>([]);
  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        api.get<{ statuses?: Choice[]; quote_statuses?: Choice[] }>('/api/v1/sales/quotes/choices/'),
        api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true'),
      ]);
      setStatuses(qRes.data.statuses ?? qRes.data.quote_statuses ?? [
        { id: 'draft', label: 'Draft' },
        { id: 'sent', label: 'Sent' },
        { id: 'accepted', label: 'Accepted' },
        { id: 'rejected', label: 'Rejected' },
      ]);
      setCustomers((cRes.data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
    } catch {
      /* silent */
    }
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (customer) params.set('customer', customer);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get<{ count: number; results: QuoteListRow[] }>(`/api/v1/sales/quotes/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, status, customer, dateFrom, dateTo]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, status, customer, dateFrom, dateTo, fetchRows]);

  const TH: CSSProperties = {
    padding: '10px 10px', fontSize: 12, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '9px 10px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={{ ...inputSt, paddingLeft: 30 }} />
        </div>

        <div ref={filterRef} style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen((o) => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 13.5, cursor: 'pointer' }}>
            <SlidersHorizontal size={14} /> Filter
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, zIndex: 30, backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 280, overflow: 'hidden', padding: 12 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Status</div>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Customer</div>
                  <select value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setStatus(''); setCustomer(''); setDateFrom(''); setDateTo(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/sales/quotes/add')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 16, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #efefef', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Status</th>
              <th style={TH}>Quote #</th>
              <th style={TH}>Customer</th>
              <th style={TH}>Date</th>
              <th style={{ ...TH, textAlign: 'right' }}>Total</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading quotes…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No quotes found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/sales/quotes/${r.id}`)}>
                <td style={TD}>{statusPill(r.status)}</td>
                <td style={{ ...TD, fontWeight: 600 }}>{r.quote_number}</td>
                <td style={TD}>{r.customer_name}</td>
                <td style={TD}>{r.date}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_amount)}</td>
                <td style={{ ...TD, borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{rows.length} shown · {total} total</span>
          </div>
        )}
      </div>
    </div>
  );
}

function QuotesEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'add';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(isCreate ? null : id || null);
  const [status, setStatus] = useState<QuoteStatus>('draft');

  const [quoteNumber, setQuoteNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [priceMode, setPriceMode] = useState<'inc_tax' | 'ex_tax'>('inc_tax');
  const [lines, setLines] = useState<QuoteLine[]>([
    { product: null, description: '', quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' },
  ]);

  const [customers, setCustomers] = useState<CustomerChoice[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateChoice[]>([]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [issuer, setIssuer] = useState<QuoteDetail['issuer_details'] | null>(null);

  const canEdit = status === 'draft' || status === 'sent';

  const subtotalBeforeDiscount = useMemo(
    () => lines.reduce((acc, l) => acc + ((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)), 0),
    [lines],
  );
  const discountTotal = useMemo(() => lines.reduce((acc, l) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    const disc = Number(l.discount_percent) || 0;
    return acc + (gross * disc / 100);
  }, 0), [lines]);
  const totalVat = useMemo(() => lines.reduce((acc, l) => {
    const gross = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    const disc = Number(l.discount_percent) || 0;
    const afterDisc = gross - (gross * disc / 100);
    const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
    return acc + (afterDisc * rate / 100);
  }, 0), [lines, taxRates]);
  const total = subtotalBeforeDiscount - discountTotal + totalVat;

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, tRes, pRes, qRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/sales/customers/?page_size=200&active=true'),
        api.get<{ results: any[] }>('/api/v1/accounting/tax-rates/?page_size=200&active=true&tax_type=sales'),
        api.get<{ results: any[] }>('/api/v1/products/items/?page_size=200&active=true'),
        api.get<{ statuses?: Choice[]; quote_statuses?: Choice[] }>('/api/v1/sales/quotes/choices/'),
      ]);
      setCustomers((cRes.data.results ?? []).map((c) => ({ id: c.id, company_name: c.company_name })));
      setTaxRates((tRes.data.results ?? []).map((t) => ({ id: t.id, name: t.name, tax_type: t.tax_type, rate: t.rate })));
      setProducts((pRes.data.results ?? []).map((p) => ({ id: p.id, code: p.code ?? '', name: p.name ?? '' })));
      void qRes;
    } catch {
      /* silent */
    }
  }, []);

  const fetchQuote = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<QuoteDetail>(`/api/v1/sales/quotes/${id}/`);
      setQuoteId(data.id);
      setStatus(data.status);
      setQuoteNumber(data.quote_number ?? '');
      setCustomer(data.customer ?? '');
      setDate(data.date ?? '');
      setNote(data.note ?? '');
      setAttachmentName(data.attachment ?? '');
      setIssuer(data.issuer_details ?? null);
      setLines((data.lines ?? []).map((l) => ({
        id: l.id,
        product: l.product ?? null,
        description: l.description ?? '',
        quantity: String(l.quantity ?? ''),
        unit_price: String(l.unit_price ?? ''),
        tax_rate: l.tax_rate ?? null,
        discount_percent: String(l.discount_percent ?? '0'),
      })));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isCreate]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  function setLine(idx: number, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { product: null, description: '', quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' }]);
  }
  function clearLine(idx: number) {
    setLines((prev) => prev.map((l, i) => i === idx ? { product: null, description: '', quantity: '1', unit_price: '', tax_rate: null, discount_percent: '0' } : l));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  async function saveQuote(navigateAfterCreate = true): Promise<string | null> {
    if (!canEdit) return null;
    setSaving(true);
    setError('');
    try {
      const body = {
        quote_number: quoteNumber,
        customer,
        date,
        note,
        lines: lines.map((l) => ({
          product: l.product || null,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate || null,
          discount_percent: l.discount_percent || '0',
        })),
      };
      const { data } = quoteId
        ? await api.patch<QuoteDetail>(`/api/v1/sales/quotes/${quoteId}/`, body)
        : await api.post<QuoteDetail>('/api/v1/sales/quotes/', body);

      if (attachmentFile && data.id) {
        const fd = new FormData();
        fd.append('attachment', attachmentFile);
        await api.patch(`/api/v1/sales/quotes/${data.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setQuoteId(data.id);
      setStatus(data.status);
      setIssuer(data.issuer_details ?? null);
      if (navigateAfterCreate) nav('/sales/quotes', { replace: true });
      return data.id;
    } catch (err) {
      setError(parseApiError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndSend() {
    let targetId = quoteId;
    if (!targetId) {
      targetId = await saveQuote(false);
      if (!targetId) return;
      setQuoteId(targetId);
    }
    setSending(true);
    setError('');
    try {
      const { data } = await api.post<QuoteDetail>(`/api/v1/sales/quotes/${targetId}/send/`, {});
      setStatus(data.status);
      setIssuer(data.issuer_details ?? null);
      nav('/sales/quotes', { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSending(false);
    }
  }

  async function deleteQuote() {
    if (!quoteId) return;
    if (!window.confirm('Delete this quote?')) return;
    try {
      await api.delete(`/api/v1/sales/quotes/${quoteId}/`);
      nav('/sales/quotes');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) return <div style={{ padding: '24px 28px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;

  const TH: CSSProperties = {
    padding: '8px 8px', fontSize: 11.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#eef8dc', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: CSSProperties = {
    padding: '6px 8px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Create Quote</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusPill(status)}
            <button onClick={() => nav('/sales/quotes')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            {canEdit && (
              <button onClick={() => { void saveQuote(); }} disabled={saving}
                style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #d1f1e7', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            {canEdit && (
              <button onClick={saveAndSend} disabled={sending}
                style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: sending ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                {sending ? 'Sending…' : 'Save & Send'}
              </button>
            )}
            {quoteId && (
              <button onClick={deleteQuote} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ margin: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)', gap: 14, padding: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#111827', gridColumn: '1 / span 2' }}>Quote <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}># {quoteNumber || 'QT-100101'}</span></span>
              <span style={{ fontSize: 12.5, color: '#555' }}>Customer*</span>
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }}>
                <option value="">Select</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              <span style={{ fontSize: 12.5, color: '#555' }}>Date*</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />
              <span style={{ fontSize: 12.5, color: '#555' }}>Quote #*</span>
              <input value={quoteNumber} onChange={(e) => setQuoteNumber(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <select value={priceMode} onChange={(e) => setPriceMode(e.target.value as 'inc_tax' | 'ex_tax')} disabled={!canEdit}
                style={{ ...inputSt, width: 130, height: 28, fontSize: 11.5, color: '#666' }}>
                <option value="inc_tax">Price are inc.tax</option>
                <option value="ex_tax">Price are ex.tax</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Description*</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Qty*</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Price</th>
                  <th style={TH}>Tax Rate</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Discount</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={{ ...TH, width: 36, borderRight: 'none' }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx}>
                    <td style={TD}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <select value={l.product ?? ''} onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          setLine(idx, { product: e.target.value || null, description: p ? `${p.code} - ${p.name}` : l.description });
                        }} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                          <option value="">Select product</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>)}
                        </select>
                        <input value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} disabled={!canEdit}
                          style={{ ...inputSt, height: 30 }} placeholder="Description or search item" />
                      </div>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(idx, { unit_price: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} placeholder="Required" /></td>
                    <td style={TD}>
                      <select value={l.tax_rate ?? ''} onChange={(e) => setLine(idx, { tax_rate: e.target.value || null })} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                        <option value="">Required</option>
                        {taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({fmt(t.rate)}%)</option>)}
                      </select>
                    </td>
                    <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.discount_percent} onChange={(e) => setLine(idx, { discount_percent: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {(() => {
                        const qty = Number(l.quantity) || 0;
                        const price = Number(l.unit_price) || 0;
                        const disc = Number(l.discount_percent) || 0;
                        const gross = qty * price;
                        const afterDisc = gross - (gross * disc / 100);
                        const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
                        const tax = afterDisc * rate / 100;
                        const lineTotal = priceMode === 'inc_tax' ? afterDisc : afterDisc + tax;
                        return fmt(String(lineTotal));
                      })()}
                    </td>
                    <td style={{ ...TD, borderRight: 'none' }}>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => clearLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#666', cursor: 'pointer', fontSize: 11 }}>↺</button>
                          <button onClick={() => removeLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {canEdit && (
                <button onClick={addLine} type="button" style={{ height: 30, paddingInline: 12, borderRadius: 7, border: '1px solid #bbf7e8', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: 'pointer', fontSize: 12.5 }}>
                  + Add line
                </button>
              )}
              <div />
            </div>

            <div>
              <div style={{ fontSize: 12.5, color: '#555', marginBottom: 6 }}>Note</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canEdit} style={{ ...inputSt, minHeight: 64, height: 64, paddingTop: 8, resize: 'vertical' }} placeholder="Empty" />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, padding: 10, backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Issuer Details</div>
              {issuer?.logo ? (
                <img src={issuer.logo} alt="Issuer logo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }} />
              ) : null}
              <div style={{ fontSize: 12.5, color: '#111827', fontWeight: 600 }}>{issuer?.company_name || 'Your Company Name'}</div>
              <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>{issuer?.address || 'Riyadh'}</div>
              <div style={{ fontSize: 11.5, color: '#6b7280' }}>VAT: {issuer?.vat_registration_number || '-'}</div>
            </div>

            <div style={{ border: '1.5px dashed #d1d5db', borderRadius: 12, backgroundColor: '#f9fafb', padding: '12px 10px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: '#666', marginBottom: 10 }}>Attachments</div>
              <label style={{ width: '100%', minHeight: 150, borderRadius: 10, border: '1px dashed #d1d5db', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: canEdit ? 'pointer' : 'not-allowed', color: canEdit ? '#666' : '#aaa', textAlign: 'center', padding: 12, boxSizing: 'border-box' }}>
                <UploadCloud size={20} style={{ marginBottom: 8 }} />
                <span style={{ fontSize: 12, lineHeight: 1.6 }}>Upload file</span>
                <input type="file" style={{ display: 'none' }} disabled={!canEdit} onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAttachmentFile(f);
                  setAttachmentName(f?.name ?? '');
                }} />
              </label>
              {attachmentName && <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>Attachment: {attachmentName}</div>}
            </div>

            <div style={{ textAlign: 'right', fontSize: 12.5, color: '#555', lineHeight: 1.8, paddingTop: 8 }}>
              <div>Subtotal before discount <span style={{ marginLeft: 12, minWidth: 90, display: 'inline-block', textAlign: 'right' }}>{fmt(subtotalBeforeDiscount)}</span></div>
              <div>Discount <span style={{ marginLeft: 12, minWidth: 90, display: 'inline-block', textAlign: 'right' }}>{fmt(discountTotal)}</span></div>
              <div>Total VAT <span style={{ marginLeft: 12, minWidth: 90, display: 'inline-block', textAlign: 'right' }}>{fmt(totalVat)}</span></div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: '#111827' }}>Total <span style={{ fontSize: 18, marginLeft: 8 }}>SAR {fmt(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Quotes() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <QuotesEditor />;
  return <QuotesList />;
}

