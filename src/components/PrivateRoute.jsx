import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Roles } from "../services/rbacService";

function PrivateRoute({ children, role, roles, resource, action }) {
  const { user, userProfile, hasPermission, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderRadius: '50%',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = userProfile?.role || 'viewer';

  if (role) {
    if (role === 'admin') {
      if (userRole !== Roles.SUPER_ADMIN && userRole !== Roles.EVENT_ADMIN) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (userRole !== role) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (roles && roles.length > 0) {
    if (!roles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (resource && action) {
    if (!hasPermission(resource, action)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

export default PrivateRoute;
