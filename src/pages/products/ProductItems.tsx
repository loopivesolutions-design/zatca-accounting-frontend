import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, X, Lock } from 'lucide-react';
import api from '../../api/axios';
import { parseApiError } from '../../api/errors';

interface Item {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string | null;
  category_name: string | null;
  unit_of_measure: string | null;
  unit_of_measure_name: string | null;
  image: string | null;
  has_attachment?: boolean;
  is_active: boolean;
  selling_price: string;
  purchase_price: string;
  avg_unit_cost?: string;
  stock_quantity: string;
  inventory_value?: string;
  is_locked?: boolean;
  revenue_account: string | null;
  revenue_account_name: string | null;
  expense_account: string | null;
  expense_account_name: string | null;
  inventory_account: string | null;
  inventory_account_name: string | null;
  sales_tax_rate: string | null;
  sales_tax_rate_name: string | null;
  purchase_tax_rate: string | null;
  purchase_tax_rate_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CategoryChoice {
  id: string;
  name: string;
}

interface Uom {
  id: string;
  name: string;
}

interface AccountChoice {
  id: string;
  code: string;
  name: string;
}

interface TaxChoice {
  id: string;
  label: string;
  tax_type: string;
}

const inputSt: React.CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 7,
  border: '1.5px solid #e0e0e0',
  padding: '0 10px',
  fontSize: 13.5,
  color: '#1a1a1a',
  outline: 'none',
  fontFamily: "'Heebo', sans-serif",
  backgroundColor: '#fff',
  transition: 'border-color 0.15s',
};

const labelSt: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: '#555',
  marginBottom: 4,
  display: 'block',
};

