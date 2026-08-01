// supabase/functions/connect-status/index.ts
// Reports the photographer's Stripe Connect onboarding state:
//   "none"      - no Express account yet
//   "pending"   - account exists but onboarding incomplete
//   "connected" - details submitted and payouts enabled

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: photog } = await admin
      .from("photographers")
      .select("stripe_connect_account_id")
      .eq("auth_id", user.id)
      .single();

    if (!photog?.stripe_connect_account_id) {
      return json({ status: "none" });
    }

    const res = await fetch(
      `https://api.stripe.com/v1/accounts/${photog.stripe_connect_account_id}`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
    );
    const account = await res.json();
    if (!res.ok) {
      console.error("Stripe account retrieve failed:", JSON.stringify(account?.error || account));
      return json({ status: "pending", note: "could not retrieve account" });
    }

    const done = account.details_submitted === true && account.payouts_enabled === true;
    return json({
      status: done ? "connected" : "pending",
      details_submitted: account.details_submitted === true,
      charges_enabled: account.charges_enabled === true,
      payouts_enabled: account.payouts_enabled === true,
    });
  } catch (e: any) {
    console.error("connect-status error:", e?.message || String(e));
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
