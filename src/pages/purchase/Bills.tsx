import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, Trash2, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

type BillStatus = 'draft' | 'posted';
type BillsTab = 'all' | 'to_complete' | 'to_authorize' | 'to_pay' | 'overdue' | 'paid';

interface BillListRow {
  id: string;
  status: BillStatus;
  status_display: string;
  bill_number: string;
  supplier: string;
  supplier_name: string;
  bill_date: string;
  due_date: string | null;
  total_amount: string;
  payments: string;
  balance: string;
  line_item_description: string;
  account_display: string;
  qty: string;
  rate: string;
  tax_rate_display: string;
  amount: string;
  created_at: string;
  updated_at: string;
}

interface BillLine {
  id?: string;
  description_text: string;
  selected_products: { id: string; name: string; code?: string }[];
  account: string;
  account_code?: string;
  account_name?: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  tax_rate_name?: string;
  tax_rate_percent?: string;
  discount_percent: string;
  line_subtotal?: string;
  line_tax_amount?: string;
  line_total?: string;
}

interface BillDetail {
  id: string;
  bill_number: string;
  supplier: string;
  supplier_name: string;
  bill_date: string;
  due_date: string | null;
  note: string;
  attachment: string | null;
  status: BillStatus;
  status_display: string;
  posted_at: string | null;
  journal_entry: string | null;
  subtotal: string;
  total_vat: string;
  total_amount: string;
  paid_amount: string;
  balance_amount: string;
  lines: BillLine[];
  created_at: string;
  updated_at: string;
}

interface SupplierChoice {
  id: string;
  company_name: string;
}

interface AccountChoice {
  id: string;
  code: string;
  name: string;
}

interface TaxRateChoice {
  id: string;
  name: string;
  tax_type: string;
  rate: string;
}

interface ProductChoice {
  id: string;
  code: string;
  name: string;
}

const inputSt: React.CSSProperties = {
  width: '100%',
  height: 34,
  borderRadius: 7,
  border: '1px solid #e0e0e0',
  padding: '0 10px',
  fontSize: 13.5,
  color: '#1a1a1a',
  outline: 'none',
  fontFamily: "'Heebo', sans-serif",
  backgroundColor: '#fff',
};

function statusPill(status: BillStatus) {
  const posted = status === 'posted';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, paddingInline: 8,
      borderRadius: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
      backgroundColor: posted ? '#dcfce7' : '#fef3c7',
      color: posted ? '#16a34a' : '#b45309',
    }}>
      {posted ? 'POSTED' : 'DRAFT'}
    </span>
  );
}

function fmt(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v || '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildLineDescription(line: BillLine): string {
  const tags = line.selected_products
    .map((p) => `${p.id}|${encodeURIComponent(p.name)}|${encodeURIComponent(p.code ?? '')}`)
    .join(';');
  const prefix = tags ? `[products:${tags}] ` : '';
  return `${prefix}${line.description_text || ''}`.trim();
}

function parseLineDescription(raw: string | null | undefined): Pick<BillLine, 'description_text' | 'selected_products'> {
  const v = raw ?? '';
  const m = v.match(/^\[products:(.*?)\]\s*/);
  if (!m) return { description_text: v, selected_products: [] };
  const products: { id: string; name: string; code?: string }[] = [];
  (m[1] || '').split(';').forEach((chunk) => {
    const [id, nameEnc, codeEnc] = chunk.split('|');
    if (!id) return;
    products.push({
      id,
      name: decodeURIComponent(nameEnc || ''),
      code: decodeURIComponent(codeEnc || ''),
    });
  });
  return { description_text: v.replace(/^\[products:(.*?)\]\s*/, ''), selected_products: products };
}

