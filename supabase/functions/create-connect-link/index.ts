// supabase/functions/create-connect-link/index.ts
// Creates (or reuses) a Stripe Express account for the photographer
// and returns an onboarding link they complete in the browser.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const RETURN_URL = Deno.env.get("STRIPE_RETURN_URL") || "ivoryos://settings";
const REFRESH_URL = Deno.env.get("STRIPE_REFRESH_URL") || "ivoryos://settings";

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

async function stripePost(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe error on ${path}`);
  }
  return data;
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

    // Identify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // Admin client for reads/writes on photographers
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: photog, error: photogErr } = await admin
      .from("photographers")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (photogErr || !photog) {
      return json({ error: "Photographer profile not found. Set up your profile first." }, 404);
    }

    // Reuse existing Connect account, or create one
    let accountId: string = photog.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripePost("/accounts", {
        type: "express",
        country: "AU",
        email: user.email ?? "",
        "capabilities[card_payments][requested]": "true",
        "capabilities[transfers][requested]": "true",
        "metadata[photographer_id]": String(photog.id ?? ""),
        "metadata[auth_id]": user.id,
      });
      accountId = account.id;

      const { error: updateErr } = await admin
        .from("photographers")
        .update({ stripe_connect_account_id: accountId })
        .eq("auth_id", user.id);
      if (updateErr) throw new Error(`Failed to save account id: ${updateErr.message}`);
    }

    // Generate the onboarding link
    const link = await stripePost("/account_links", {
      account: accountId,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: "account_onboarding",
    });

    return json({ url: link.url, account: accountId });
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
