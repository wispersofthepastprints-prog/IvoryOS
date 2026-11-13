import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing Stripe signature" }, 400);

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message || String(err));
    return json({ error: "Invalid Stripe signature" }, 400);
  }

  if (event.type !== "checkout.session.completed") return json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  // IvoryOS subscriptions use Google Play/RevenueCat, never Stripe.
  if (session.mode !== "payment") return json({ received: true });
  if (session.payment_status !== "paid") return json({ received: true });

  const bookingId = session.metadata?.booking_id;
  const photographerId = session.metadata?.photographer_id;
  const paymentType = session.metadata?.payment_type;
  if (!bookingId || !photographerId || (paymentType !== "deposit" && paymentType !== "balance")) {
    console.error("Payment webhook rejected: incomplete metadata", { eventId: event.id });
    return json({ error: "Invalid payment metadata" }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, photographer_id, deposit_amount, balance_due")
    .eq("id", bookingId)
    .eq("photographer_id", photographerId)
    .single();

  if (bookingError || !booking) {
    console.error("Payment webhook rejected: booking mismatch", { eventId: event.id });
    return json({ error: "Booking mismatch" }, 400);
  }

  const expectedAmount = paymentType === "deposit" ? booking.deposit_amount : booking.balance_due;
  if (
    !Number.isInteger(expectedAmount) ||
    expectedAmount <= 0 ||
    session.amount_total !== expectedAmount ||
    session.currency !== "aud" ||
    session.metadata?.expected_amount !== String(expectedAmount)
  ) {
    console.error("Payment webhook rejected: amount or currency mismatch", { eventId: event.id });
    return json({ error: "Payment amount mismatch" }, 400);
  }

  if (typeof session.payment_intent !== "string") {
    console.error("Payment webhook rejected: missing payment intent", { eventId: event.id });
    return json({ error: "Missing payment intent" }, 400);
  }

  const { data: photographer, error: photographerError } = await supabase
    .from("photographers")
    .select("stripe_connect_account_id")
    .eq("id", photographerId)
    .single();
  if (photographerError || !photographer?.stripe_connect_account_id) {
    console.error("Payment webhook rejected: connected account missing", { eventId: event.id });
    return json({ error: "Connected account mismatch" }, 400);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
  const destination = paymentIntent.transfer_data?.destination;
  const destinationId = typeof destination === "string" ? destination : destination?.id;
  // IvoryOS charges no platform fee on client payments: reject any settlement
  // that includes one, so a stale or tampered session can never skim a fee.
  const settledFee = paymentIntent.application_fee_amount ?? 0;
  if (
    paymentIntent.status !== "succeeded" ||
    paymentIntent.amount_received !== expectedAmount ||
    paymentIntent.currency !== "aud" ||
    settledFee !== 0 ||
    destinationId !== photographer.stripe_connect_account_id
  ) {
    console.error("Payment webhook rejected: settlement mismatch", { eventId: event.id });
    return json({ error: "Payment settlement mismatch" }, 400);
  }

  const paidField = paymentType === "deposit" ? "deposit_paid" : "balance_paid";
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      [paidField]: true,
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .eq("photographer_id", photographerId);

  if (updateError) {
    console.error("Failed to record booking payment:", updateError.message);
    return json({ error: "Database error" }, 500);
  }

  console.log(`Recorded ${paymentType} payment for booking ${booking.id}`);
  return json({ received: true });
});
