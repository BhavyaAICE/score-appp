import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

function Unauthorized() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useApp();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '40px'
        }}>
          🚫
        </div>

        <h1 style={{
          fontSize: '28px',
          color: '#1e3a5f',
          marginBottom: '16px'
        }}>
          Access Denied
        </h1>

        <p style={{
          color: '#64748b',
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          You don't have permission to access this page.
          {userProfile && (
            <span> Your current role is <strong>{userProfile.role}</strong>.</span>
          )}
        </p>

        {user && (
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            marginBottom: '24px'
          }}>
            Logged in as: {user.email}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Go Back
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Home
          </button>

          {user && (
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              style={{
                padding: '12px 24px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Logout
            </button>
          )}
        </div>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#64748b'
        }}>
          <strong>Need access?</strong>
          <p style={{ margin: '8px 0 0' }}>
            Contact your organization's administrator to request the appropriate permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;
