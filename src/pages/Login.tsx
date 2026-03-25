import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/api/v1/user/admin/login/', { email, password });

      const accessToken = data?.access ?? data?.token ?? data?.access_token ?? data?.data?.access;
      const refreshToken = data?.refresh ?? data?.refresh_token ?? data?.data?.refresh;

      if (accessToken) localStorage.setItem('auth_token', accessToken);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      if (data?.user) localStorage.setItem('auth_user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ??
          err.response?.data?.detail ??
          err.response?.data?.error ??
          'Invalid email or password.';
        setError(typeof msg === 'string' ? msg : 'Invalid email or password.');
      } else {
        setError('Unable to connect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: 350,
    height: 40,
    borderRadius: 6,
    border: focused ? '1.5px solid #35C0A3' : '1.5px solid #dddddd',
    padding: '0 12px',
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    outline: 'none',
    fontFamily: "'Heebo', sans-serif",
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
    opacity: loading ? 0.6 : 1,
  });

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundImage: "url('/login-bg.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Heebo', sans-serif",
      }}
    >
      {/* Form — no card, floats on bg */}
      <div style={{ width: 350, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo mark */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#35C0A3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 18,
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          Z
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: '#0E4D41',
            margin: '0 0 6px',
            lineHeight: 1.2,
            textAlign: 'center',
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          Welcome Back
        </h1>
        <p style={{ fontSize: 13, color: '#666666', margin: '0 0 28px', textAlign: 'center' }}>
          Login to get back to your account
        </p>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: '1px solid #fecaca',
              color: '#c0392b',
              borderRadius: 8,
              padding: '9px 14px',
              fontSize: 12,
              marginBottom: 14,
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}
        >
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 400, color: '#444444' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocus(true)}
              onBlur={() => setEmailFocus(false)}
              required
              disabled={loading}
              style={inputStyle(emailFocus)}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 400, color: '#444444' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
              required
              disabled={loading}
              style={inputStyle(passwordFocus)}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              height: 42,
              borderRadius: 8,
              border: 'none',
              backgroundColor: loading ? '#7dd8c7' : '#35C0A3',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Heebo', sans-serif",
              transition: 'background-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2dab90'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#35C0A3'; }}
          >
            {loading && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
