import { supabase } from './supabase';

export async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) {
    return { 
      ok: false, 
      error: 'not_logged_in',
      message: 'Please log in to continue.' 
    };
  }
  
  if (!user.email_confirmed_at) {
    return { 
      ok: false, 
      error: 'email_not_verified',
      message: 'Please verify your email before continuing. Check your inbox for the confirmation link.' 
    };
  }
  
  return { ok: true, user, session };
}