import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user) => {
    try {
      const { data: profile, error } = await supabase
        .rpc('get_current_user_profile');
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      setUserProfile(profile[0]);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signInWithPassword = async (email, password) => {
    setSignInLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { success: true, message: 'Successfully signed in!' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setSignInLoading(false);
    }
  };

  const signUpWithPassword = async (email, password) => {
    setSignUpLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      return { success: true, message: 'Account created! Please check your email for confirmation.' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    } finally {
      setSignUpLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const hasRole = (role) => {
    if (!userProfile) return false;
    return userProfile.roles?.includes(role) || userProfile.primary_role === role;
  };

  const hasAnyRole = (roles) => {
    if (!userProfile) return false;
    return userProfile.roles?.some(role => roles.includes(role)) || roles.includes(userProfile.primary_role);
  };

  const isDriver = () => hasRole('driver');
  const isManager = () => hasRole('manager');
  const isAdmin = () => hasRole('admin');

  const value = {
    user,
    userProfile,
    loading,
    signInLoading,
    signUpLoading,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    hasRole,
    hasAnyRole,
    isDriver,
    isManager,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 