import { supabase } from '../lib/supabaseClient';

export const AuthService = {
  // 1. Sign Up & Create Store
  signUp: async (email, password, storeName, ownerName) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      // Create the store linked to this new user
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert([
          {
            user_id: authData.user.id,
            name: storeName,
            owner_name: ownerName,
            currency: 'GH₵'
          }
        ])
        .select()
        .single();

      if (storeError) throw storeError;
      return { user: authData.user, store: storeData };
    }
    return { user: authData.user };
  },

  // 2. Sign In
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // 3. Sign Out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 4. Get Current User
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // 5. Get User's Store
  getStore: async (userId) => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
};