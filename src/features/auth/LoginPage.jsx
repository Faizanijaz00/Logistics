import { useState } from 'react';
import { useAuthStore } from '../../store';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function LoginPage() {
  const { login, loading, error } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const mobile = useIsMobile();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div
      className="modern-app"
      style={{
        minHeight: '100vh',
        background: '#f4f4f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: mobile ? '32px' : '48px' }}>
          <h1
            style={{
              fontSize: mobile ? '22px' : '28px',
              fontWeight: '500',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#000000',
              margin: '0 0 8px',
            }}
          >
            Fleet Hub
          </h1>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            Sign in to continue
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            background: '#ffffff',
            padding: mobile ? '24px 20px' : '40px 36px',
            borderRadius: '8px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#000',
                  marginBottom: '8px',
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  border: '1px solid #d1d1d1',
                  borderRadius: '4px',
                  outline: 'none',
                  background: '#fff',
                  color: '#000',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#000',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  border: '1px solid #d1d1d1',
                  borderRadius: '4px',
                  outline: 'none',
                  background: '#fff',
                  color: '#000',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000')}
                onBlur={(e) => (e.target.style.borderColor = '#d1d1d1')}
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#c4001a',
                  margin: '0 0 20px',
                  textAlign: 'center',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '500',
                background: loading || !username || !password ? '#999' : '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
