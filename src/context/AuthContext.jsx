import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserRow = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error || !data) {
      setProfile(null);
      if (error) throw error;
      return null;
    }
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    // Resolve the persisted session first. Auth callbacks below are deliberately
    // kept synchronous: Supabase warns against awaiting Supabase calls inside
    // onAuthStateChange because it can deadlock the auth lock.
    supabase.auth.getSession().then(async ({ data: { session: currentSession }, error }) => {
      if (!active) return;
      if (error) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setSession(currentSession);
      try {
        await loadUserRow(currentSession?.user?.id);
      } catch (profileError) {
        console.error('Unable to load authenticated user profile:', profileError);
      } finally {
        if (active) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      Promise.resolve().then(async () => {
        if (!active) return;
        try {
          await loadUserRow(nextSession.user.id);
        } catch (profileError) {
          console.error('Unable to load authenticated user profile:', profileError);
        } finally {
          if (active) setLoading(false);
        }
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserRow]);

  const signUp = async ({ email, password, fullName, role, companyName, phone }) => {
    const safeRole = role === 'employer' ? 'employer' : 'candidate';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: safeRole,
          company_name: safeRole === 'employer' ? companyName || null : null,
          phone: phone || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signInWithGoogle = async (expectedRole) => {
    const callback = new URL('/auth/callback', window.location.origin);
    if (expectedRole) callback.searchParams.set('expected_role', expectedRole);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile: () => loadUserRow(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
