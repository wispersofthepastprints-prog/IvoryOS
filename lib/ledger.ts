// lib/ledger.ts — Ivory Ledger data layer (Sprint 1)
// All user scoping is via auth uid (RLS enforces it); the existing
// bookings/invoices tables use photographer_id — server-side webhook
// code must map photographers.auth_id <-> photographer_id.
import { supabase } from "./supabase";

export const EXPENSE_CATEGORIES = [
  "Equipment", "Vehicle", "Software", "Insurance",
  "Marketing", "Studio/Home Office", "Travel", "Other",
] as const;

// ---------- Australian financial year: Jul–Jun ----------
export function auQuarter(d: Date): string {
  const m = d.getMonth();
  const q = Math.floor(((m + 6) % 12) / 3) + 1;
  const fy = m >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${fy}-Q${q}`;
}

export function auFinancialYear(d: Date): number {
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

export const formatAUD = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;

// ---------- Settings ----------
export async function getLedgerSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("ledger_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

export async function saveLedgerSettings(input: {
  country: string; gst_registered: boolean; set_aside_pct: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  const { error } = await supabase
    .from("ledger_settings")
    .upsert({ user_id: user.id, ...input }, { onConflict: "user_id" });
  if (error) throw error;
}

// ---------- Income ----------
export async function monthIncomeCents(month: Date): Promise<number> {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const { data } = await supabase
    .from("ledger_income")
    .select("amount")
    .gte("paid_at", start.toISOString());
  return (data || []).reduce((s: number, r: any) => s + Math.round(r.amount * 100), 0);
}

// Called by the Stripe webhook handler (and one-time backfill).
// Safe to call repeatedly: unique(user_id, stripe_event_id) makes it idempotent.
export async function recordIncomeEvent(entry: {
  booking_id?: string; invoice_id?: string;
  amount: number; gst_amount?: number; category?: string;
  paid_at: string; stripe_event_id?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  const { error } = await supabase.from("ledger_income").insert({
    user_id: user.id,
    gst_amount: 0,
    category: "Other",
    ...entry,
  });
  if (error && error.code !== "23505") throw error; // ignore dup webhook
}

// ---------- Tax Vault (derived — never stored) ----------
export async function vaultTotalsCents(setAsidePct: number) {
  const { data } = await supabase.from("ledger_income").select("amount, paid_at");
  const rows = data || [];
  const totalIncome = rows.reduce((s: number, r: any) => s + r.amount, 0);
  const byQuarter: Record<string, number> = {};
  rows.forEach((r: any) => {
    const q = auQuarter(new Date(r.paid_at));
    byQuarter[q] = (byQuarter[q] || 0) + r.amount;
  });
  return {
    incomeCents: Math.round(totalIncome * 100),
    setAsideCents: Math.round(totalIncome * 100 * (setAsidePct / 100)),
    byQuarterCents: Object.fromEntries(
      Object.entries(byQuarter).map(([q, v]) => [q, Math.round((v as number) * 100)])
    ),
  };
}

// ---------- Expenses ----------
export async function addExpense(input: {
  amount: number; gst_amount?: number; merchant?: string;
  category: string; note?: string; spent_at: string; // YYYY-MM-DD
  source?: "manual" | "receipt"; receipt_image_url?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  const { error } = await supabase.from("ledger_expenses").insert({
    user_id: user.id, source: "manual", ...input,
  });
  if (error) throw error;
}

export async function recentActivity(limit = 20) {
  const [{ data: expenses }, { data: income }] = await Promise.all([
    supabase.from("ledger_expenses").select("*").order("spent_at", { ascending: false }).limit(limit),
    supabase.from("ledger_income").select("*").order("paid_at", { ascending: false }).limit(limit),
  ]);
  const items = [
    ...(expenses || []).map((e: any) => ({
      id: e.id, kind: "expense" as const, label: e.merchant || "Expense",
      amountCents: -Math.round(e.amount * 100), category: e.category,
      when: e.spent_at, source: e.source,
    })),
    ...(income || []).map((i: any) => ({
      id: i.id, kind: "income" as const, label: i.category || "Income",
      amountCents: Math.round(i.amount * 100), category: i.category,
      when: i.paid_at, source: "invoice",
    })),
  ];
  return items.sort((a, b) => (a.when < b.when ? 1 : -1)).slice(0, limit);
}

// Standard GST extraction: 1/11 of the total (GST-inclusive pricing)
export const gstFromTotal = (totalCents: number) => Math.round(totalCents / 11);
