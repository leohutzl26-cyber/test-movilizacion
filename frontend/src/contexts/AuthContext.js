import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authApi, profilesApi } from "@/lib/supabase-api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // El perfil propio se pide al backend; el navegador no lee la tabla "profiles".
  const fetchProfile = async () => {
    try {
      const { profile } = await profilesApi.me();
      return profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('supabase.auth.token');
        if (token) {
          const currentUser = await authApi.getCurrentUser();
          if (currentUser) {
            const profile = await fetchProfile(currentUser.id);
            setUser(profile ? {
              id: profile.id,
              email: profile.email,
              username: profile.username,
              name: profile.name,
              role: profile.role,
              department: profile.department,
              status: profile.status,
              must_change_password: profile.must_change_password
            } : currentUser);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error restoring session from custom token:", error);
      }

      // Caída al flujo nativo de Supabase
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await fetchProfile(session.user.id);
          setUser(profile ? {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            name: profile.name,
            role: profile.role,
            department: profile.department,
            status: profile.status,
            must_change_password: profile.must_change_password
          } : session.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error getting native Supabase session:", e);
        setUser(null);
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile ? {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role,
          department: profile.department,
          status: profile.status,
          must_change_password: profile.must_change_password
        } : session.user);
        setLoading(false);
      } else {
        // Solo deslogueamos si no hay un token de la API personalizada guardado en localStorage
        const hasCustomToken = localStorage.getItem('supabase.auth.token');
        if (!hasCustomToken) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      // Use our custom auth function (works with username or email)
      const response = await authApi.login({ username, password });

      if (response.token) {
        // Store the token for Supabase Function calls
        localStorage.setItem('supabase.auth.token', response.token);

        // Set user profile data
        setUser(response.user);

        return response.user;
      } else {
        throw new Error('Inicio de sesión fallido: No se recibió token');
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      if (response.user) {
        setUser(prev => ({
          ...prev,
          must_change_password: false
        }));
      }
      return response;
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      // Use our custom auth function
      const response = await authApi.register(userData);

      // El backend (auth-register) ya crea el perfil en estado "pending", a la espera de un admin.
      if (response.user_id) {
        return response;
      } else {
        throw new Error('Registration failed: No user ID received');
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('supabase.auth.token');
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }, []);

  const approveUser = useCallback(async (userId) => {
    try {
      const response = await authApi.updateUserStatus(userId, 'approve');

      // Refresh current user if it's the same user
      if (user && user.id === userId) {
        const updatedProfile = await fetchProfile(userId);
        if (updatedProfile) {
          setUser(prev => ({
            ...prev,
            ...updatedProfile
          }));
        }
      }

      return response;
    } catch (error) {
      console.error("Approve user error:", error);
      throw error;
    }
  }, [user]);

  const rejectUser = useCallback(async (userId) => {
    try {
      const response = await authApi.updateUserStatus(userId, 'reject');

      // Refresh current user if it's the same user
      if (user && user.id === userId) {
        const updatedProfile = await fetchProfile(userId);
        if (updatedProfile) {
          setUser(prev => ({
            ...prev,
            ...updatedProfile
          }));
        }
      }

      return response;
    } catch (error) {
      console.error("Reject user error:", error);
      throw error;
    }
  }, [user]);

  const value = {
    user,
    loading,
    login,
    register,
    changePassword,
    logout,
    approveUser,
    rejectUser,
    isAuthenticated: !!user,
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => user && roles.includes(user.role)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}