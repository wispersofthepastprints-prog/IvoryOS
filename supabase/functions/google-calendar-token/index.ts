import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: photographer, error: profileError } = await admin
      .from("photographers")
      .select("id, google_refresh_token, google_access_token, google_token_expiry")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !photographer?.google_refresh_token) {
      return json({ error: "Google Calendar is not connected" }, 400);
    }

    const expiry = photographer.google_token_expiry ? new Date(photographer.google_token_expiry).getTime() : 0;
    if (photographer.google_access_token && expiry > Date.now() + 60_000) {
      return json({ access_token: photographer.google_access_token, expiry: photographer.google_token_expiry });
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: photographer.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) {
      const revoked = tokens?.error === "invalid_grant";
      await admin.from("photographers").update({
        google_access_token: null,
        google_token_expiry: null,
        ...(revoked ? { google_refresh_token: null } : {}),
      }).eq("id", photographer.id);
      console.error("Google token refresh failed", { status: tokenResponse.status, revoked });
      return json({ error: revoked ? "Google Calendar access was revoked. Reconnect it in Settings." : "Could not renew Google Calendar access" }, 401);
    }

    const newExpiry = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();
    const { error: updateError } = await admin
      .from("photographers")
      .update({
        google_access_token: tokens.access_token,
        google_token_expiry: newExpiry,
        ...(tokens.refresh_token ? { google_refresh_token: tokens.refresh_token } : {}),
      })
      .eq("id", photographer.id);

    if (updateError) {
      console.error("Failed to store renewed Google token:", updateError.message);
      return json({ error: "Could not save renewed Google Calendar access" }, 500);
    }

    return json({ access_token: tokens.access_token, expiry: newExpiry });
  } catch (err: any) {
    console.error("google-calendar-token error:", err?.message || String(err));
    return json({ error: "Could not renew Google Calendar access" }, 500);
  }
});
