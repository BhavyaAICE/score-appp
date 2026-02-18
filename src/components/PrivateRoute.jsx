import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Roles } from "../services/rbacService";

function PrivateRoute({ children, role, roles, resource, action }) {
  const { user, userProfile, hasPermission, loading } = useApp();
  const location = useLocation();

  // Show loading while auth state is being determined
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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // IMPORTANT: Wait for userProfile to load before checking role permissions
  // This prevents the "Access Denied" flash when profile is still loading
  if (!userProfile) {
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
          <p>Loading profile...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const userRole = userProfile.role || 'viewer';

  // Super admin always has access to everything in their organization
  const isSuperAdmin = userRole === Roles.SUPER_ADMIN;
  
  if (role) {
    if (role === 'admin') {
      // Admin routes allow super_admin, co_admin, and event_admin
      const adminRoles = [Roles.SUPER_ADMIN, Roles.CO_ADMIN, Roles.EVENT_ADMIN];
      if (!adminRoles.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (role === 'judge') {
      // Judge role check - super_admin can also access judge pages
      if (userRole !== Roles.JUDGE && !isSuperAdmin) {
        return <Navigate to="/unauthorized" replace />;
      }
    } else if (userRole !== role && !isSuperAdmin) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (roles && roles.length > 0) {
    // Super admin bypasses role array checks
    if (!isSuperAdmin && !roles.includes(userRole)) {
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
