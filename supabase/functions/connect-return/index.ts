// supabase/functions/connect-return/index.ts
// Stripe onboarding return/refresh bounce page.
// Stripe account_links only accept https:// URLs, so Stripe sends the user
// here and this page immediately redirects back into the app via its scheme.
// Deploy with: npx supabase functions deploy connect-return --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APP_URL = Deno.env.get("APP_RETURN_URL") || "ivoryos://settings";

serve(() => {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${APP_URL}">
  <title>Returning to IvoryOS…</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding-top: 40vh; background: #F8F6F0; color: #0A0A0A;">
  <script>window.location.replace(${JSON.stringify(APP_URL)});</script>
  <p>Returning to IvoryOS…</p>
  <p><a href="${APP_URL}" style="color: #C9A227;">Tap here if nothing happens</a></p>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
