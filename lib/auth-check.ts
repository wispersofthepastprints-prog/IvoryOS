// lib/auth-check.ts
import { supabase, getValidUser } from "./supabase";

export async function checkAuth() {
  // Server-validated session check. getValidUser() asks Supabase to verify
  // the token; getSession() alone returns stale/expired local sessions and
  // lets the app boot into a "ghost" state where nothing can save.
  const user = await getValidUser();

  if (!user) {
    return {
      ok: false,
      error: "session_expired",
      message: "Session expired. Please log out and log back in.",
    };
  }

  if (!user.email_confirmed_at) {
    return {
      ok: false,
      error: "email_not_verified",
      message: "Please verify your email before continuing.",
    };
  }

  const { data } = await supabase.auth.getSession();
  return { ok: true, user, session: data?.session };
}
