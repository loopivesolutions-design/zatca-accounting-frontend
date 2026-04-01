import { useEffect, useState, useCallback } from 'react';
import { X, Plus, Trash2, Save, Search, ArrowUpDown, MoreVertical, RefreshCw, Pencil } from 'lucide-react';
import api from '../../api/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Role { id: string; name: string; }

interface Invitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  role_name: string | null;
  invited_by_name: string;
  created_at: string;
  is_expired: boolean;
  status: 'pending' | 'accepted' | 'rejected';
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  role_name: string | null;
  last_login: string | null;
}

interface Permission {
  module: string;
  module_display: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

type PermKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_approve';
type TabType = 'users' | 'invitations' | 'role';

const PERM_COLUMNS: { key: PermKey; label: string }[] = [
  { key: 'can_view',    label: 'View'    },
  { key: 'can_create',  label: 'Create'  },
  { key: 'can_edit',    label: 'Edit'    },
  { key: 'can_delete',  label: 'Delete'  },
  { key: 'can_approve', label: 'Approve' },
];

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 18, height: 18, borderRadius: 4,
        border: checked ? 'none' : '1.5px solid #cccccc',
        backgroundColor: checked ? '#35C0A3' : '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0, transition: 'all 0.12s',
      }}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
interface InviteRow { name: string; email: string; role: string; }

