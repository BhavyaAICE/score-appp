import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { rbacService, Roles } from "../services/rbacService";
import { authService } from "../services/authService";

export const AppContext = createContext();

const LOADING_TIMEOUT = 30000; // 30 seconds timeout

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const loadingTimeoutRef = useRef(null);
  const profileLoadedRef = useRef(false);

  const loadUserProfile = useCallback(async (userId) => {
    if (profileLoadedRef.current) return;

    try {
      const profile = await rbacService.getUserProfile(userId);
      if (profile) {
        profileLoadedRef.current = true;
        setUserProfile(profile);
        const rolePermissions = await rbacService.getPermissionsForRole(profile.role);
        setPermissions(rolePermissions);

        if (profile.organization_id) {
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .maybeSingle();
          if (orgError) console.warn('Error loading organization:', orgError);
          setOrganization(org);

          const { data: brandingData, error: brandingError } = await supabase
            .from('branding_settings')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();
          if (brandingError) console.warn('Error loading branding:', brandingError);
          setBranding(brandingData);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setAuthError('Failed to load user profile. Please try again.');
    }
  }, []);

  const signUp = async (email, password, name) => {
    setAuthError(null);
    const result = await authService.signUp(email, password, name);
    return result;
  };

  const signIn = async (email, password) => {
    setAuthError(null);
    profileLoadedRef.current = false;
    const result = await authService.signIn(email, password);
    if (result.success && result.data.user) {
      const userData = result.data.user;
      setUser({
        id: userData.id,
        email: userData.email,
        username: userData.user_metadata?.name || userData.email,
      });
      await loadUserProfile(userData.id);
    }
    return result;
  };

  const login = async (userData) => {
    setAuthError(null);
    profileLoadedRef.current = false;
    setUser({
      id: userData.id,
      email: userData.email,
      username: userData.user_metadata?.name || userData.email,
    });
    await loadUserProfile(userData.id);
  };

  const logout = async () => {
    try {
      setUser(null);
      setUserProfile(null);
      setPermissions([]);
      setOrganization(null);
      setBranding(null);
      setAuthError(null);
      profileLoadedRef.current = false;
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  const retry = useCallback(() => {
    setAuthError(null);
    setLoading(true);
    profileLoadedRef.current = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.name || session.user.email,
        });
        loadUserProfile(session.user.id).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
      setAuthError('Failed to check session. Please refresh the page.');
    });
  }, [loadUserProfile]);

  const hasPermission = useCallback((resource, action) => {
    if (!userProfile) return false;
    if (userProfile.role === Roles.SUPER_ADMIN) return true;

    return permissions.some(
      p => p.resource === resource && p.action === action && p.allowed
    );
  }, [userProfile, permissions]);

  const canAccessEvent = useCallback(async (eventId) => {
    if (!user) return false;
    return rbacService.canAccessEvent(user.id, eventId);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      profileLoadedRef.current = false;
      await loadUserProfile(user.id);
    }
  }, [user, loadUserProfile]);

  // Helper to clear timeout and finish loading successfully
  const finishLoading = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setLoading(false);
    setAuthError(null); // Clear any pending error
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Set up loading timeout - only as a fallback for stuck states
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth loading timeout reached');
        setLoading(false);
        setAuthError('Loading took too long. Please try again.');
      }
    }, LOADING_TIMEOUT);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.name || session.user.email,
        });
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          if (isMounted) {
            loadUserProfile(session.user.id).finally(() => {
              if (isMounted) finishLoading();
            });
          }
        }, 0);
      } else {
        setUser(null);
        setUserProfile(null);
        setPermissions([]);
        setOrganization(null);
        setBranding(null);
        profileLoadedRef.current = false;
        finishLoading();
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.name || session.user.email,
        });
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          if (isMounted) {
            loadUserProfile(session.user.id).finally(() => {
              if (isMounted) finishLoading();
            });
          }
        }, 0);
      } else {
        finishLoading();
      }
    }).catch((error) => {
      console.error('Session check error:', error);
      if (isMounted) {
        // Don't show error for initial load - just finish loading
        // The user can always login manually
        finishLoading();
      }
    });

    // Idle Timeout Logic
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let idleTimer;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (user) {
        idleTimer = setTimeout(async () => {
          console.log("User inactive, logging out...");
          await logout();
          window.location.href = '/login?reason=idle';
        }, IDLE_TIMEOUT_MS);
      }
    };

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    if (user) {
      // Attach listeners
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keypress', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('scroll', handleUserActivity);

      // Start timer
      resetIdleTimer();
    }

    return () => {
      isMounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (idleTimer) clearTimeout(idleTimer);
      subscription.unsubscribe();

      // Remove listeners
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [loadUserProfile, finishLoading, user]); // Added user dependency to re-bind listeners on login/logout

  const value = {
    user,
    userProfile,
    permissions,
    organization,
    branding,
    loading,
    authError,
    login,
    logout,
    signUp,
    signIn,
    hasPermission,
    canAccessEvent,
    refreshProfile,
    retry,
    Roles,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);