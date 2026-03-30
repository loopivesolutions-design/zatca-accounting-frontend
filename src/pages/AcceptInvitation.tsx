import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { BACKEND_URL } from '../api/axios';
import { parseApiError } from '../api/errors';

/** Public — no auth. GET verify uses plain axios to avoid attaching a stale token. */
export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [roleHint, setRoleHint] = useState('');

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError('Missing invitation token. Open the link from your email.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/v1/user/accept-invitation/`, { params: { token } });
        if (cancelled) return;
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setEmailHint(data.email ?? '');
        setRoleHint(data.role ?? '');
      } catch (err) {
        if (!cancelled) setVerifyError(parseApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${BACKEND_URL}/api/v1/user/accept-invitation/`, {
        token,
        password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      setSubmitError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 360,
    height: 40,
    borderRadius: 6,
    border: '1px solid #dddddd',
    padding: '0 12px',
    fontSize: 14,
    color: '#1a1a1a',
    outline: 'none',
    fontFamily: "'Heebo', sans-serif",
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: "url('/login-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Heebo', sans-serif",
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '28px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#0E4D41', margin: '0 0 8px', textAlign: 'center' }}>
          Activate your account
        </h1>
        {emailHint && (
          <p style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 }}>
            {emailHint}
            {roleHint ? ` · ${roleHint}` : ''}
          </p>
        )}

        {loading && <p style={{ textAlign: 'center', color: '#888' }}>Verifying invitation…</p>}

        {verifyError && (
          <div style={{ backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            {verifyError}
          </div>
        )}

        {done && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: 8, padding: '12px 14px', fontSize: 14, textAlign: 'center' }}>
            Account activated. Redirecting to login…
          </div>
        )}

        {!loading && !verifyError && !done && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 360 }}>
              <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>First name</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div style={{ width: '100%', maxWidth: 360 }}>
              <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>Last name</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div style={{ width: '100%', maxWidth: 360 }}>
              <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>Password</label>
              <input
                type="password"
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {submitError && (
              <div style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff0f0', border: '1px solid #fecaca', color: '#c0392b', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                {submitError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 8,
                width: '100%',
                maxWidth: 360,
                height: 42,
                borderRadius: 8,
                border: 'none',
                backgroundColor: submitting ? '#7dd8c7' : '#35C0A3',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: "'Heebo', sans-serif",
              }}
            >
              {submitting ? 'Saving…' : 'Activate account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
