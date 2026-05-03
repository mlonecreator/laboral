/**
 * db.js
 * Mini-ORM sobre localStorage com dados de demonstração iniciais.
 */



import { supabase } from './supabase.js';

// Helper para converter snake_case (DB) para camelCase (JS) se necessário, 
// ou apenas manter a consistência com o que o app espera.

class SupabaseDatabase {
  collection(name) {
    return {
      getAll: async () => {
        const { data, error } = await supabase.from(name).select('*');
        if (error) throw error;
        return data;
      },
      getById: async (id) => {
        const { data, error } = await supabase.from(name).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
      },
      create: async (payload) => {
        const { data, error } = await supabase.from(name).insert([payload]).select().single();
        if (error) throw error;
        return data;
      },
      update: async (id, payload) => {
        const { data, error } = await supabase.from(name).update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data;
      },
      delete: async (id) => {
        const { error } = await supabase.from(name).delete().eq('id', id);
        if (error) throw error;
      }
    };
  }
}

export const db = new SupabaseDatabase();
db.supabase = supabase;
window.db = db;
