import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const createAdmin = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Admin user created successfully! Email: ${data.credentials.email}, Password: ${data.credentials.password}`);
      } else {
        setError(data.error || 'Failed to create admin user');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUsers = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/setup/check-users');
      const data = await response.json();

      if (response.ok) {
        setMessage(`Database status: ${JSON.stringify(data, null, 2)}`);
      } else {
        setError(data.error || 'Failed to check users');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      background: '#0f172a', 
      color: '#e2e8f0', 
      minHeight: '100vh', 
      padding: '2rem' 
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#38bdf8', textAlign: 'center', marginBottom: '2rem' }}>
          🔧 TI-Dashboard Setup
        </h1>
        
        <div style={{ 
          background: '#1e293b', 
          padding: '2rem', 
          borderRadius: '8px', 
          border: '1px solid #334155' 
        }}>
          <h2>Initialize Database</h2>
          <p>Click the buttons below to set up your TI-Dashboard:</p>
          
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={checkUsers}
              disabled={loading}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginRight: '1rem',
                fontFamily: 'monospace'
              }}
            >
              Check Database Status
            </button>
            
            <button
              onClick={createAdmin}
              disabled={loading}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace'
              }}
            >
              Create Admin User
            </button>
          </div>

          {loading && <p style={{ color: '#fbbf24' }}>Loading...</p>}
          
          {message && (
            <div style={{ 
              background: '#064e3b', 
              color: '#6ee7b7', 
              padding: '1rem', 
              borderRadius: '6px',
              marginTop: '1rem',
              whiteSpace: 'pre-wrap'
            }}>
              {message}
            </div>
          )}
          
          {error && (
            <div style={{ 
              background: '#7f1d1d', 
              color: '#fca5a5', 
              padding: '1rem', 
              borderRadius: '6px',
              marginTop: '1rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#1f2937', borderRadius: '6px' }}>
            <h3>Default Admin Credentials:</h3>
            <p><strong>Email:</strong> admin@threatwatch.com</p>
            <p><strong>Password:</strong> admin123</p>
            <p style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
              ⚠️ Change the password after first login!
            </p>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                background: '#3730a3',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'monospace'
              }}
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}