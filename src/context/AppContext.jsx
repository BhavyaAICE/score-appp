import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { rbacService, Roles } from "../services/rbacService";
import { authService } from "../services/authService";

export const AppContext = createContext();

const LOADING_TIMEOUT = 10000; // 10 seconds timeout

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
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();
          setOrganization(org);

          const { data: brandingData } = await supabase
            .from('branding_settings')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .single();
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

  useEffect(() => {
    let isMounted = true;
    
    // Set up loading timeout
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMounted && loading) {
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
              if (isMounted) setLoading(false);
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
        setLoading(false);
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
              if (isMounted) setLoading(false);
            });
          }
        }, 0);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Session check error:', error);
      if (isMounted) {
        setLoading(false);
        setAuthError('Failed to check authentication status.');
      }
    });

    return () => {
      isMounted = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

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