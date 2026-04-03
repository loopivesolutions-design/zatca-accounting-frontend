import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, UploadCloud } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

function billIdempotencyKey() {
  return crypto.randomUUID();
}

type BillStatus = 'draft' | 'posted' | 'partially_paid' | 'paid';
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
  external_reference?: string | null;
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

const createSectionHeaderSt: React.CSSProperties = {
  width: 600,
  height: 42,
  background: '#F2F7F6',
  borderRadius: 6,
  padding: '16px 40px',
  boxSizing: 'border-box',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '21px',
  letterSpacing: '0.03em',
  color: '#010101',
  display: 'flex',
  alignItems: 'center',
};

/** Full-width section title bar — matches image1 */
const sectionHeaderBarFullSt: React.CSSProperties = {
  ...createSectionHeaderSt,
  width: '100%',
  maxWidth: '100%',
  background: '#F2F7F6',
  borderRadius: 0,
};

const BILL_LINE_H_PAD = 40;

/** Line items grid — create bill editor (flex rows, fixed column widths) */
const BILL_LINE_GRID_WIDTH = 834;
const BILL_LINE_GAP = 15;

/** Line item/s toolbar — merge row + price mode (aligned with table / Bill form horizontal padding) */
const billLineToolbarHostSt: React.CSSProperties = {
  borderBottom: '1px solid #edf2f7',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  minHeight: 65,
  padding: '22px 40px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 16,
};

const billLineMergeLabelTextSt: React.CSSProperties = {
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '18px',
  letterSpacing: '0.03em',
  color: '#0E4D41',
};

const billLinePriceModeShellSt: React.CSSProperties = {
  boxSizing: 'border-box',
  width: 124,
  minHeight: 22,
  padding: '6px 10px',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  border: '0.8px solid #979797',
  borderRadius: 2,
  backgroundColor: '#fff',
  flexShrink: 0,
};

const billLinePriceModeSelectSt: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '100%',
  border: 'none',
  outline: 'none',
  margin: 0,
  padding: 0,
  backgroundColor: 'transparent',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '18px',
  letterSpacing: '0.02em',
  color: '#616161',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none',
};

const billLineFooterBtnBaseSt: React.CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 10px',
  gap: 4,
  height: 22,
  border: '0.8px solid #979797',
  borderRadius: 2,
  backgroundColor: '#fff',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '18px',
  letterSpacing: '0.02em',
  color: '#616161',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const billLineFooterAddBtnSt: React.CSSProperties = { ...billLineFooterBtnBaseSt, width: 77 };
const billLineFooterClearBtnSt: React.CSSProperties = { ...billLineFooterBtnBaseSt, width: 86 };

const billLineTotalsSubtotalRowSt: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 0,
  gap: 167,
  width: 259,
  minHeight: 10,
  boxSizing: 'border-box',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '21px',
  letterSpacing: '0.02em',
  color: '#303030',
};

const billLineTotalsVatRowSt: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 0,
  gap: 160,
  width: 259,
  minHeight: 10,
  boxSizing: 'border-box',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 14,
  lineHeight: '21px',
  letterSpacing: '0.02em',
  color: '#616161',
};

const billLineTotalsGrandRowSt: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 0,
  gap: 85,
  width: 259,
  height: 24,
  boxSizing: 'border-box',
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 20,
  lineHeight: '29px',
  letterSpacing: '0.02em',
  color: '#303030',
};

const billLineTotalsHrSt: React.CSSProperties = {
  width: 268,
  height: 0,
  border: 'none',
  borderTop: '2px solid #DEDEDE',
  margin: 0,
  padding: 0,
};

const billLineTheadTrSt: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '0px 12px',
  gap: BILL_LINE_GAP,
  width: BILL_LINE_GRID_WIDTH,
  minWidth: BILL_LINE_GRID_WIDTH,
  height: 26,
  boxSizing: 'border-box',
  background: '#EFF6E2',
  borderRadius: 6,
};

const billLineThText: React.CSSProperties = {
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 11,
  lineHeight: '16px',
  letterSpacing: '0.03em',
  color: '#303030',
  boxSizing: 'border-box',
  padding: '8px 12px',
  height: 26,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  margin: 0,
};

