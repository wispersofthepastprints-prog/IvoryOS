import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = 'https://ewqbywvhgujwkqnxvuqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3cWJ5d3ZoZ3Vqd2txbnh2dXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTY3NzMsImV4cCI6MjA5NzUzMjc3M30.lO9JTL4lY1pUm362VgjIIPCVqbR8rSymYx6WD3Swu3o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://wispersofthepastprints-prog.github.io/IvoryOS/verify-email.html",
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * DEPRECATED: getSession() returns stale tokens from storage.
 * Use getValidUser() instead which validates the token with the server.
 */
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
};

/**
 * Validates the current session by hitting the Supabase server.
 * This forces a token refresh if the token is expired.
 * Returns the user object or null if the session is invalid.
 */
export const getValidUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error("[Auth] Session invalid:", error?.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error("[Auth] getValidUser exception:", err);
    return null;
  }
};