function AddUserModal({ roles, onClose, onSent }: { roles: Role[]; onClose: () => void; onSent: () => void }) {
  const emptyRow = (): InviteRow => ({ name: '', email: '', role: '' });
  const [rows, setRows] = useState<InviteRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateRow(i: number, field: keyof InviteRow, val: string) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(i: number) { if (rows.length > 1) setRows((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleSend() {
    const valid = rows.filter((r) => r.name.trim() && r.email.trim());
    if (!valid.length) { setError('Add at least one user with name and email.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post(
        '/api/v1/user/management/invitations/send/',
        { users: valid.map((r) => ({ name: r.name.trim(), email: r.email.trim(), role: r.role || null })) },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
      onSent();
      onClose();
    } catch {
      setError('Failed to send invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', height: 32, border: '1px solid #e8e8e8',
    borderRadius: 5, padding: '0 8px', fontSize: 13, color: '#333',
    outline: 'none', fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '24px 28px 22px', width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Add User</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              {['Name', 'Email', 'Role', ''].map((h, i) => (
                <th key={i} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, color: '#888', textAlign: 'left', borderBottom: '1px solid #efefef', width: h === '' ? 32 : 'auto' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '7px 8px' }}>
                  <input
                    style={inputSt}
                    value={row.name}
                    onChange={(e) => updateRow(i, 'name', e.target.value)}
                    placeholder="Full name"
                    onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                    onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')}
                  />
                </td>
                <td style={{ padding: '7px 8px' }}>
                  <input
                    style={inputSt}
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(i, 'email', e.target.value)}
                    placeholder="email@example.com"
                    onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                    onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')}
                  />
                </td>
                <td style={{ padding: '7px 8px' }}>
                  <select
                    style={{ ...inputSt, cursor: 'pointer', color: row.role ? '#333' : '#aaa' }}
                    value={row.role}
                    onChange={(e) => updateRow(i, 'role', e.target.value)}
                  >
                    <option value="">No role</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <button
                    onClick={() => removeRow(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', display: 'flex', alignItems: 'center' }}
                    title="Remove row"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row */}
        <button
          onClick={addRow}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#35C0A3', fontSize: 13, padding: 0, marginBottom: 20 }}
        >
          <Plus size={14} /> Add row
        </button>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              height: 38, paddingInline: 24, borderRadius: 8, border: 'none',
              backgroundColor: loading ? '#a8e4d8' : '#35C0A3',
              color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Heebo', sans-serif",
            }}
          >
            {loading ? 'Sending…' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, roles, onClose, onUpdated }: { user: User; roles: Role[]; onClose: () => void; onUpdated: (updated: User) => void }) {
  const [name, setName]   = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [role, setRole]   = useState(user.role ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.patch<User>(`/api/v1/user/management/users/${user.id}/`, {
        name: name.trim(),
        email: email.trim(),
        role: role || null,
      });
      onUpdated(data);
      onClose();
    } catch {
      setError('Failed to update user. Please try again.');
    } finally { setLoading(false); }
  }

  const inputSt: React.CSSProperties = {
    width: '100%', height: 38, borderRadius: 7, border: '1.5px solid #ddd',
    padding: '0 12px', fontSize: 14, color: '#1a1a1a', outline: 'none',
    fontFamily: "'Heebo', sans-serif", backgroundColor: '#fff', transition: 'border-color 0.15s',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '26px 30px 24px', width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.13)', fontFamily: "'Heebo', sans-serif" }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Edit User</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputSt}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')} />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputSt}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')} />
          </div>

          {/* Role */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              style={{ ...inputSt, cursor: 'pointer', color: role ? '#1a1a1a' : '#aaa' }}>
              <option value="">No role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose}
              style={{ height: 38, paddingInline: 20, borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#fff', color: '#555', fontSize: 14, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ height: 38, paddingInline: 24, borderRadius: 8, border: 'none', backgroundColor: loading ? '#a8e4d8' : '#35C0A3', color: '#fff', fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Heebo', sans-serif" }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Role Modal ────────────────────────────────────────────────────────────
function AddRoleModal({ onClose, onAdded }: { onClose: () => void; onAdded: (role: Role) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post<Role>('/api/v1/user/management/roles/', { name: name.trim() });
      onAdded(data); onClose();
    } catch { setError('Failed to add role. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '28px 32px 24px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontFamily: "'Heebo', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>Add Role</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>
        {error && <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#444', whiteSpace: 'nowrap' }}>Role Name<span style={{ color: '#35C0A3' }}>*</span></label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              style={{ flex: 1, height: 36, borderRadius: 6, border: '1.5px solid #ddd', padding: '0 12px', fontSize: 14, color: '#1a1a1a', outline: 'none', fontFamily: "'Heebo', sans-serif" }}
              onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading || !name.trim()}
              style={{ height: 38, paddingInline: 28, borderRadius: 8, border: 'none', backgroundColor: loading || !name.trim() ? '#a8e4d8' : '#35C0A3', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Heebo', sans-serif" }}>
              {loading ? 'Adding…' : 'Add Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserRoleManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [fetchingUserId, setFetchingUserId] = useState<string | null>(null);

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [loadingInv, setLoadingInv] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingInvId, setDeletingInvId] = useState<string | null>(null);

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get<{ results: User[] }>('/api/v1/user/management/users/');
      setUsers(data.results ?? []);
    } catch { /* silent */ }
    finally { setLoadingUsers(false); }
  }, []);

  // Fetch user detail then open edit modal
  async function openEditUser(id: string) {
    setFetchingUserId(id);
    try {
      const { data } = await api.get<User>(`/api/v1/user/management/users/${id}/`);
      setEditingUser(data);
    } catch {
      // Fallback: use data already in the list
      const existing = users.find((u) => u.id === id);
      if (existing) setEditingUser(existing);
    } finally {
      setFetchingUserId(null);
    }
  }

  // Delete user
  async function deleteUser(id: string) {
    if (!window.confirm('Delete this user?')) return;
    setDeletingUserId(id);
    try {
      await api.delete(`/api/v1/user/management/users/${id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch { /* silent */ }
    finally { setDeletingUserId(null); }
  }

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    setLoadingInv(true);
    try {
      const { data } = await api.get<{ results: Invitation[] }>('/api/v1/user/management/invitations/');
      setInvitations(data.results ?? []);
    } catch { /* silent */ }
    finally { setLoadingInv(false); }
  }, []);

  // Resend invitation
  async function resendInvitation(id: string) {
    setResendingId(id);
    try {
      await api.post(`/api/v1/user/management/invitations/${id}/resend/`);
      fetchInvitations();
    } catch { /* silent */ }
    finally { setResendingId(null); }
  }

  // Delete invitation
  async function deleteInvitation(id: string) {
    if (!window.confirm('Delete this invitation?')) return;
    setDeletingInvId(id);
    try {
      await api.delete(`/api/v1/user/management/invitations/${id}/`);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch { /* silent */ }
    finally { setDeletingInvId(null); }
  }

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const { data } = await api.get<Role[] | { results: Role[] }>('/api/v1/user/management/roles/');
      const list = Array.isArray(data) ? data : data.results ?? [];
      setRoles(list);
      if (list.length > 0) setSelectedRoleId((prev) => prev ?? list[0].id);
    } catch { /* silent */ }
    finally { setLoadingRoles(false); }
  }, []);

  // Fetch permissions
  const fetchPermissions = useCallback(async (roleId: string) => {
    setLoadingPerms(true);
    try {
      const { data } = await api.get<{ permissions: Permission[] }>(`/api/v1/user/management/roles/${roleId}/permissions/`);
      setPermissions(data.permissions ?? []);
    } catch { setPermissions([]); }
    finally { setLoadingPerms(false); }
  }, []);

  useEffect(() => { fetchUsers(); fetchRoles(); fetchInvitations(); }, []);
  useEffect(() => { if (selectedRoleId) fetchPermissions(selectedRoleId); }, [selectedRoleId]);

  function togglePerm(moduleKey: string, permKey: PermKey) {
    setPermissions((prev) => prev.map((p) => p.module === moduleKey ? { ...p, [permKey]: !p[permKey] } : p));
  }

  async function savePermissions() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const payload = {
        permissions: permissions.map(({ module, can_view, can_create, can_edit, can_delete, can_approve }) => ({
          module,
          can_view,
          can_create,
          can_edit,
          can_delete,
          can_approve,
        })),
      };
      await api.put(`/api/v1/user/management/roles/${selectedRoleId}/permissions/`, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  async function deleteRole(roleId: string) {
    if (!window.confirm('Delete this role?')) return;
    setDeletingId(roleId);
    try {
      await api.delete(`/api/v1/user/management/roles/${roleId}/`);
      const remaining = roles.filter((r) => r.id !== roleId);
      setRoles(remaining);
      if (selectedRoleId === roleId) setSelectedRoleId(remaining[0]?.id ?? null);
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  }

  const filteredInvitations = invitations.filter((inv) => {
    const full = `${inv.first_name} ${inv.last_name}`.toLowerCase();
    const s = invSearch.toLowerCase();
    return full.includes(s) || inv.email.toLowerCase().includes(s);
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div style={{ fontFamily: "'Heebo', sans-serif" }}>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex' }}>
          {(['users', 'invitations', 'role'] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px',
                fontSize: 14, fontFamily: "'Heebo', sans-serif", textTransform: 'capitalize',
                color: activeTab === tab ? '#35C0A3' : '#888',
                fontWeight: activeTab === tab ? 500 : 400,
                borderBottom: activeTab === tab ? '2px solid #35C0A3' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <button onClick={() => setShowAddUser(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 18, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
            <Plus size={15} /> Add User
          </button>
        )}
        {activeTab === 'role' && (
          <button onClick={() => setShowAddRole(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 18, borderRadius: 8, border: 'none', backgroundColor: '#35C0A3', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Heebo', sans-serif" }}>
            <Plus size={15} /> Add Role
          </button>
        )}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search"
                style={{ paddingLeft: 30, paddingRight: 12, height: 32, borderRadius: 6, border: '1px solid #e8e8e8', fontSize: 13, color: '#333', outline: 'none', fontFamily: "'Heebo', sans-serif", width: 200, backgroundColor: '#fafafa' }}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#666', cursor: 'pointer' }}>
                <ArrowUpDown size={13} /> Sort
              </button>
              <button style={{ background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}>
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa' }}>
                {['Name', 'Email', 'Role', 'Last Login', ''].map((h) => (
                  <th key={h} style={{ ...thStyle, width: h === '' ? 80 : 'auto' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading users…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No users found.</td></tr>
              ) : (
                filteredUsers.map((user, i) => (
                  <tr key={user.id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#e8f8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#35C0A3', flexShrink: 0 }}>
                          {user.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span style={{ fontSize: 13.5, color: '#333' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#666' }}>{user.email}</td>
                    <td style={tdStyle}>
                      {user.role_name ? (
                        <span style={{ backgroundColor: '#e8f8f5', color: '#35C0A3', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>
                          {user.role_name}
                        </span>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#999', fontSize: 13 }}>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button
                          onClick={() => openEditUser(user.id)}
                          disabled={fetchingUserId === user.id}
                          title="Edit user"
                          style={{ background: 'none', border: 'none', cursor: fetchingUserId === user.id ? 'wait' : 'pointer', color: '#35C0A3', display: 'flex', alignItems: 'center', padding: 2, opacity: fetchingUserId === user.id ? 0.5 : 1 }}
                        >
                          {fetchingUserId === user.id
                            ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                            : <Pencil size={14} />}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={deletingUserId === user.id}
                          title="Delete user"
                          style={{ background: 'none', border: 'none', cursor: deletingUserId === user.id ? 'not-allowed' : 'pointer', color: deletingUserId === user.id ? '#fca5a5' : '#f87171', display: 'flex', alignItems: 'center', padding: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ROLE TAB ── */}
      {activeTab === 'role' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
          {/* Role pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
            {loadingRoles ? (
              <span style={{ fontSize: 13, color: '#aaa' }}>Loading…</span>
            ) : roles.map((role) => (
              <div key={role.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: role.id === selectedRoleId ? 14 : 8, paddingTop: 6, paddingBottom: 6, borderRadius: 8, cursor: 'pointer', fontSize: 13, backgroundColor: role.id === selectedRoleId ? '#35C0A3' : '#f4f4f4', color: role.id === selectedRoleId ? '#fff' : '#555', fontWeight: role.id === selectedRoleId ? 500 : 400, border: '1px solid', borderColor: role.id === selectedRoleId ? '#35C0A3' : '#e8e8e8', transition: 'all 0.12s' }}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <span>{role.name}</span>
                {role.id !== selectedRoleId && (
                  <button onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }} disabled={deletingId === role.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#aaa', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Permissions table */}
          {loadingPerms ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading permissions…</div>
          ) : permissions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No permissions found.</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ ...thStyle, textAlign: 'left', width: '28%' }}>Modules</th>
                    {PERM_COLUMNS.map((col) => <th key={col.key} style={thStyle}>{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm, i) => (
                    <tr key={perm.module} style={{ borderBottom: i < permissions.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <td style={{ ...tdStyle, color: '#333' }}>{perm.module_display}</td>
                      {PERM_COLUMNS.map((col) => (
                        <td key={col.key} style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <Checkbox checked={perm[col.key]} onChange={() => togglePerm(perm.module, col.key)} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '12px 18px', borderTop: '1px solid #f0f0f0' }}>
                {saveSuccess && <span style={{ fontSize: 13, color: '#35C0A3', fontWeight: 500 }}>✓ Saved for {selectedRole?.name}</span>}
                <button onClick={savePermissions} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, paddingInline: 20, borderRadius: 8, border: 'none', backgroundColor: saving ? '#a8e4d8' : '#35C0A3', color: '#fff', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Heebo', sans-serif" }}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INVITATIONS TAB ── */}
      {activeTab === 'invitations' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #efefef', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              <input
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="Search"
                style={{ paddingLeft: 30, paddingRight: 12, height: 32, borderRadius: 6, border: '1px solid #e8e8e8', fontSize: 13, color: '#333', outline: 'none', fontFamily: "'Heebo', sans-serif", width: 200, backgroundColor: '#fafafa' }}
                onFocus={(e) => (e.target.style.borderColor = '#35C0A3')}
                onBlur={(e) => (e.target.style.borderColor = '#e8e8e8')}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#666', cursor: 'pointer' }}>
                <ArrowUpDown size={13} /> Sort
              </button>
              <button style={{ background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}>
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa' }}>
                {['Name', 'Email', 'Role', 'Status', 'Send Date', ''].map((h) => (
                  <th key={h} style={{ ...thStyle, textAlign: h === 'Name' ? 'left' : 'center', width: h === '' ? 72 : 'auto' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingInv ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading invitations…</td></tr>
              ) : filteredInvitations.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No invitations found.</td></tr>
              ) : (
                filteredInvitations.map((inv, i) => {
                  const statusStyle = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pending;
                  const fullName = `${inv.first_name} ${inv.last_name}`.trim();
                  const sendDate = new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

                  return (
                    <tr key={inv.id} style={{ borderBottom: i < filteredInvitations.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <td style={tdStyle}>{fullName}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#666' }}>{inv.email}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {inv.role_name
                          ? <span style={{ backgroundColor: '#e8f8f5', color: '#35C0A3', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{inv.role_name}</span>
                          : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ ...statusStyle, borderRadius: 5, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#888', fontSize: 13 }}>{sendDate}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* Resend */}
                          <button
                            onClick={() => resendInvitation(inv.id)}
                            disabled={resendingId === inv.id || inv.status === 'accepted'}
                            title={inv.status === 'accepted' ? 'Already accepted' : 'Resend invitation'}
                            style={{ background: 'none', border: 'none', cursor: inv.status === 'accepted' ? 'not-allowed' : resendingId === inv.id ? 'not-allowed' : 'pointer', color: inv.status === 'accepted' ? '#cccccc' : '#35C0A3', display: 'flex', alignItems: 'center', padding: 3, opacity: inv.status === 'accepted' ? 0.4 : 1 }}
                          >
                            <RefreshCw size={14} style={{ animation: resendingId === inv.id ? 'spin 0.8s linear infinite' : 'none' }} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => deleteInvitation(inv.id)}
                            disabled={deletingInvId === inv.id}
                            title="Delete invitation"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', padding: 3 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAddUser && <AddUserModal roles={roles} onClose={() => setShowAddUser(false)} onSent={fetchUsers} />}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u));
            setEditingUser(null);
          }}
        />
      )}
      {showAddRole && (
        <AddRoleModal
          onClose={() => setShowAddRole(false)}
          onAdded={(role) => { setRoles((prev) => [...prev, role]); setSelectedRoleId(role.id); }}
        />
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '10px 18px', fontSize: 13, fontWeight: 500, color: '#777',
  textAlign: 'center', borderBottom: '1px solid #efefef',
};
const tdStyle: React.CSSProperties = {
  padding: '11px 18px', fontSize: 13.5, color: '#444',
};

const STATUS_BADGE: Record<string, React.CSSProperties> = {
  accepted: { backgroundColor: '#e8f8f5', color: '#35C0A3' },
  pending:  { backgroundColor: '#fff8e6', color: '#f59e0b' },
  rejected: { backgroundColor: '#fff0f0', color: '#f87171' },
};
