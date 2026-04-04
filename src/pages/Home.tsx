import { Link } from 'react-router-dom';
import { BarChart2, CheckCircle2, ClipboardCheck, FileText, Hash, Layers, Receipt, ShieldCheck, Users, Zap } from 'lucide-react';

const PAL = {
  teal: '#35C0A3',
  darkTeal: '#0F766E',
  blue: '#3B7FEF',
  purple: '#8B5CF6',
  orange: '#FA8A1C',
  red: '#EF4444',
  yellow: '#FBBF24',
  bg: '#F8FAFC',
  slate900: '#0F172A',
  slate700: '#374151',
  slate600: '#4B5563',
  muted: '#64748B',
};

const heroBtnBase: React.CSSProperties = {
  height: 42,
  borderRadius: 10,
  padding: '0 18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Heebo', sans-serif",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: '18px 16px',
  boxShadow: '0 10px 30px rgba(2, 6, 23, 0.04)',
};

const subtleCardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(229, 231, 235, 0.9)',
  borderRadius: 16,
  padding: '16px 16px',
  boxShadow: '0 12px 34px rgba(2, 6, 23, 0.05)',
  backdropFilter: 'blur(10px)',
};

function checkItemStyle(): React.CSSProperties {
  return { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: PAL.muted, lineHeight: 1.7 };
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${PAL.bg} 0%, rgba(53,192,163,0.08) 35%, rgba(59,127,239,0.06) 70%, ${PAL.bg} 100%)`,
        fontFamily: "'Heebo', sans-serif",
        color: PAL.slate900,
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: 'default',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -120, left: -140, width: 420, height: 420, borderRadius: 220, background: `radial-gradient(circle at 30% 30%, rgba(53,192,163,0.35), rgba(53,192,163,0) 60%)` }} />
        <div style={{ position: 'absolute', top: 140, right: -160, width: 520, height: 520, borderRadius: 260, background: `radial-gradient(circle at 30% 30%, rgba(59,127,239,0.20), rgba(59,127,239,0) 56%)` }} />
      </div>

      <header style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: PAL.teal, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
              Z
            </div>
            <div style={{ fontWeight: 700, color: PAL.slate900 }}>ZATCA Accounting</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              to="/login"
              style={{ ...heroBtnBase, height: 36, border: 'none', color: '#fff', backgroundColor: '#35C0A3' }}
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '54px 24px 34px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 18, alignItems: 'stretch' }}>
          <div style={{ gridColumn: 'span 7', minWidth: 0 }}>
            <div style={{ fontSize: 12.5, letterSpacing: 0.6, color: PAL.darkTeal, fontWeight: 800, textTransform: 'uppercase' }}>
              Built for VAT-ready businesses in Saudi Arabia
            </div>
            <h1 style={{ fontSize: 46, lineHeight: 1.08, margin: '12px 0 14px', color: PAL.slate900 }}>
              Premium accounting workflows with ZATCA traceability built in
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#475569', margin: 0, maxWidth: 620 }}>
              Run invoices, credit notes, bills, payments, approvals, and reporting in one place. Keep submissions auditable with
              provider-side response metadata and document-level ZATCA status.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              <Link
                to="/login"
                style={{
                  ...heroBtnBase,
                  height: 44,
                  color: '#fff',
                  backgroundColor: '#35C0A3',
                  border: 'none',
                  boxShadow: '0 14px 40px rgba(53,192,163,0.25)',
                }}
              >
                Start Managing Accounts
              </Link>
            </div>
            <div style={{ marginTop: 16, fontSize: 12.5, color: '#6b7280', lineHeight: 1.7 }}>
              Designed for speed, integrity, and support-grade debugging.
            </div>
          </div>

          <div style={{ gridColumn: 'span 5', minWidth: 0 }}>
            <div style={subtleCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(53,192,163,0.10)', color: PAL.darkTeal, display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: PAL.slate900 }}>What you get</div>
                    <div style={{ fontSize: 12.5, color: '#6b7280' }}>Premium workflows for finance teams</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={checkItemStyle()}>
                  <CheckCircle2 size={16} style={{ color: PAL.darkTeal, flexShrink: 0 }} />
                  <span><strong style={{ color: PAL.slate900 }}>Sales</strong> + post/approval flow for invoices and credit notes.</span>
                </div>
                <div style={checkItemStyle()}>
                  <CheckCircle2 size={16} style={{ color: PAL.darkTeal, flexShrink: 0 }} />
                  <span><strong style={{ color: PAL.slate900 }}>Purchase</strong> lifecycles: suppliers, bills, payments, debit notes.</span>
                </div>
                <div style={checkItemStyle()}>
                  <CheckCircle2 size={16} style={{ color: PAL.darkTeal, flexShrink: 0 }} />
                  <span><strong style={{ color: PAL.slate900 }}>ZATCA traceability</strong> with submission logs and provider references.</span>
                </div>
                <div style={checkItemStyle()}>
                  <CheckCircle2 size={16} style={{ color: PAL.darkTeal, flexShrink: 0 }} />
                  <span><strong style={{ color: PAL.slate900 }}>Reports</strong> including statement of account, P&L, and general ledger.</span>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(229,231,235,0.9)' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: PAL.darkTeal, background: 'rgba(53,192,163,0.08)', border: '1px solid rgba(53,192,163,0.18)', padding: '8px 10px', borderRadius: 999 }}>
                    <Hash size={14} /> Traceable metadata
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: PAL.blue, background: 'rgba(59,127,239,0.10)', border: '1px solid rgba(59,127,239,0.20)', padding: '8px 10px', borderRadius: 999 }}>
                    <ShieldCheck size={14} /> Maker-checker integrity
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(53,192,163,0.10)', color: PAL.darkTeal, display: 'grid', placeItems: 'center' }}>
                <Layers size={18} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>360° coverage</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: PAL.muted, lineHeight: 1.7 }}>
              From quotes and invoices to bills, debit notes, journal entries, and payments.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(53,192,163,0.10)', color: PAL.darkTeal, display: 'grid', placeItems: 'center' }}>
                <Receipt size={18} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>ZATCA traceability</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: PAL.muted, lineHeight: 1.7 }}>
              Submission status + provider metadata for support-grade tracing and reconciliation.
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(53,192,163,0.10)', color: PAL.darkTeal, display: 'grid', placeItems: 'center' }}>
                <ClipboardCheck size={18} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>Maker-checker integrity</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: PAL.muted, lineHeight: 1.7 }}>
              Approvals queue with idempotent approve/deny actions and auditability.
            </p>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 24px 56px' }}>
        <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>Why finance teams choose this platform</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#ECFDF5', color: '#0f766e', display: 'grid', placeItems: 'center' }}>
                <Users size={16} />
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>Reliable day-to-day ops</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>
              Customer and supplier lifecycles, taxes, products, and inventory adjustments in one place.
            </p>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#ECFDF5', color: '#0f766e', display: 'grid', placeItems: 'center' }}>
                <BarChart2 size={16} />
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>Decision-ready reporting</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>
              Statement of account, P&L, and general ledger views with practical filters.
            </p>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#ECFDF5', color: '#0f766e', display: 'grid', placeItems: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>Audit and support readiness</div>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>
              Provider-side response metadata and reference IDs for reconciliation and SLA monitoring.
            </p>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
        <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>All features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Sales</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>Quotes (create, update)</li>
              <li>Invoices (create, save draft, post)</li>
              <li>Credit Notes (create, post)</li>
              <li>Customer Payments</li>
              <li>Customer Refunds</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Purchase</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>Suppliers</li>
              <li>Bills</li>
              <li>Supplier Payments</li>
              <li>Debit Notes</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Products & Inventory</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>Items</li>
              <li>Categories</li>
              <li>Warehouses</li>
              <li>Inventory Adjustments</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>VAT, ZATCA & Traceability</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>ZATCA submission status per document</li>
              <li>Hash verification (stored vs computed)</li>
              <li>Provider-side response metadata for support and reconciliation</li>
              <li>Submission logs with provider request/correlation identifiers</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Approvals & Integrity</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>Approvals queue for maker-checker workflow</li>
              <li>Approve endpoint integration with rule handling</li>
              <li>Deny with idempotency and required reason</li>
              <li>Idempotent operations using `Idempotency-Key` headers</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Accounting & Reports</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.85, fontSize: 13.5 }}>
              <li>Chart of Accounts</li>
              <li>Tax Rates</li>
              <li>Journal Entries</li>
              <li>Statement of Account</li>
              <li>Profit and Loss</li>
              <li>General Ledger</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <h2 style={{ fontSize: 26, margin: 0 }}>Trusted by teams that value accuracy</h2>
          <div style={{ fontSize: 12.5, color: PAL.muted }}>Premium workflows that reduce risk</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(53,192,163,0.10)', color: PAL.darkTeal, display: 'grid', placeItems: 'center' }}>
                <FileText size={16} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>Finance Ops</div>
            </div>
            <div style={{ fontSize: 13.5, color: PAL.slate600, lineHeight: 1.7 }}>
              “The maker-checker flow and idempotent operations make approvals safer and easier to troubleshoot.”
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(59,127,239,0.10)', color: PAL.blue, display: 'grid', placeItems: 'center' }}>
                <Hash size={16} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>ZATCA Compliance</div>
            </div>
            <div style={{ fontSize: 13.5, color: PAL.slate600, lineHeight: 1.7 }}>
              “Persistent provider metadata helps our team reconcile submissions and respond faster to issues.”
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.10)', color: PAL.purple, display: 'grid', placeItems: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <div style={{ fontWeight: 800, color: PAL.slate900 }}>Management</div>
            </div>
            <div style={{ fontSize: 13.5, color: PAL.slate600, lineHeight: 1.7 }}>
              “Reporting is clear and actionable. We can track statements, P&L, and general ledger with confidence.”
            </div>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 24px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 12.5, color: PAL.muted, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, color: PAL.slate900 }}>ZATCA Accounting</div>
            <div style={{ marginTop: 4 }}>Premium accounting workflows for VAT-ready businesses.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#9ca3af' }}>
            <span>Built for Saudi Arabia</span>
            <span aria-hidden>•</span>
            <span>© {new Date().getFullYear()} ZATCA Accounting</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
