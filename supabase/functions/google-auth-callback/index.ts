// supabase/functions/google-auth-callback/index.ts
// Receives Google's OAuth authorization code, exchanges it for tokens,
// stores the refresh token on the photographer's row, then 302s back
// into the app. Deploy with:
//   npx supabase functions deploy google-auth-callback --no-verify-jwt
//
// Required secrets:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Google Cloud Console -> OAuth client -> Authorized redirect URIs must include:
//   https://<project>.supabase.co/functions/v1/google-auth-callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const APP_RETURN = "ivoryos://settings";

function redirectToApp(params: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_RETURN}${params}` },
  });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // photographer auth_id
    const error = url.searchParams.get("error");

    if (error || !code || !state) {
      console.error("google-auth-callback: missing params", { error, code: !!code, state: !!state });
      return redirectToApp("?google=error");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-auth-callback`;

    // Exchange the code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("token exchange failed:", JSON.stringify(tokens));
      return redirectToApp("?google=error");
    }

    // Store on the photographer's row
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: updateErr } = await admin
      .from("photographers")
      .update({
        google_refresh_token: tokens.refresh_token ?? null,
        google_access_token: tokens.access_token ?? null,
        google_token_expiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
      })
      .eq("auth_id", state);

    if (updateErr) {
      console.error("failed to save google tokens:", JSON.stringify(updateErr));
      return redirectToApp("?google=error");
    }

    console.log(`google calendar connected for auth_id ${state}`);
    return redirectToApp("?google=connected");
  } catch (e: any) {
    console.error("google-auth-callback error:", e?.message || String(e));
    return redirectToApp("?google=error");
  }
});
