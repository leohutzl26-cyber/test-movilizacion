import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authApi } from "@/lib/supabase-api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
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
            setUser(currentUser);
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
          setUser(profile ? { ...session.user, ...profile } : session.user);
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
        setUser(profile ? { session: { ...session }, profile } : session.user);
      } else {
        // Solo deslogueamos si no hay un token de la API personalizada guardado en localStorage
        const hasCustomToken = localStorage.getItem('supabase.auth.token');
        if (!hasCustomToken) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      // Use our custom auth function
      const response = await authApi.login({ email, password });

      if (response.token) {
        // Store the token for Supabase Function calls
        localStorage.setItem('supabase.auth.token', response.token);

        // Set user profile data
        setUser(response.user);

        return response.user;
      } else {
        throw new Error('Login failed: No token received');
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      // Use our custom auth function
      const response = await authApi.register(userData);

      if (response.user_id) {
        // Create profile in Supabase (waiting for admin approval)
        const profileData = {
          id: response.user_id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          status: 'pending'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw new Error('Profile creation failed');
        }

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

  const updateUser = useCallback(async (userData) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Update profile in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local user state
      setUser(prev => ({
        ...prev,
        ...data
      }));

      return data;
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  }, [user]);

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
    logout,
    updateUser,
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