const billLineThDesc: React.CSSProperties = { ...billLineThText, width: 175, flex: '0 0 175px' };
const billLineThAcct: React.CSSProperties = { ...billLineThText, width: 135, flex: '0 0 135px' };
const billLineThQty: React.CSSProperties = { ...billLineThText, width: 53, flex: '0 0 53px' };
const billLineThPrice: React.CSSProperties = { ...billLineThText, width: 80, flex: '0 0 80px' };
const billLineThTax: React.CSSProperties = { ...billLineThText, width: 135, flex: '0 0 135px' };
const billLineThDisc: React.CSSProperties = { ...billLineThText, width: 80, flex: '0 0 80px', justifyContent: 'flex-end' };
const billLineThTotal: React.CSSProperties = { ...billLineThText, width: 62, flex: '0 0 62px', justifyContent: 'flex-end' };

const billLineTbodyTrSt: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  gap: BILL_LINE_GAP,
  width: BILL_LINE_GRID_WIDTH,
  minWidth: BILL_LINE_GRID_WIDTH,
  minHeight: 52,
  boxSizing: 'border-box',
};

const billLineTdText: React.CSSProperties = {
  fontFamily: "'Heebo', sans-serif",
  fontStyle: 'normal',
  fontWeight: 400,
  fontSize: 12,
  lineHeight: '18px',
  letterSpacing: '0.03em',
  color: '#979797',
};

const billLineDescShell: React.CSSProperties = {
  boxSizing: 'border-box',
  padding: '9px 12px',
  width: 174,
  height: 'auto',
  minHeight: 28,
  flex: '0 0 174px',
  border: '0.8px solid #979797',
  borderRadius: 4,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 4,
  backgroundColor: '#fff',
};

const billLineSelectShell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 10px',
  gap: 51,
  width: 135,
  flex: '0 0 135px',
  height: 28,
  boxSizing: 'border-box',
  border: '0.8px solid #979797',
  borderRadius: 4,
  backgroundColor: '#FFFFFF',
};

const billLineNumericShellEnd: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '9px 12px',
  gap: 10,
  height: 28,
  boxSizing: 'border-box',
  border: '0.8px solid #979797',
  borderRadius: 4,
  backgroundColor: '#fff',
};

const billLineQtyShell: React.CSSProperties = { ...billLineNumericShellEnd, width: 53, flex: '0 0 53px' };
const billLinePriceShell: React.CSSProperties = { ...billLineNumericShellEnd, width: 80, flex: '0 0 80px' };
const billLineDiscShell: React.CSSProperties = { ...billLineNumericShellEnd, width: 80, flex: '0 0 80px' };
const billLineTotalShell: React.CSSProperties = {
  ...billLineNumericShellEnd,
  width: 63,
  flex: '0 0 63px',
  border: 'none',
  backgroundColor: 'transparent',
};

const billLineInputBare: React.CSSProperties = {
  ...billLineTdText,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  padding: 0,
  margin: 0,
  width: '100%',
  minWidth: 0,
};

const billLineSelectBare: React.CSSProperties = {
  ...billLineTdText,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  padding: 0,
  margin: 0,
  flex: 1,
  minWidth: 0,
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none',
};

