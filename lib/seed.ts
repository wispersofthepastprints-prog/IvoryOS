// lib/seed.ts — one-time sample content for new studios (idempotent)
import { supabase } from "./supabase";

const SAMPLE_TITLE = "Sample Wedding — Emma & Liam";

export async function seedSampleData(authId: string) {
  try {
    const { data: profile } = await supabase
      .from("photographers")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();
    if (!profile) return;

    // Idempotent: never double-seed
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("photographer_id", profile.id)
      .eq("title", SAMPLE_TITLE)
      .maybeSingle();
    if (existing) return;

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .insert({ photographer_id: profile.id, full_name: "Emma Harper (Sample)", email: "emma@example.com" })
      .select("id")
      .single();
    if (clientErr) throw clientErr;

    const eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        photographer_id: profile.id,
        client_id: client.id,
        title: SAMPLE_TITLE,
        event_date: eventDate,
        location: "Glen Innes, NSW",
        package_price: 450000,
        deposit_amount: 112500,
        balance_due: 337500,
        status: "confirmed",
        deposit_paid: false,
      });
    if (bookingErr) throw bookingErr;
  } catch (e) {
    console.error("Seed error (non-fatal):", e);
  }
}
