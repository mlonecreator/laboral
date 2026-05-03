/**
 * auth.js
 * Gerenciamento de Autenticação e Sessão
 */
import { supabase } from './supabase.js';
import { db } from './db.js';

export const auth = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Fetch profile
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (pError) throw pError;

    const u = { ...profile, email: data.user.email };
    localStorage.setItem('laboral_user', JSON.stringify(u));
    
    // Update last access if needed (profiles doesn't have it by default in my schema but could be added)
    // For now, let's just return
    return u;
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('laboral_user');
    window.location.href = '/';
  },

  getCurrentUser: () => {
    const data = localStorage.getItem('laboral_user');
    return data ? JSON.parse(data) : null;
  },

  requireAuth: (requiredRole = null) => {
    const user = auth.getCurrentUser();
    if (!user) {
      window.location.href = '/';
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      window.location.href = user.role === 'admin' ? '/dashboard.html' : '/student/portal.html';
      return null;
    }
    return user;
  }
};
