import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
const PAYMENT_RETURN_BASE = "https://wispersofthepastprints-prog.github.io/IvoryOS";

type PaymentType = "deposit" | "balance";

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

    let input: { booking_id?: unknown; type?: unknown };
    try {
      input = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const bookingId = typeof input.booking_id === "string" ? input.booking_id : "";
    const paymentType = input.type as PaymentType;
    if (!bookingId || (paymentType !== "deposit" && paymentType !== "balance")) {
      return json({ error: "A booking ID and deposit or balance payment type are required" }, 400);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: photographer, error: photographerError } = await admin
      .from("photographers")
      .select("id, stripe_connect_account_id")
      .eq("auth_id", user.id)
      .single();

    if (photographerError || !photographer) {
      return json({ error: "Photographer profile not found" }, 404);
    }
    if (!photographer.stripe_connect_account_id) {
      return json({ error: "Connect your bank account in Settings before creating a payment link" }, 400);
    }

    // Derive every financial field from the authenticated owner's booking.
    // The caller supplies only the booking ID and payment type.
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, photographer_id, package_description, deposit_amount, balance_due, deposit_paid, balance_paid, clients(full_name, email)")
      .eq("id", bookingId)
      .eq("photographer_id", photographer.id)
      .single();

    if (bookingError || !booking) return json({ error: "Booking not found" }, 404);

    const alreadyPaid = paymentType === "deposit" ? booking.deposit_paid : booking.balance_paid;
    if (alreadyPaid) return json({ error: `This ${paymentType} is already marked as paid` }, 409);

    const amount = paymentType === "deposit" ? booking.deposit_amount : booking.balance_due;
    if (!Number.isInteger(amount) || amount <= 0) {
      return json({ error: `This booking has no valid ${paymentType} amount` }, 400);
    }

    // No IvoryOS platform fee: the full payment (less Stripe's own processing
    // charges, per Stripe's terms) transfers to the connected account.
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients;
    const clientEmail = client?.email || undefined;
    const paymentLabel = paymentType === "deposit" ? "Deposit" : "Balance";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "aud",
          product_data: { name: `${booking.package_description || "Photography booking"} — ${paymentLabel}` },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${PAYMENT_RETURN_BASE}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PAYMENT_RETURN_BASE}/payment-cancel.html`,
      client_reference_id: user.id,
      customer_email: clientEmail,
      metadata: {
        booking_id: booking.id,
        photographer_id: photographer.id,
        payment_type: paymentType,
        expected_amount: String(amount),
      },
      payment_intent_data: {
        transfer_data: { destination: photographer.stripe_connect_account_id },
        metadata: {
          booking_id: booking.id,
          photographer_id: photographer.id,
          payment_type: paymentType,
        },
      },
    });

    if (!session.url) return json({ error: "Stripe did not return a payment URL" }, 502);
    return json({ url: session.url, session_id: session.id });
  } catch (err: any) {
    console.error("Payment creation error:", err?.message || String(err));
    return json({ error: "Could not create payment session" }, 500);
  }
});
