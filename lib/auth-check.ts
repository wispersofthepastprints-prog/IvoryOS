import { supabase } from './supabase';

export async function checkAuth() {
  let session = null;
  let attempts = 0;
  while (!session && attempts < 3) {
    const { data } = await supabase.auth.getSession();
    session = data?.session;
    if (!session) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    attempts++;
  }

  const user = session?.user;

  if (!user) {
    return {
      ok: false,
      error: 'session_expired',
      message: 'Session expired. Please log out and log back in.',
    };
  }

  if (!user.email_confirmed_at) {
    return {
      ok: false,
      error: 'email_not_verified',
      message: 'Please verify your email before continuing. Check your inbox for the confirmation link.',
    };
  }

  return { ok: true, user, session };
}