function BillsList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<BillListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BillsTab>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierChoice[]>([]);
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

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get<{ results: any[] }>('/api/v1/purchases/suppliers/?page_size=200&active=true');
      setSuppliers((data.results ?? []).map((s) => ({ id: s.id, company_name: s.company_name })));
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
      if (supplier) params.set('supplier', supplier);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const { data } = await api.get<{ count: number; results: BillListRow[] }>(`/api/v1/purchases/bills/?${params}`);
      setRows(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search, status, supplier, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
    fetchRows();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRows(), 320);
  }, [search, status, supplier, dateFrom, dateTo]);

  const TH: React.CSSProperties = {
    padding: '10px 10px', fontSize: 12, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '9px 10px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle', whiteSpace: 'nowrap',
  };

  function isTabMatch(row: BillListRow, t: BillsTab) {
    const due = row.due_date ? new Date(row.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due) due.setHours(0, 0, 0, 0);

    const totalAmount = Number(row.total_amount) || 0;
    const payments = Number(row.payments) || 0;
    const balance = Number(row.balance) || Math.max(totalAmount - payments, 0);
    const isPaid = balance <= 0 || payments >= totalAmount;

    if (t === 'all') return true;
    if (t === 'to_complete') return row.status === 'draft';
    if (t === 'to_authorize') return row.status === 'draft';
    if (t === 'to_pay') return row.status === 'posted' && !isPaid && (!due || due >= today);
    if (t === 'overdue') return row.status === 'posted' && !isPaid && !!due && due < today;
    if (t === 'paid') return row.status === 'posted' && isPaid;
    return true;
  }

  const visibleRows = useMemo(
    () => rows.filter((r) => isTabMatch(r, tab)),
    [rows, tab],
  );

  const tabs: { id: BillsTab; label: string }[] = [
    { id: 'all', label: 'All Bills' },
    { id: 'to_complete', label: 'To Complete' },
    { id: 'to_authorize', label: 'To Authorize' },
    { id: 'to_pay', label: 'To Pay' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'paid', label: 'Paid' },
  ];

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                height: 34,
                paddingInline: 12,
                border: 'none',
                borderBottom: active ? '2px solid #35C0A3' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: active ? '#35C0A3' : '#6b7280',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
            style={{ ...inputSt, paddingLeft: 30 }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          />
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
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>Supplier</div>
                  <select value={supplier} onChange={(e) => setSupplier(e.target.value)} style={{ ...inputSt, height: 34 }}>
                    <option value="">All</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
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
                  <button onClick={() => { setStatus(''); setSupplier(''); setDateFrom(''); setDateTo(''); setFilterOpen(false); }}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>
                    Reset
                  </button>
                  <button onClick={() => setFilterOpen(false)}
                    style={{ height: 34, paddingInline: 14, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 500 }}>
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => nav('/purchase/bills/add')}
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
              <th style={TH}>Bill #</th>
              <th style={TH}>Supplier</th>
              <th style={TH}>Date</th>
              <th style={TH}>Due Date</th>
              <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
              <th style={{ ...TH, textAlign: 'right' }}>Payments</th>
              <th style={{ ...TH, textAlign: 'right' }}>Balance</th>
              <th style={TH}>Product</th>
              <th style={TH}>Line Item Description</th>
              <th style={{ ...TH, textAlign: 'right' }}>Qty</th>
              <th style={{ ...TH, textAlign: 'right' }}>Price</th>
              <th style={TH}>Account</th>
              <th style={TH}>Tax rate</th>
              <th style={{ ...TH, textAlign: 'right' }}>Amount inc/ex tax</th>
              <th style={{ ...TH, borderRight: 'none' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>Loading bills…</td></tr>
            ) : visibleRows.length === 0 ? (
              <tr><td colSpan={16} style={{ ...TD, textAlign: 'center', padding: '40px 0', color: '#aaa', borderRight: 'none' }}>No bills found.</td></tr>
            ) : visibleRows.map((r) => (
              <tr key={r.id} style={{ backgroundColor: '#fff', cursor: 'pointer' }} onClick={() => nav(`/purchase/bills/${r.id}`)}>
                <td style={TD}>{statusPill(r.status)}</td>
                <td style={{ ...TD, fontWeight: 600 }}>{r.bill_number}</td>
                <td style={TD}>{r.supplier_name}</td>
                <td style={TD}>{r.bill_date}</td>
                <td style={TD}>{r.due_date || '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_amount)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.payments)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.balance)}</td>
                <td style={TD}>{r.supplier_name}</td>
                <td style={{ ...TD, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.line_item_description || '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.qty)}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.rate)}</td>
                <td style={TD}>{r.account_display || '—'}</td>
                <td style={TD}>{r.tax_rate_display || '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount)}</td>
                <td style={{ ...TD, borderRight: 'none' }}>{r.created_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && visibleRows.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f5f5f5' }}>
            <span style={{ fontSize: 12.5, color: '#aaa' }}>{visibleRows.length} shown · {total} total</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BillsEditor() {
  const { id } = useParams<{ id: string }>();
  const isCreate = id === 'add';
  const nav = useNavigate();

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const [billId, setBillId] = useState<string | null>(isCreate ? null : id || null);
  const [status, setStatus] = useState<BillStatus>('draft');

  const [billNumber, setBillNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [mergeLineItem, setMergeLineItem] = useState(true);
  const [priceMode, setPriceMode] = useState<'inc_tax' | 'ex_tax'>('inc_tax');
  const [lines, setLines] = useState<BillLine[]>([
    { description_text: '', selected_products: [], account: '', quantity: '1', unit_price: '', tax_rate: '', discount_percent: '0' },
  ]);
  const [products, setProducts] = useState<ProductChoice[]>([]);
  const [openProductLine, setOpenProductLine] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});

  const [suppliers, setSuppliers] = useState<SupplierChoice[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateChoice[]>([]);

  const canEdit = status === 'draft';

  const subtotal = useMemo(() => lines.reduce((acc, l) => acc + ((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)), 0), [lines]);
  const totalVat = useMemo(() => lines.reduce((acc, l) => {
    const lineBase = ((Number(l.quantity) || 0) * (Number(l.unit_price) || 0));
    const disc = Number(l.discount_percent) || 0;
    const afterDisc = lineBase - (lineBase * disc / 100);
    const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
    return acc + (afterDisc * rate / 100);
  }, 0), [lines, taxRates]);
  const total = subtotal + totalVat;

  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, aRes, tRes, pRes] = await Promise.all([
        api.get<{ results: any[] }>('/api/v1/purchases/suppliers/?page_size=200&active=true'),
        api.get<any[]>('/api/v1/accounting/chart-of-accounts/tree/'),
        api.get<{ results: any[] }>('/api/v1/accounting/tax-rates/?page_size=200&active=true'),
        api.get<{ results: any[] }>('/api/v1/products/items/?page_size=200&active=true'),
      ]);
      setSuppliers((sRes.data.results ?? []).map((s) => ({ id: s.id, company_name: s.company_name })));
      const flat: AccountChoice[] = [];
      function walk(nodes: any[]) {
        nodes.forEach((n) => {
          flat.push({ id: n.id, code: n.code, name: n.name });
          if (n.children && Array.isArray(n.children)) walk(n.children);
        });
      }
      if (Array.isArray(aRes.data)) walk(aRes.data);
      setAccounts(flat);
      setTaxRates((tRes.data.results ?? []).map((t) => ({ id: t.id, name: t.name, tax_type: t.tax_type, rate: t.rate })));
      setProducts((pRes.data.results ?? []).map((p) => ({ id: p.id, code: p.code ?? '', name: p.name ?? '' })));
    } catch {
      /* silent */
    }
  }, []);

  const fetchBill = useCallback(async () => {
    if (isCreate || !id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<BillDetail>(`/api/v1/purchases/bills/${id}/`);
      setBillId(data.id);
      setStatus(data.status);
      setBillNumber(data.bill_number ?? '');
      setSupplier(data.supplier ?? '');
      setBillDate(data.bill_date ?? '');
      setDueDate(data.due_date ?? '');
      setNote(data.note ?? '');
      setAttachmentName(data.attachment ?? '');
      setLines((data.lines ?? []).map((l) => ({
        id: l.id,
        ...parseLineDescription((l as unknown as { description?: string }).description),
        account: l.account ?? '',
        quantity: String(l.quantity ?? ''),
        unit_price: String(l.unit_price ?? ''),
        tax_rate: l.tax_rate ?? '',
        discount_percent: String(l.discount_percent ?? '0'),
      })));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, isCreate]);

  useEffect(() => {
    fetchMeta();
    fetchBill();
  }, []);

  function setLine(idx: number, patch: Partial<BillLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { description_text: '', selected_products: [], account: '', quantity: '1', unit_price: '', tax_rate: '', discount_percent: '0' }]);
  }
  function clearLine(idx: number) {
    setLines((prev) => prev.map((l, i) => i === idx ? { description_text: '', selected_products: [], account: '', quantity: '1', unit_price: '', tax_rate: '', discount_percent: '0' } : l));
  }
  function removeLine(idx: number) {
    setLines((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  async function saveDraft(navigateAfterCreate = true): Promise<string | null> {
    if (!canEdit) return null;
    setSaving(true);
    setError('');
    try {
      const body = {
        bill_number: billNumber,
        supplier,
        bill_date: billDate,
        due_date: dueDate || null,
        note,
        lines: lines.map((l) => ({
          description: buildLineDescription(l),
          account: l.account,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate || null,
          discount_percent: l.discount_percent || '0',
        })),
      };
      const { data } = billId
        ? await api.patch<BillDetail>(`/api/v1/purchases/bills/${billId}/`, body)
        : await api.post<BillDetail>('/api/v1/purchases/bills/', body);

      // optional attachment upload via patch multipart
      if (attachmentFile && data.id) {
        const fd = new FormData();
        fd.append('attachment', attachmentFile);
        await api.patch(`/api/v1/purchases/bills/${data.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setBillId(data.id);
      setStatus(data.status);
      if (navigateAfterCreate && (!id || id === 'add')) nav(`/purchase/bills/${data.id}`, { replace: true });
      return data.id;
    } catch (err) {
      setError(parseApiError(err));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function postBill() {
    let targetId = billId;
    // In create mode, allow "Confirm & Post" directly by saving first.
    if (!targetId) {
      targetId = await saveDraft(false);
      if (!targetId) return;
      setBillId(targetId);
    }
    setPosting(true);
    setError('');
    try {
      const { data } = await api.post<BillDetail>(`/api/v1/purchases/bills/${targetId}/post/`, {});
      setStatus(data.status);
      if (!id || id === 'add') nav(`/purchase/bills/${targetId}`, { replace: true });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPosting(false);
    }
  }

  async function deleteBill() {
    if (!billId) return;
    if (!window.confirm('Delete this draft bill?')) return;
    try {
      await api.delete(`/api/v1/purchases/bills/${billId}/`);
      nav('/purchase/bills');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) {
    return <div style={{ padding: '24px 28px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;
  }

  const TH: React.CSSProperties = {
    padding: '8px 8px', fontSize: 11.5, fontWeight: 500, color: '#888',
    borderBottom: '1px solid #e9ecef', borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa', whiteSpace: 'nowrap', textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '6px 8px', fontSize: 12.5, color: '#333',
    borderBottom: '1px solid #eef2f5', borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Record Bill</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusPill(status)}
            <button onClick={() => nav('/purchase/bills')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            {canEdit && (
              <button onClick={() => { void saveDraft(); }} disabled={saving} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#666', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5 }}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            )}
            {canEdit && (
              <button onClick={postBill} disabled={posting} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: posting ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: posting ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600 }}>
                {posting ? 'Posting…' : 'Confirm & Post'}
              </button>
            )}
            {canEdit && billId && (
              <button onClick={deleteBill} style={{ width: 32, height: 32, borderRadius: 7, border: '1px solid #fca5a5', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ margin: 12, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.8fr)', gap: 14, padding: 14 }}>
          {/* Left side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                Bill Information
              </div>
              <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: '#555' }}>Bill Number*</span>
                <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} placeholder="Empty" />

                <span style={{ fontSize: 12.5, color: '#555' }}>Supplier*</span>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={!canEdit} style={{ ...inputSt, cursor: canEdit ? 'pointer' : 'not-allowed', backgroundColor: canEdit ? '#fff' : '#f5f5f5' }}>
                  <option value="">Select</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>

                <span style={{ fontSize: 12.5, color: '#555' }}>Date*</span>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />

                <span style={{ fontSize: 12.5, color: '#555' }}>Due Date*</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEdit} style={{ ...inputSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />
              </div>
            </div>

            {/* Lines */}
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                Line item/s
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #edf2f7', backgroundColor: '#fff' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#4b5563' }}>
                  <input type="checkbox" checked={mergeLineItem} onChange={(e) => setMergeLineItem(e.target.checked)} disabled={!canEdit} style={{ accentColor: '#35C0A3' }} />
                  Merge line item
                </label>
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
                    <th style={TH}>Account*</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Qty*</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Price</th>
                    <th style={TH}>Tax rate</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Discount</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                    <th style={{ ...TH, width: 36, borderRight: 'none' }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx}>
                      <td style={TD}>
                        <div style={{ position: 'relative' }}>
                          <div style={{ ...inputSt, height: 'auto', minHeight: 30, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, padding: '3px 6px' }}>
                            {l.selected_products.map((p) => (
                              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#ecfeff', border: '1px solid #a5f3fc', color: '#0f766e', borderRadius: 999, padding: '1px 6px', fontSize: 11.5 }}>
                                {(p.code ? `${p.code} - ` : '') + p.name}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setLine(idx, { selected_products: l.selected_products.filter((x) => x.id !== p.id) })}
                                    style={{ border: 'none', background: 'transparent', color: '#0f766e', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}
                                  >
                                    x
                                  </button>
                                )}
                              </span>
                            ))}
                            <input
                              value={l.description_text}
                              onChange={(e) => {
                                setLine(idx, { description_text: e.target.value });
                                setProductSearch((prev) => ({ ...prev, [idx]: e.target.value }));
                              }}
                              onFocus={() => setOpenProductLine(idx)}
                              onBlur={() => setTimeout(() => setOpenProductLine((cur) => (cur === idx ? null : cur)), 120)}
                              disabled={!canEdit}
                              style={{ border: 'none', outline: 'none', fontSize: 12.5, minWidth: 120, flex: 1, fontFamily: "'Heebo', sans-serif", backgroundColor: 'transparent' }}
                              placeholder="Description"
                            />
                          </div>
                          {canEdit && openProductLine === idx && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', maxHeight: 180, overflowY: 'auto' }}>
                              {products
                                .filter((p) => !l.selected_products.some((sp) => sp.id === p.id))
                                .filter((p) => {
                                  const q = (productSearch[idx] ?? '').trim().toLowerCase();
                                  if (!q) return true;
                                  return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
                                })
                                .slice(0, 20)
                                .map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setLine(idx, { selected_products: [...l.selected_products, { id: p.id, name: p.name, code: p.code }] });
                                      setOpenProductLine(idx);
                                    }}
                                    style={{ width: '100%', textAlign: 'left', border: 'none', backgroundColor: '#fff', padding: '7px 10px', fontSize: 12.5, color: '#374151', cursor: 'pointer' }}
                                  >
                                    {p.code ? `${p.code} - ` : ''}{p.name}
                                  </button>
                                ))}
                              {products.length === 0 && <div style={{ padding: '8px 10px', fontSize: 12, color: '#9ca3af' }}>No products found.</div>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={TD}>
                        <select value={l.account} onChange={(e) => setLine(idx, { account: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                          <option value="">Required</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                      <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(idx, { unit_price: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} placeholder="Required" /></td>
                      <td style={TD}>
                        <select value={l.tax_rate} onChange={(e) => setLine(idx, { tax_rate: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30 }}>
                          <option value="">Required</option>
                          {taxRates.filter((t) => t.tax_type === 'purchases').map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({fmt(t.rate)}%)</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...TD, textAlign: 'right' }}><input type="number" step="0.01" value={l.discount_percent} onChange={(e) => setLine(idx, { discount_percent: e.target.value })} disabled={!canEdit} style={{ ...inputSt, height: 30, textAlign: 'right' }} /></td>
                      <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {(() => {
                          const qty = Number(l.quantity) || 0;
                          const price = Number(l.unit_price) || 0;
                          const disc = Number(l.discount_percent) || 0;
                          const base = qty * price;
                          const afterDisc = base - (base * disc / 100);
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderTop: '1px solid #f5f5f5' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canEdit && (
                    <button onClick={addLine} type="button" style={{ height: 30, paddingInline: 12, borderRadius: 7, border: '1px solid #bbf7e8', backgroundColor: '#f0fdf9', color: '#0f766e', cursor: 'pointer', fontSize: 12.5 }}>
                      + Add line
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: 12.5, color: '#555', lineHeight: 1.7 }}>
                  <div>Subtotal <span style={{ marginLeft: 10, minWidth: 80, display: 'inline-block', textAlign: 'right' }}>{fmt(String(subtotal))}</span></div>
                  <div>Total VAT <span style={{ marginLeft: 10, minWidth: 80, display: 'inline-block', textAlign: 'right' }}>{fmt(String(totalVat))}</span></div>
                  <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700, color: '#111827' }}>Total <span style={{ marginLeft: 10 }}>SAR {fmt(String(total))}</span></div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', borderBottom: '1px solid #edf2f7', fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                Note
              </div>
              <div style={{ padding: 12 }}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canEdit}
                  style={{ ...inputSt, minHeight: 60, height: 60, paddingTop: 8, resize: 'vertical' }} placeholder="Empty" />
              </div>
            </div>
          </div>

          {/* Right upload panel */}
          <div style={{ border: '1.5px dashed #d1d5db', borderRadius: 12, backgroundColor: '#f9fafb', minHeight: 420, padding: '18px 16px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#666', marginBottom: 14 }}>Upload Bill from your Computer</div>
            <label style={{ width: '100%', minHeight: 320, borderRadius: 10, border: '1px dashed #d1d5db', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: canEdit ? 'pointer' : 'not-allowed', color: canEdit ? '#666' : '#aaa', textAlign: 'center', padding: 14, boxSizing: 'border-box' }}>
              <UploadCloud size={22} style={{ marginBottom: 8 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Drag a file or click to upload
                <br />
                Upload PDFs, image or other document
                <br />
                Max file size: 15MB
              </span>
              <input type="file" style={{ display: 'none' }} disabled={!canEdit} onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAttachmentFile(f);
                setAttachmentName(f?.name ?? '');
              }} />
            </label>
            {attachmentName && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>
                Attachment: {attachmentName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Bills() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <BillsEditor />;
  return <BillsList />;
}

