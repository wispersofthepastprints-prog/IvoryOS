import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("PROJECT_URL") || "";
const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  try {
    const { booking_id, photographer_id, type, amount, client_email, description } = await req.json();

    if (!booking_id || !photographer_id || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Get photographer's connected Stripe account
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: photographer, error: photographerError } = await supabase
      .from("photographers")
      .select("stripe_connect_account_id")
      .eq("id", photographer_id)
      .single();

    if (photographerError || !photographer?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: "Photographer has not connected a Stripe account. Please connect your bank account in Settings first." }),
        { status: 400 }
      );
    }

    const connectedAccountId = photographer.stripe_connect_account_id;

    // Create a Stripe Checkout Session on behalf of the connected account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: { name: description || "Ivory OS Payment" },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${supabaseUrl}/functions/v1/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${supabaseUrl}/functions/v1/payment-cancel`,
      metadata: {
        booking_id,
        photographer_id,
        payment_type: type,
      },
      customer_email: client_email || undefined,
          payment_intent_data: {
        transfer_data: {
          destination: connectedAccountId,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Payment creation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});