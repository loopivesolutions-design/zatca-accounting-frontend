import { TrendingUp, TrendingDown, DollarSign, FileCheck, AlertCircle, Clock } from 'lucide-react';

const STAT_CARDS = [
  {
    label: 'Total Revenue',
    value: 'SAR 284,500',
    change: '+12.5%',
    positive: true,
    icon: DollarSign,
    bg: '#e8f8f5',
    iconColor: '#35C0A3',
  },
  {
    label: 'Total Expenses',
    value: 'SAR 91,200',
    change: '-3.2%',
    positive: false,
    icon: TrendingDown,
    bg: '#fff0f0',
    iconColor: '#f87171',
  },
  {
    label: 'ZATCA Invoices',
    value: '1,248',
    change: '+8.1%',
    positive: true,
    icon: FileCheck,
    bg: '#f0f4ff',
    iconColor: '#6366f1',
  },
  {
    label: 'Pending Approvals',
    value: '17',
    change: '3 urgent',
    positive: false,
    icon: AlertCircle,
    bg: '#fffbeb',
    iconColor: '#f59e0b',
  },
];

const RECENT_INVOICES = [
  { id: 'INV-2026-001', customer: 'Al-Rajhi Trading Co.', amount: 'SAR 14,500', status: 'Approved', date: '04 Mar 2026' },
  { id: 'INV-2026-002', customer: 'Riyadh Tech Solutions', amount: 'SAR 8,200', status: 'Pending', date: '04 Mar 2026' },
  { id: 'INV-2026-003', customer: 'Saudi Constructions Ltd', amount: 'SAR 31,000', status: 'Approved', date: '03 Mar 2026' },
  { id: 'INV-2026-004', customer: 'Gulf Supplies Group', amount: 'SAR 5,750', status: 'Rejected', date: '03 Mar 2026' },
  { id: 'INV-2026-005', customer: 'Aramco Subsidiary', amount: 'SAR 62,400', status: 'Approved', date: '02 Mar 2026' },
];

const STATUS_STYLES: Record<string, string> = {
  Approved: 'bg-[#e8f8f5] text-[#35C0A3]',
  Pending: 'bg-amber-50 text-amber-600',
  Rejected: 'bg-red-50 text-red-500',
};

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const REVENUE_DATA = [65, 78, 55, 90, 72, 85, 95, 80, 100];
const EXPENSE_DATA = [40, 45, 38, 52, 48, 44, 55, 42, 50];

function MiniBarChart() {
  const maxVal = Math.max(...REVENUE_DATA, ...EXPENSE_DATA);

  return (
    <div className="flex items-end gap-2 h-28 w-full">
      {MONTHS.map((month, i) => (
        <div key={month} className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 88 }}>
            <div
              className="rounded-t-sm w-[45%] transition-all"
              style={{
                height: `${(REVENUE_DATA[i] / maxVal) * 100}%`,
                backgroundColor: '#35C0A3',
              }}
            />
            <div
              className="rounded-t-sm w-[45%] transition-all"
              style={{
                height: `${(EXPENSE_DATA[i] / maxVal) * 100}%`,
                backgroundColor: '#e2e8f0',
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{month}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart() {
  const data = [
    { label: 'Sales', value: 45, color: '#35C0A3' },
    { label: 'Purchase', value: 25, color: '#6366f1' },
    { label: 'Expenses', value: 18, color: '#f59e0b' },
    { label: 'Other', value: 12, color: '#e2e8f0' },
  ];

  let cumulative = 0;
  const radius = 36;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        {data.map((d, i) => {
          const offset = cumulative;
          const dash = (d.value / 100) * circumference;
          cumulative += dash;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
        })}
        <circle cx={cx} cy={cy} r="26" fill="white" />
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[12px] text-gray-500">{d.label}</span>
            <span className="text-[12px] font-semibold text-gray-700 ml-auto pl-4">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'Heebo', sans-serif" }}>

      {/* Greeting */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-800">Good morning, Admin 👋</h1>
        <p className="text-[14px] text-gray-400 mt-0.5">Here's what's happening with your business today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-5">
        {STAT_CARDS.map(({ label, value, change, positive, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-gray-500">{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={17} style={{ color: iconColor }} strokeWidth={2} />
              </div>
            </div>
            <div className="text-[22px] font-semibold text-gray-800 leading-tight">{value}</div>
            <div className="flex items-center gap-1 mt-2">
              {positive ? (
                <TrendingUp size={13} style={{ color: '#35C0A3' }} />
              ) : (
                <TrendingDown size={13} className="text-red-400" />
              )}
              <span
                className="text-[12px] font-medium"
                style={{ color: positive ? '#35C0A3' : '#f87171' }}
              >
                {change}
              </span>
              <span className="text-[12px] text-gray-400">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Revenue bar chart */}
        <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-800">Revenue vs Expenses</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">Last 9 months</p>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#35C0A3' }} />
                Revenue
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200" />
                Expenses
              </div>
            </div>
          </div>
          <MiniBarChart />
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <h3 className="text-[15px] font-semibold text-gray-800">Breakdown</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">Current period</p>
          </div>
          <DonutChart />
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-800">Recent ZATCA Invoices</h3>
          <button
            className="text-[13px] font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ color: '#35C0A3', backgroundColor: '#e8f8f5' }}
          >
            View All
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Invoice ID', 'Customer', 'Amount', 'Date', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_INVOICES.map((inv, i) => (
              <tr
                key={inv.id}
                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  i === RECENT_INVOICES.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <td className="px-6 py-3.5 text-[13px] font-medium" style={{ color: '#35C0A3' }}>
                  {inv.id}
                </td>
                <td className="px-6 py-3.5 text-[13px] text-gray-700">{inv.customer}</td>
                <td className="px-6 py-3.5 text-[13px] font-medium text-gray-800">{inv.amount}</td>
                <td className="px-6 py-3.5 text-[13px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    {inv.date}
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-[11px] font-medium ${
                      STATUS_STYLES[inv.status]
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
