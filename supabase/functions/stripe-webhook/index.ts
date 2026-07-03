import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("PROJECT_URL") || "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature || "", webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Handle subscription payments (Pro upgrade)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const authId = session.client_reference_id;

    // Subscription payment (Pro upgrade)
    if (session.mode === "subscription" && authId) {
      const { error } = await supabase
        .from("photographers")
        .update({
          subscription_tier: "pro",
          subscription_status: "active",
          stripe_customer_id: session.customer,
        })
        .eq("auth_id", authId);

      if (error) {
        console.error("Failed to upgrade photographer:", error);
        return new Response("Database error", { status: 500 });
      }
      console.log(`Upgraded photographer ${authId} to Pro`);
    }

    // One-time payment (Deposit or Balance)
    if (session.mode === "payment") {
      const bookingId = session.metadata?.booking_id;
      const paymentType = session.metadata?.payment_type;

      if (bookingId && paymentType) {
        const updateData = paymentType === "deposit" 
          ? { deposit_paid: true } 
          : { balance_paid: true };

        const { error } = await supabase
          .from("bookings")
          .update(updateData)
          .eq("id", bookingId);

        if (error) {
          console.error("Failed to update booking payment:", error);
          return new Response("Database error", { status: 500 });
        }
        console.log(`Marked ${paymentType} as paid for booking ${bookingId}`);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});