import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AcceptInvitation from './pages/AcceptInvitation';
import Placeholder from './pages/Placeholder';
import UserRoleManagement from './pages/settings/UserRoleManagement';
import CompanySettings from './pages/settings/CompanySettings';
import ChartOfAccounts from './pages/accounting/ChartOfAccounts';
import TaxRates from './pages/accounting/TaxRates';
import JournalEntries from './pages/accounting/JournalEntries';
import ProductCategories from './pages/products/ProductCategories';
import ProductItems from './pages/products/ProductItems';
import Warehouses from './pages/products/Warehouses';
import InventoryAdjustments from './pages/products/InventoryAdjustments';
import Suppliers from './pages/purchase/Suppliers';
import Bills from './pages/purchase/Bills';
import SupplierPayments from './pages/purchase/SupplierPayments';
import DebitNotes from './pages/purchase/DebitNotes';
import SupplierRefunds from './pages/purchase/SupplierRefunds';
import Customers from './pages/sales/Customers';
import Quotes from './pages/sales/Quotes';
import Invoices from './pages/sales/Invoices';
import CustomerPayments from './pages/sales/CustomerPayments';
import CustomerRefunds from './pages/sales/CustomerRefunds';
import CreditNotes from './pages/sales/CreditNotes';
import StatementOfAccount from './pages/reports/StatementOfAccount';
import ProfitAndLoss from './pages/reports/ProfitAndLoss';
import GeneralLedger from './pages/reports/GeneralLedger';
import ApprovalsQueue from './pages/settings/ApprovalsQueue';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        {/* Protected — requires auth token */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sales" element={<Placeholder title="Sales" />} />
            <Route path="/sales/quotes" element={<Quotes />} />
            <Route path="/sales/quotes/:id" element={<Quotes />} />
            <Route path="/sales/invoices" element={<Invoices />} />
            <Route path="/sales/invoices/:id" element={<Invoices />} />
            <Route path="/sales/customer-payments" element={<CustomerPayments />} />
            <Route path="/sales/customer-payments/:id" element={<CustomerPayments />} />
            <Route path="/sales/customer-refunds" element={<CustomerRefunds />} />
            <Route path="/sales/customer-refunds/:id" element={<CustomerRefunds />} />
            <Route path="/sales/credit-notes" element={<CreditNotes />} />
            <Route path="/sales/credit-notes/:id" element={<CreditNotes />} />
            <Route path="/purchase" element={<Placeholder title="Purchase" />} />
            <Route path="/purchase/suppliers" element={<Suppliers />} />
            <Route path="/purchase/suppliers/add" element={<Suppliers />} />
            <Route path="/purchase/bills" element={<Bills />} />
            <Route path="/purchase/bills/:id" element={<Bills />} />
            <Route path="/purchase/supplier-payments" element={<SupplierPayments />} />
            <Route path="/purchase/supplier-payments/:id" element={<SupplierPayments />} />
            <Route path="/purchase/debit-notes" element={<DebitNotes />} />
            <Route path="/purchase/debit-notes/:id" element={<DebitNotes />} />
            <Route path="/purchase/supplier-refunds" element={<SupplierRefunds />} />
            <Route path="/purchase/supplier-refunds/:id" element={<SupplierRefunds />} />
            <Route path="/vat-zatca" element={<Placeholder title="VAT & ZATCA" />} />
            <Route path="/products" element={<Navigate to="/products/items" replace />} />
            <Route path="/products/items" element={<ProductItems />} />
            <Route path="/products/categories" element={<ProductCategories />} />
            <Route path="/products/warehouses" element={<Warehouses />} />
            <Route path="/products/inventory/adjustments" element={<InventoryAdjustments />} />
            <Route path="/products/inventory/adjustments/:id" element={<InventoryAdjustments />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/add" element={<Customers />} />
            <Route path="/banking" element={<Placeholder title="Banking" />} />
            <Route path="/accounting" element={<ChartOfAccounts />} />
            <Route path="/accounting/tax-rates" element={<TaxRates />} />
            <Route path="/accounting/journal-entries" element={<JournalEntries />} />
            <Route path="/accounting/journal-entries/:id" element={<JournalEntries />} />
            <Route path="/reports" element={<Placeholder title="Reports" />} />
            <Route path="/reports/statement-of-account" element={<StatementOfAccount />} />
            <Route path="/reports/profit-and-loss" element={<ProfitAndLoss />} />
            <Route path="/reports/general-ledger" element={<GeneralLedger />} />
            <Route path="/settings" element={<UserRoleManagement />} />
            <Route path="/settings/company-settings" element={<CompanySettings />} />
            <Route path="/settings/approvals" element={<ApprovalsQueue />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