// ── UoM Modal ──────────────────────────────────────────────────────────────────
function UomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (uom: Uom) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<Uom>('/api/v1/products/uom/', { name });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(0,0,0,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: '22px 26px 20px',
          width: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          fontFamily: "'Heebo', sans-serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Create unit of measure</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <div
            style={{
              backgroundColor: '#fff0f0',
              border: '1px solid #fecaca',
              color: '#c0392b',
              borderRadius: 6,
              padding: '8px 12px',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelSt}>
              Unit of Measure<span style={{ color: '#35C0A3' }}>*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. cm, pc, box"
              style={inputSt}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 36,
                paddingInline: 18,
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                backgroundColor: '#fff',
                color: '#555',
                fontSize: 13.5,
                cursor: 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 36,
                paddingInline: 22,
                borderRadius: 8,
                border: 'none',
                backgroundColor: loading ? '#a8e4d8' : '#35C0A3',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Item Form Modal ────────────────────────────────────────────────────────────
interface ItemFormProps {
  mode: 'create' | 'edit';
  initial?: Item;
  categories: CategoryChoice[];
  uoms: Uom[];
  accounts: AccountChoice[];
  taxChoices: TaxChoice[];
  onUomCreated: (uom: Uom) => void;
  onClose: () => void;
  onSaved: (item: Item) => void;
}

function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Already an absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const base = 'https://zatca-backend.loopive.com';

  // If backend already includes /media/, just prepend base
  if (path.startsWith('/media/')) {
    return `${base}${path}`;
  }

  // Otherwise, assume it's a relative media path like "product-images/2.jpeg"
  const clean = path.replace(/^\/+/, '');
  return `${base}/media/${clean}`;
}

function ItemFormModal({
  mode,
  initial,
  categories,
  uoms,
  accounts,
  taxChoices,
  onUomCreated,
  onClose,
  onSaved,
}: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [uomId, setUomId] = useState(initial?.unit_of_measure ?? '');
  const [statusActive, setStatusActive] = useState(initial?.is_active ?? true);
  const [sellingPrice, setSellingPrice] = useState(initial?.selling_price ?? '');
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchase_price ?? '');
  const [revenueAcc, setRevenueAcc] = useState(initial?.revenue_account ?? '');
  const [expenseAcc, setExpenseAcc] = useState(initial?.expense_account ?? '');
  const [inventoryAcc, setInventoryAcc] = useState(initial?.inventory_account ?? '');
  const [salesTax, setSalesTax] = useState(initial?.sales_tax_rate ?? '');
  const [purchaseTax, setPurchaseTax] = useState(initial?.purchase_tax_rate ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUomModal, setShowUomModal] = useState(false);

  // Build preview URL when a new image file is selected
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('code', code);
      if (description) fd.append('description', description);
      if (category) fd.append('category', category);
      if (uomId) fd.append('unit_of_measure', uomId);
      fd.append('is_active', String(statusActive));
      if (sellingPrice) fd.append('selling_price', sellingPrice);
      if (purchasePrice) fd.append('purchase_price', purchasePrice);
      if (revenueAcc) fd.append('revenue_account', revenueAcc);
      if (expenseAcc) fd.append('expense_account', expenseAcc);
      if (inventoryAcc) fd.append('inventory_account', inventoryAcc);
      // Only send tax rates when they look like UUIDs, to avoid sending
      // legacy values like "sales" / "purchases".
      if (salesTax && salesTax.includes('-')) fd.append('sales_tax_rate', salesTax);
      if (purchaseTax && purchaseTax.includes('-')) fd.append('purchase_tax_rate', purchaseTax);
      if (imageFile) fd.append('image', imageFile);

      const url = initial
        ? `/api/v1/products/items/${initial.id}/`
        : '/api/v1/products/items/';
      const method = initial ? api.patch : api.post;
      const { data } = await method<Item>(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSaved(data);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: '20px 26px 22px',
            width: 980,
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.17)',
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
                {mode === 'create' ? 'Create Item' : 'Edit Item'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: 34,
                  paddingInline: 16,
                  borderRadius: 7,
                  border: '1px solid #e0e0e0',
                  backgroundColor: '#fff',
                  color: '#555',
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="item-form"
                disabled={loading}
                style={{
                  height: 34,
                  paddingInline: 22,
                  borderRadius: 7,
                  border: 'none',
                  backgroundColor: loading ? '#a8e4d8' : '#35C0A3',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fff0f0',
                border: '1px solid #fecaca',
                color: '#c0392b',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <form
            id="item-form"
            onSubmit={handleSubmit}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 24 }}
          >
            {/* Left column: form sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Basic information */}
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #edf2f7',
                  backgroundColor: '#fafafa',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: '#f3f4f6',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                    Basic information <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>
                  </span>
                </div>
                <div style={{ padding: '14px 16px 12px', backgroundColor: '#fff', borderRadius: '0 0 10px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: 12 }}>
                    <div>
                      <label style={labelSt}>
                        Name of item<span style={{ color: '#35C0A3' }}>*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={inputSt}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      />
                    </div>
                    <div>
                      <label style={labelSt}>
                        Item Code<span style={{ color: '#35C0A3' }}>*</span>
                      </label>
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        style={inputSt}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={labelSt}>Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ ...inputSt, cursor: 'pointer', color: category ? '#111827' : '#9ca3af' }}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      >
                        <option value="">Select</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelSt}>Unit of Measure</label>
                      <select
                        value={uomId}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '__create__') {
                            setShowUomModal(true);
                            return;
                          }
                          setUomId(v);
                        }}
                        style={{ ...inputSt, cursor: 'pointer', color: uomId ? '#111827' : '#9ca3af' }}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      >
                        <option value="">Select</option>
                        <option value="__create__">+ Create unit of measure</option>
                        {uoms.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={labelSt}>Description</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description"
                      style={inputSt}
                      onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                      onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                    />
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#555' }}>Status</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#111827' }}>
                      <input
                        type="radio"
                        checked={statusActive}
                        onChange={() => setStatusActive(true)}
                        style={{ accentColor: '#35C0A3' }}
                      />
                      Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6b7280' }}>
                      <input
                        type="radio"
                        checked={!statusActive}
                        onChange={() => setStatusActive(false)}
                        style={{ accentColor: '#6b7280' }}
                      />
                      Disabled
                    </label>
                  </div>
                </div>
              </div>

              {/* Selling */}
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #edf2f7',
                  backgroundColor: '#fafafa',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: '#f3f4f6',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                    Selling <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>
                  </span>
                </div>
                <div style={{ padding: '14px 16px 12px', backgroundColor: '#fff', borderRadius: '0 0 10px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: 12 }}>
                    <div>
                      <label style={labelSt}>Selling price</label>
                      <input
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        placeholder="In SAR"
                        style={inputSt}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      />
                    </div>
                    <div>
                      <label style={labelSt}>Revenue Account</label>
                      <select
                        value={revenueAcc}
                        onChange={(e) => setRevenueAcc(e.target.value)}
                        style={{ ...inputSt, cursor: 'pointer', color: revenueAcc ? '#111827' : '#9ca3af' }}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      >
                        <option value="">Select</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={labelSt}>Revenue Tax Rate</label>
                    <select
                      value={salesTax}
                      onChange={(e) => setSalesTax(e.target.value)}
                      style={{ ...inputSt, cursor: 'pointer', color: salesTax ? '#111827' : '#9ca3af' }}
                      onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                      onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                    >
                      <option value="">Select</option>
                      {taxChoices
                        .filter((t) => t.tax_type === 'sales')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Purchase */}
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #edf2f7',
                  backgroundColor: '#fafafa',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: '#f3f4f6',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                    Purchase <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Required)</span>
                  </span>
                </div>
                <div style={{ padding: '14px 16px 12px', backgroundColor: '#fff', borderRadius: '0 0 10px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: 12 }}>
                    <div>
                      <label style={labelSt}>Purchase rate</label>
                      <input
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="In SAR"
                        style={inputSt}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      />
                    </div>
                    <div>
                      <label style={labelSt}>Expense Account</label>
                      <select
                        value={expenseAcc}
                        onChange={(e) => setExpenseAcc(e.target.value)}
                        style={{ ...inputSt, cursor: 'pointer', color: expenseAcc ? '#111827' : '#9ca3af' }}
                        onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                        onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                      >
                        <option value="">Select</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={labelSt}>Purchase Tax Rate</label>
                    <select
                      value={purchaseTax}
                      onChange={(e) => setPurchaseTax(e.target.value)}
                      style={{ ...inputSt, cursor: 'pointer', color: purchaseTax ? '#111827' : '#9ca3af' }}
                      onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                      onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                    >
                      <option value="">Select</option>
                      {taxChoices
                        .filter((t) => t.tax_type === 'purchases')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #edf2f7',
                  backgroundColor: '#fafafa',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: '#f3f4f6',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
                    Inventory <span style={{ color: '#9ca3af', fontWeight: 400 }}>(Optional)</span>
                  </span>
                </div>
                <div style={{ padding: '14px 16px 12px', backgroundColor: '#fff', borderRadius: '0 0 10px 10px' }}>
                  <div>
                    <label style={labelSt}>Inventory Asset Account</label>
                    <select
                      value={inventoryAcc}
                      onChange={(e) => setInventoryAcc(e.target.value)}
                      style={{ ...inputSt, cursor: 'pointer', color: inventoryAcc ? '#111827' : '#9ca3af' }}
                      onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                      onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                    >
                      <option value="">Select</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: image + stock */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image upload */}
              <div
                style={{
                  border: '1.5px dashed #d1d5db',
                  borderRadius: 12,
                  padding: '20px 16px 16px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Drag image here or</p>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 14px',
                    borderRadius: 999,
                    backgroundColor: '#35C0A3',
                    color: '#fff',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Browse Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageFile(file);
                    }}
                  />
                </label>
                <div style={{ marginTop: 14 }}>
                  {/* Show newly selected image preview if available */}
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        display: 'block',
                        margin: '0 auto',
                        maxWidth: 180,
                        maxHeight: 140,
                        borderRadius: 10,
                        objectFit: 'cover',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}
                    />
                  )}
                  {/* Otherwise show existing image thumbnail (edit mode) */}
                  {!imagePreview && initial && resolveImageUrl(initial.image) && (
                    <img
                      src={resolveImageUrl(initial.image)!}
                      alt="Current"
                      style={{
                        display: 'block',
                        margin: '0 auto',
                        maxWidth: 180,
                        maxHeight: 140,
                        borderRadius: 10,
                        objectFit: 'cover',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}
                    />
                  )}
                  {/* Filename text for accessibility / confirmation */}
                  {(imageFile || initial?.image) && (
                    <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 8 }}>
                      {imageFile ? imageFile.name : initial?.image}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock quantity (display only for now) */}
              {initial && (
                <div
                  style={{
                    borderRadius: 10,
                    border: '1px solid #edf2f7',
                    backgroundColor: '#fff',
                    padding: '14px 16px',
                  }}
                >
                  <label style={labelSt}>Current stock quantity</label>
                  <input
                    value={initial.stock_quantity}
                    readOnly
                    style={{
                      ...inputSt,
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                      borderColor: '#e5e7eb',
                    }}
                  />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {showUomModal && (
        <UomModal
          onClose={() => setShowUomModal(false)}
          onCreated={(uom) => {
            onUomCreated(uom);
            setUomId(uom.id);
          }}
        />
      )}
    </>
  );
}

// ── Items List Page ────────────────────────────────────────────────────────────
type ActiveFilter = 'all' | 'active' | 'inactive';

const FILTER_LABELS: Record<ActiveFilter, string> = {
  all: 'All',
  active: 'Active only',
  inactive: 'Inactive only',
};

export default function ProductItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<CategoryChoice[]>([]);
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [accounts, setAccounts] = useState<AccountChoice[]>([]);
  const [taxChoices, setTaxChoices] = useState<TaxChoice[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchItems = useCallback(
    async (q: string, af: ActiveFilter, cat: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page_size: '100' });
        if (q.trim()) params.set('search', q.trim());
        if (af === 'active') params.set('active', 'true');
        if (af === 'inactive') params.set('active', 'false');
        if (cat) params.set('category', cat);
        const { data } = await api.get<{ count: number; results: Item[] }>(
          `/api/v1/products/items/?${params}`,
        );
        setItems(data.results ?? []);
        setTotal(data.count ?? 0);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void fetchItems(search, activeFilter, categoryFilter);
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, activeFilter, categoryFilter, fetchItems]);

  // Lookup data
  useEffect(() => {
    api
      .get<CategoryChoice[]>('/api/v1/products/categories/choices/')
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => {});
    api
      .get<Uom[]>('/api/v1/products/uom/')
      .then(({ data }) => setUoms(data ?? []))
      .catch(() => {});
    api
      .get<{ results: { id: string; name: string; tax_type: string; rate: string }[] }>(
        '/api/v1/accounting/tax-rates/?page_size=100&active=true',
      )
      .then(({ data }) => {
        const choices: TaxChoice[] = (data.results ?? []).map((r) => ({
          id: r.id,
          tax_type: r.tax_type,
          label: `${r.name} (${parseFloat(r.rate).toFixed(2)}%)`,
        }));
        setTaxChoices(choices);
      })
      .catch(() => {});
    api
      .get<any[]>('/api/v1/accounting/chart-of-accounts/tree/')
      .then(({ data }) => {
        const flattened: AccountChoice[] = [];
        function walk(nodes: any[]) {
          nodes.forEach((n) => {
            flattened.push({ id: n.id, code: n.code, name: n.name });
            if (n.children && Array.isArray(n.children)) walk(n.children);
          });
        }
        if (Array.isArray(data)) walk(data);
        setAccounts(flattened);
      })
      .catch(() => {});
  }, []);

  function onSaved(item: Item) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx === -1) return [item, ...prev];
      const copy = [...prev];
      copy[idx] = item;
      return copy;
    });
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeletingId(item.id);
    try {
      await api.delete(`/api/v1/products/items/${item.id}/`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      alert(parseApiError(err));
    } finally {
      setDeletingId(null);
    }
  }

  const TH: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 12.5,
    fontWeight: 500,
    color: '#888',
    borderBottom: '1px solid #e9ecef',
    borderRight: '1px solid #e9ecef',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };
  const TD: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13.5,
    color: '#333',
    borderBottom: '1px solid #eef2f5',
    borderRight: '1px solid #eef2f5',
    verticalAlign: 'middle',
  };

  return (
    <div
      style={{
        padding: '24px 28px',
        fontFamily: "'Heebo', sans-serif",
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        backgroundColor: '#f4f6f8',
      }}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#aaa',
              pointerEvents: 'none',
            }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 32,
              paddingRight: 12,
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              fontSize: 13.5,
              color: '#333',
              outline: 'none',
              backgroundColor: '#fff',
              fontFamily: "'Heebo', sans-serif",
            }}
            onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
            onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            height: 36,
            minWidth: 180,
            maxWidth: 240,
            paddingInline: 10,
            borderRadius: 8,
            border: `1px solid ${categoryFilter ? '#35C0A3' : '#e0e0e0'}`,
            backgroundColor: categoryFilter ? '#f0fdf9' : '#fff',
            color: categoryFilter ? '#35C0A3' : '#555',
            fontSize: 13.5,
            outline: 'none',
            cursor: 'pointer',
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Filter + Add */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                paddingInline: 14,
                borderRadius: 8,
                border: `1px solid ${activeFilter !== 'all' ? '#35C0A3' : '#e0e0e0'}`,
                backgroundColor: activeFilter !== 'all' ? '#f0fdf9' : '#fff',
                color: activeFilter !== 'all' ? '#35C0A3' : '#555',
                fontSize: 13.5,
                cursor: 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              {FILTER_LABELS[activeFilter]}
            </button>
            {filterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 40,
                  right: 0,
                  zIndex: 30,
                  backgroundColor: '#fff',
                  border: '1px solid #e8e8e8',
                  borderRadius: 10,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                  minWidth: 150,
                  overflow: 'hidden',
                }}
              >
                {(Object.entries(FILTER_LABELS) as [ActiveFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveFilter(key);
                      setFilterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '9px 14px',
                      border: 'none',
                      textAlign: 'left',
                      backgroundColor: activeFilter === key ? '#f0fdf9' : '#fff',
                      color: activeFilter === key ? '#35C0A3' : '#333',
                      fontSize: 13.5,
                      cursor: 'pointer',
                      fontFamily: "'Heebo', sans-serif",
                      fontWeight: activeFilter === key ? 500 : 400,
                    }}
                  >
                    {label}
                    {activeFilter === key && <span style={{ fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditItem(null);
              setShowForm(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 36,
              paddingInline: 16,
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#35C0A3',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'Heebo', sans-serif",
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          border: '1px solid #efefef',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Image</th>
              <th style={TH}>Code</th>
              <th style={TH}>Name</th>
              <th style={TH}>Category</th>
              <th style={TH}>UoM</th>
              <th style={{ ...TH, textAlign: 'right' }}>Selling</th>
              <th style={{ ...TH, textAlign: 'right' }}>Purchase</th>
              <th style={{ ...TH, textAlign: 'right' }}>Stock</th>
              <th style={{ ...TH, textAlign: 'right' }}>Avg cost</th>
              <th style={{ ...TH, textAlign: 'right' }}>Inv. value</th>
              <th style={{ ...TH, textAlign: 'center', width: 44 }}> </th>
              <th style={TH}>Status</th>
              <th style={{ ...TH, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={13}
                  style={{
                    ...TD,
                    textAlign: 'center',
                    padding: '40px 0',
                    color: '#aaa',
                    borderRight: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      width: 20,
                      height: 20,
                      border: '2px solid #35C0A3',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  style={{
                    ...TD,
                    textAlign: 'center',
                    padding: '40px 0',
                    color: '#aaa',
                    fontSize: 13,
                    borderRight: 'none',
                  }}
                >
                  {search || activeFilter !== 'all' || categoryFilter
                    ? 'No items match your filters.'
                    : 'No items yet. Click Add to create one.'}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const active = item.is_active;
                const thumb = resolveImageUrl(item.image);
                return (
                  <tr key={item.id} style={{ backgroundColor: '#fff' }}>
                    <td style={{ ...TD, width: 64, textAlign: 'center' }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.name}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'cover',
                            borderRadius: 8,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            backgroundColor: '#f3f4f6',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: '#d1d5db' }}>No image</span>
                      )}
                    </td>
                    <td style={{ ...TD, fontVariantNumeric: 'tabular-nums', color: '#4b5563' }}>{item.code}</td>
                    <td style={{ ...TD, fontWeight: 500, color: active ? '#111827' : '#9ca3af' }}>
                      {item.name}
                      {item.description && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11.5,
                            color: '#9ca3af',
                            fontWeight: 400,
                            marginTop: 2,
                          }}
                        >
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td style={{ ...TD, color: '#6b7280' }}>{item.category_name ?? '—'}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>{item.unit_of_measure_name ?? '—'}</td>
                    <td
                      style={{
                        ...TD,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: item.selling_price ? '#111827' : '#9ca3af',
                      }}
                    >
                      {item.selling_price || '—'}
                    </td>
                    <td
                      style={{
                        ...TD,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: item.purchase_price ? '#111827' : '#9ca3af',
                      }}
                    >
                      {item.purchase_price || '—'}
                    </td>
                    <td
                      style={{
                        ...TD,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: item.stock_quantity !== '0.00' ? '#111827' : '#9ca3af',
                      }}
                    >
                      {item.stock_quantity}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>
                      {item.avg_unit_cost ?? item.purchase_price ?? '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#374151' }}>
                      {item.inventory_value ?? '—'}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }} title={item.is_locked ? 'Used on documents — cannot delete' : ''}>
                      {item.is_locked ? <Lock size={14} style={{ color: '#f59e0b' }} /> : '—'}
                    </td>
                    <td style={TD}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 22,
                          paddingInline: 10,
                          borderRadius: 5,
                          fontSize: 11.5,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          backgroundColor: active ? '#dcfce7' : '#fee2e2',
                          color: active ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ ...TD, width: 80 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          onClick={() => {
                            setEditItem(item);
                            setShowForm(true);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: 'none',
                            backgroundColor: '#f0fdf9',
                            color: '#35C0A3',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          disabled={deletingId === item.id || item.is_locked}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: 'none',
                            backgroundColor: '#fff5f5',
                            color: '#e53e3e',
                            cursor: deletingId === item.id || item.is_locked ? 'not-allowed' : 'pointer',
                            opacity: deletingId === item.id || item.is_locked ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12.5, color: '#aaa' }}>
              {total} {total === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
      </div>

      {showForm && (
        <ItemFormModal
          mode={editItem ? 'edit' : 'create'}
          initial={editItem ?? undefined}
          categories={categories}
          uoms={uoms}
          accounts={accounts}
          taxChoices={taxChoices}
          onUomCreated={(u) => setUoms((prev) => [...prev, u])}
          onClose={() => setShowForm(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

