// supabase/functions/connect-return/index.ts
// Stripe onboarding return/refresh bounce — v2.
// Responds with a 302 redirect straight to the app scheme, so there's no
// HTML to render (v1's HTML was served as plain text and never executed).
// Deploy with: npx supabase functions deploy connect-return --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APP_URL = Deno.env.get("APP_RETURN_URL") || "ivoryos://settings";

serve(() => {
  return new Response("Returning to IvoryOS…", {
    status: 302,
    headers: { Location: APP_URL },
  });
});