function statusPill(status: BillStatus) {
  const config: Record<BillStatus, { bg: string; color: string; label: string }> = {
    draft:           { bg: '#fef3c7', color: '#b45309', label: 'DRAFT' },
    posted:          { bg: '#dbeafe', color: '#1d4ed8', label: 'POSTED' },
    partially_paid:  { bg: '#fde68a', color: '#92400e', label: 'PARTIAL' },
    paid:            { bg: '#dcfce7', color: '#16a34a', label: 'PAID' },
  };
  const { bg, color, label } = config[status] ?? config.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, paddingInline: 8,
      borderRadius: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
      backgroundColor: bg, color,
    }}>
      {label}
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
    void fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void fetchRows(), search ? 320 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, status, supplier, dateFrom, dateTo, fetchRows]);

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

    const isEffectivelyPosted = ['posted', 'partially_paid', 'paid'].includes(row.status);
    if (t === 'all') return true;
    if (t === 'to_complete') return row.status === 'draft';
    if (t === 'to_authorize') return row.status === 'draft';
    if (t === 'to_pay') return isEffectivelyPosted && !isPaid && (!due || due >= today);
    if (t === 'overdue') return isEffectivelyPosted && !isPaid && !!due && due < today;
    if (t === 'paid') return row.status === 'paid' || (isEffectivelyPosted && isPaid);
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
                userSelect: 'none',
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
  const [externalReference, setExternalReference] = useState('');
  const [supplier, setSupplier] = useState('');
  const [billDate, setBillDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string>('');
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

  /** Optional overrides for POST …/post/ (§13.6) */
  const [postPayableAccount, setPostPayableAccount] = useState('');
  const [postVatAccount, setPostVatAccount] = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [postMemo, setPostMemo] = useState('');

  const canEdit = status === 'draft';

  const subtotal = useMemo(() => lines.reduce((acc, l) => {
    const base = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    const disc = Number(l.discount_percent) || 0;
    return acc + (base - (base * disc / 100));
  }, 0), [lines]);
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
          if (!n.is_archived) {
            flat.push({ id: n.id, code: n.code, name: n.name });
          }
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
      setExternalReference(data.external_reference ?? '');
      setSupplier(data.supplier ?? '');
      setBillDate(data.bill_date ?? '');
      setDueDate(data.due_date ?? '');
      setNote(data.note ?? '');
      setAttachmentName(data.attachment ?? '');
      setAttachmentPreview(data.attachment ?? '');
      setPostPayableAccount('');
      setPostVatAccount('');
      setPostingDate('');
      setPostMemo('');
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
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    void fetchBill();
  }, [fetchBill]);

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
  function resetLinesToDefault() {
    setLines([{ description_text: '', selected_products: [], account: '', quantity: '1', unit_price: '', tax_rate: '', discount_percent: '0' }]);
  }

  async function saveDraft(navigateAfterCreate = true): Promise<string | null> {
    if (!canEdit) return null;
    setSaving(true);
    setError('');
    try {
      const body = {
        bill_number: billNumber,
        external_reference: externalReference.trim() || null,
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
      const idemHeader = { headers: { 'Idempotency-Key': billIdempotencyKey() } };
      const { data } = billId
        ? await api.patch<BillDetail>(`/api/v1/purchases/bills/${billId}/`, body, idemHeader)
        : await api.post<BillDetail>('/api/v1/purchases/bills/', body, idemHeader);

      // optional attachment upload via patch multipart
      if (attachmentFile && data.id) {
        const fd = new FormData();
        fd.append('attachment', attachmentFile);
        await api.patch(`/api/v1/purchases/bills/${data.id}/`, fd, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Idempotency-Key': billIdempotencyKey(),
          },
        });
      }

      setBillId(data.id);
      setStatus(data.status);
      if (navigateAfterCreate && (!id || id === 'add')) nav('/purchase/bills', { replace: true });
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
      const postBody: Record<string, unknown> = {};
      if (postPayableAccount) postBody.payable_account = postPayableAccount;
      if (postVatAccount) postBody.vat_account = postVatAccount;
      if (postingDate.trim()) postBody.posting_date = postingDate.trim();
      if (postMemo.trim()) postBody.memo = postMemo.trim();

      const { data } = await api.post<BillDetail>(
        `/api/v1/purchases/bills/${targetId}/post/`,
        postBody,
        { headers: { 'Idempotency-Key': billIdempotencyKey() } },
      );
      setStatus(data.status);
      nav('/purchase/bills', { replace: true });
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
      await api.delete(`/api/v1/purchases/bills/${billId}/`, {
        headers: { 'Idempotency-Key': billIdempotencyKey() },
      });
      nav('/purchase/bills');
    } catch (err) {
      alert(parseApiError(err));
    }
  }

  if (loading) {
    return <div style={{ padding: '24px 28px', color: '#999', fontFamily: "'Heebo', sans-serif" }}>Loading…</div>;
  }

  const editorLabelSt: React.CSSProperties = {
    fontFamily: "'Heebo', sans-serif",
    fontStyle: 'normal',
    fontWeight: 400,
    fontSize: 12,
    lineHeight: '18px',
    letterSpacing: '0.03em',
    color: '#303030',
  };

  const editorInputNoIconSt: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: 36,
    border: '0.8px solid #979797',
    borderRadius: 5,
    padding: '0 18px',
    fontFamily: "'Heebo', sans-serif",
    fontSize: 13,
    lineHeight: '36px',
    letterSpacing: '0.03em',
    color: '#1a1a1a',
    outline: 'none',
    backgroundColor: '#fff',
  };

  const editorInputWithIconSt: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: 36,
    border: '0.8px solid #979797',
    borderRadius: 5,
    padding: '0 18px',
    fontFamily: "'Heebo', sans-serif",
    fontSize: 13,
    lineHeight: '36px',
    letterSpacing: '0.03em',
    color: '#1a1a1a',
    outline: 'none',
    backgroundColor: '#fff',
  };

  return (
    <div className="bill-create-editor" style={{ padding: '24px 28px', fontFamily: "'Heebo', sans-serif", height: '100%', overflowY: 'auto', boxSizing: 'border-box', backgroundColor: '#f4f6f8' }}>
      <style>{`
        .bill-create-editor input::placeholder,
        .bill-create-editor textarea::placeholder {
          font-family: 'Heebo', sans-serif;
          font-style: normal;
          font-weight: 400;
          font-size: 13px;
          line-height: 19px;
          letter-spacing: 0.03em;
          color: #979797;
        }
        .bill-create-editor .bill-line-ph::placeholder {
          font-family: 'Heebo', sans-serif;
          font-style: normal;
          font-weight: 400;
          font-size: 12px;
          line-height: 18px;
          letter-spacing: 0.03em;
          color: #979797;
        }
      `}</style>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#1a1a1a' }}>Record Bill</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusPill(status)}
            <button onClick={() => nav('/purchase/bills')} style={{ height: 32, paddingInline: 12, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: 13.5 }}>Cancel</button>
            {canEdit && (
              <button onClick={() => { void saveDraft(); }} disabled={saving} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#666', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <img src="/FileDashed.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            )}
            {canEdit && (
              <button onClick={postBill} disabled={posting} style={{ height: 32, paddingInline: 14, borderRadius: 7, border: 'none', backgroundColor: posting ? '#a8e4d8' : '#35C0A3', color: '#fff', cursor: posting ? 'not-allowed' : 'pointer', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <img src="/BookOpen.png" alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
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
              <div style={{ ...sectionHeaderBarFullSt, borderBottom: '1px solid #edf2f7' }}>
                Bill Information
              </div>
              <div style={{ padding: '30px 40px', width: '100%', boxSizing: 'border-box', minHeight: 264, display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 25, columnGap: 14, alignItems: 'center' }}>
                <span style={editorLabelSt}>Bill Number*</span>
                <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} disabled={!canEdit} style={{ ...editorInputNoIconSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} placeholder="Empty" />

                <span style={editorLabelSt}>External ref.</span>
                <input value={externalReference} onChange={(e) => setExternalReference(e.target.value)} disabled={!canEdit} style={{ ...editorInputNoIconSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} placeholder="Optional — ERP dedupe id" title="Must be unique per supplier when set" />

                <span style={editorLabelSt}>Supplier*</span>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} disabled={!canEdit} style={{ ...editorInputWithIconSt, cursor: canEdit ? 'pointer' : 'not-allowed', backgroundColor: canEdit ? '#fff' : '#f5f5f5' }}>
                  <option value="">Select</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>

                <span style={editorLabelSt}>Date*</span>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} disabled={!canEdit} style={{ ...editorInputWithIconSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />

                <span style={editorLabelSt}>Due Date*</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEdit} style={{ ...editorInputWithIconSt, backgroundColor: canEdit ? '#fff' : '#f5f5f5' }} />

                {canEdit && (
                  <>
                    <span style={{ gridColumn: '1 / -1', fontSize: 11.5, fontWeight: 600, color: '#6b7280', marginTop: 6, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                      Confirm &amp; post — optional overrides (defaults: AP 211, VAT 116)
                    </span>
                    <span style={{ fontSize: 12.5, color: '#555' }}>Payable acct.</span>
                    <select value={postPayableAccount} onChange={(e) => setPostPayableAccount(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                      <option value="">Use default</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 12.5, color: '#555' }}>VAT acct.</span>
                    <select value={postVatAccount} onChange={(e) => setPostVatAccount(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                      <option value="">Use default</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 12.5, color: '#555' }}>Posting date</span>
                    <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} style={inputSt} />
                    <span style={{ fontSize: 12.5, color: '#555' }}>Post memo</span>
                    <input value={postMemo} onChange={(e) => setPostMemo(e.target.value)} style={inputSt} placeholder="Optional journal memo" />
                  </>
                )}
              </div>
            </div>

            {/* Lines */}
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ ...sectionHeaderBarFullSt, borderBottom: '1px solid #edf2f7' }}>
                Line item/s
              </div>
              <div style={billLineToolbarHostSt}>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={mergeLineItem}
                    onChange={(e) => setMergeLineItem(e.target.checked)}
                    disabled={!canEdit}
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: 'hidden',
                      clip: 'rect(0,0,0,0)',
                      clipPath: 'inset(50%)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      border: mergeLineItem ? '1px solid transparent' : '1.5px solid #0E4D41',
                      backgroundColor: mergeLineItem ? '#35C0A3' : '#fff',
                    }}
                  >
                    {mergeLineItem ? <Check size={10} strokeWidth={2.5} color="#fff" /> : null}
                  </span>
                  <span style={billLineMergeLabelTextSt}>Merge line item</span>
                </label>
                <div style={billLinePriceModeShellSt}>
                  <select
                    value={priceMode}
                    onChange={(e) => setPriceMode(e.target.value as 'inc_tax' | 'ex_tax')}
                    disabled={!canEdit}
                    style={{
                      ...billLinePriceModeSelectSt,
                      cursor: canEdit ? 'pointer' : 'not-allowed',
                      opacity: canEdit ? 1 : 0.65,
                    }}
                  >
                    <option value="inc_tax">Price are inc.tax</option>
                    <option value="ex_tax">Price are ex.tax</option>
                  </select>
                  <ChevronDown size={8} color="#616161" strokeWidth={2.5} style={{ flexShrink: 0 }} aria-hidden />
                </div>
              </div>
              <div style={{ overflowX: 'auto', backgroundColor: '#fff', paddingLeft: BILL_LINE_H_PAD, paddingRight: BILL_LINE_H_PAD, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div role="row" style={billLineTheadTrSt}>
                      <div role="columnheader" style={billLineThDesc}>Description*</div>
                      <div role="columnheader" style={billLineThAcct}>Account*</div>
                      <div role="columnheader" style={billLineThQty}>Qty*</div>
                      <div role="columnheader" style={billLineThPrice}>Price</div>
                      <div role="columnheader" style={billLineThTax}>Tax rate</div>
                      <div role="columnheader" style={billLineThDisc}>Discount</div>
                      <div role="columnheader" style={billLineThTotal}>Total</div>
                    </div>
                    <div style={{ width: 72, flexShrink: 0 }} aria-hidden />
                  </div>
                  {lines.map((l, idx) => {
                    const lineTotalStr = (() => {
                      const qty = Number(l.quantity) || 0;
                      const price = Number(l.unit_price) || 0;
                      const disc = Number(l.discount_percent) || 0;
                      const base = qty * price;
                      const afterDisc = base - (base * disc / 100);
                      const rate = Number(taxRates.find((t) => t.id === l.tax_rate)?.rate ?? 0);
                      const tax = afterDisc * rate / 100;
                      const lineTotal = priceMode === 'inc_tax' ? afterDisc : afterDisc + tax;
                      return fmt(String(lineTotal));
                    })();
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f4ef' }}>
                        <div role="row" style={billLineTbodyTrSt}>
                          <div role="cell" style={{ position: 'relative', flex: '0 0 174px', width: 174 }}>
                            <div style={billLineDescShell}>
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
                                className="bill-line-ph"
                                value={l.description_text}
                                onChange={(e) => {
                                  setLine(idx, { description_text: e.target.value });
                                  setProductSearch((prev) => ({ ...prev, [idx]: e.target.value }));
                                }}
                                onFocus={() => setOpenProductLine(idx)}
                                onBlur={() => setTimeout(() => setOpenProductLine((cur) => (cur === idx ? null : cur)), 120)}
                                disabled={!canEdit}
                                style={{ ...billLineInputBare, minWidth: 48, flex: 1 }}
                                placeholder="Description or search item"
                              />
                            </div>
                            {canEdit && openProductLine === idx && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 280, zIndex: 50, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', maxHeight: 180, overflowY: 'auto' }}>
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
                          <div role="cell" style={billLineSelectShell}>
                            <select
                              className="bill-line-ph"
                              value={l.account}
                              onChange={(e) => setLine(idx, { account: e.target.value })}
                              disabled={!canEdit}
                              style={billLineSelectBare}
                            >
                              <option value="">required</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                            <ChevronDown size={12} style={{ flexShrink: 0, color: '#979797', pointerEvents: 'none' }} aria-hidden />
                          </div>
                          <div role="cell" style={billLineQtyShell}>
                            <input
                              className="bill-line-ph"
                              type="number"
                              step="0.01"
                              value={l.quantity}
                              onChange={(e) => setLine(idx, { quantity: e.target.value })}
                              disabled={!canEdit}
                              style={{ ...billLineInputBare, textAlign: 'right' }}
                              placeholder="1"
                            />
                          </div>
                          <div role="cell" style={billLinePriceShell}>
                            <input
                              className="bill-line-ph"
                              type="number"
                              step="0.01"
                              value={l.unit_price}
                              onChange={(e) => setLine(idx, { unit_price: e.target.value })}
                              disabled={!canEdit}
                              style={{ ...billLineInputBare, textAlign: 'right' }}
                              placeholder="required"
                            />
                          </div>
                          <div role="cell" style={billLineSelectShell}>
                            <select
                              className="bill-line-ph"
                              value={l.tax_rate}
                              onChange={(e) => setLine(idx, { tax_rate: e.target.value })}
                              disabled={!canEdit}
                              style={billLineSelectBare}
                            >
                              <option value="">required</option>
                              {taxRates.filter((t) => t.tax_type === 'purchases').map((t) => (
                                <option key={t.id} value={t.id}>{t.name} ({fmt(t.rate)}%)</option>
                              ))}
                            </select>
                            <ChevronDown size={12} style={{ flexShrink: 0, color: '#979797', pointerEvents: 'none' }} aria-hidden />
                          </div>
                          <div role="cell" style={billLineDiscShell}>
                            <input
                              className="bill-line-ph"
                              type="number"
                              step="0.01"
                              value={l.discount_percent}
                              onChange={(e) => setLine(idx, { discount_percent: e.target.value })}
                              disabled={!canEdit}
                              style={{ ...billLineInputBare, flex: 1, minWidth: 0, textAlign: 'right' }}
                            />
                            <span style={{ color: '#010101', fontFamily: "'Heebo', sans-serif", fontSize: 12, lineHeight: '18px', flexShrink: 0 }}>%</span>
                          </div>
                          <div
                            role="cell"
                            style={{
                              ...billLineTotalShell,
                              fontVariantNumeric: 'tabular-nums',
                              color: '#010101',
                              fontWeight: 400,
                              fontFamily: "'Heebo', sans-serif",
                              fontSize: 12,
                              lineHeight: '18px',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {lineTotalStr}
                          </div>
                        </div>
                        <div style={{ width: 72, flexShrink: 0, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {canEdit && (
                            <>
                              <button onClick={() => clearLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#666', cursor: 'pointer', fontSize: 11 }}>↺</button>
                              <button onClick={() => removeLine(idx)} type="button" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', backgroundColor: '#fff5f5', color: '#dc2626', cursor: 'pointer' }}>
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `8px ${BILL_LINE_H_PAD}px`, borderTop: '1px solid #f5f5f5', gap: 16, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {canEdit && (
                    <>
                      <button
                        onClick={addLine}
                        type="button"
                        style={billLineFooterAddBtnSt}
                      >
                        <Plus size={8} strokeWidth={2.25} aria-hidden />
                        <span>Add line</span>
                      </button>
                      <button
                        onClick={resetLinesToDefault}
                        type="button"
                        style={billLineFooterClearBtnSt}
                      >
                        <RotateCcw size={10} strokeWidth={2.25} aria-hidden />
                        <span>Clear line</span>
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                  <div style={billLineTotalsSubtotalRowSt}>
                    <span>Subtotal</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(String(subtotal))}</span>
                  </div>
                  <div style={billLineTotalsVatRowSt}>
                    <span>Total VAT</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(String(totalVat))}</span>
                  </div>
                  <div style={billLineTotalsHrSt} role="separator" />
                  <div style={billLineTotalsGrandRowSt}>
                    <span>Total</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>SAR {fmt(String(total))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ ...sectionHeaderBarFullSt, borderBottom: '1px solid #edf2f7' }}>
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
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} disabled={!canEdit} onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAttachmentFile(f);
                setAttachmentName(f?.name ?? '');
                if (attachmentPreview && attachmentPreview.startsWith('blob:')) URL.revokeObjectURL(attachmentPreview);
                setAttachmentPreview(f ? URL.createObjectURL(f) : '');
              }} />
            </label>
            {attachmentPreview && (attachmentFile?.type.startsWith('image/') || (!attachmentFile && attachmentPreview.match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i))) ? (
              <div style={{ marginTop: 10 }}>
                <img
                  src={attachmentPreview}
                  alt="Attachment preview"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain', maxHeight: 260 }}
                />
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#9ca3af', wordBreak: 'break-all' }}>{attachmentName}</div>
              </div>
            ) : attachmentName ? (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                <UploadCloud size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>{attachmentName}</span>
              </div>
            ) : null}
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

