# IvoryOS — Sprint 1 integration patches

## 1. app/_layout.tsx
Add these Stack.Screen registrations inside the existing <Stack>:
```tsx
<Stack.Screen name="money/index" />
<Stack.Screen name="money/setup" />
<Stack.Screen name="money/add-expense" />
<Stack.Screen name="money/vault" />
```

## 2. app/index.tsx (Home)
**a) Hero card tax line** — inside the existing `revenueCard` View, after the booking-count line, add:
```tsx
{taxSetAside !== null && (
  <Text style={styles.revenueSubtext}>
    Tax set aside: <Text style={{ color: "#C9A227", fontWeight: "700" }}>{formatCurrency(taxSetAside)}</Text>
  </Text>
)}
```
Add near the other state: `const [taxSetAside, setTaxSetAside] = useState<number | null>(null);`
In fetchDashboardData, after the profile fetch:
```tsx
const { data: ledger } = await supabase.from("ledger_settings").select("set_aside_pct").eq("user_id", user.id).maybeSingle();
if (ledger) {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
  const { data: income } = await supabase.from("ledger_income").select("amount").eq("user_id", user.id).gte("paid_at", startOfMonth.toISOString());
  const totalDollars = (income || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  setTaxSetAside(Math.round(totalDollars * 100 * (ledger.set_aside_pct / 100)));
} else { setTaxSetAside(null); }
```
**b) Quick action** — in the second actionsRow, after "Send Invoice":
```tsx
<QuickActionButton icon="🧾" label="Add Expense" onPress={() => router.push("/money/add-expense")} />
```
**c) Bottom nav** — insert between Bookings and More (repeat this on EVERY screen that has the bottomNav):
```tsx
<TouchableOpacity style={styles.navItem} onPress={() => router.push("/money")}>
  <Text style={styles.navIcon}>💰</Text>
  <Text style={styles.navLabel}>Money</Text>
</TouchableOpacity>
```

## 3. app/more.tsx
Add at the top of menuItems:
```tsx
{ icon: "💰", label: "Money & Tax", route: "/money" },
```

## 4. New files (from this package)
- `lib/ledger.ts`  ->  `lib/ledger.ts`
- `app/money/index.tsx`, `app/money/setup.tsx`, `app/money/add-expense.tsx`, `app/money/vault.tsx`

## 5. Remaining wiring (server-side, not in this package)
- Stripe webhook -> `ledger_income` via `recordIncomeEvent` pattern
  (idempotent via unique(user_id, stripe_event_id); map photographers.auth_id <-> photographer_id)
- RevenueCat: add `ledger_pro` entitlement + `ivoryos_ledger_monthly`/`ivoryos_ledger_yearly`
  products when Ledger Pro ships (Sprint 3)
- Receipt snap (Sprint 2): expo-camera + OCR — needs native rebuild

## Known schema assumptions to verify
- ledger tables are keyed by auth user id (auth.users) — migration shipped 2026-09-19
- bookings: deposit_paid, status, package_price (cents), event_date, photographer_id
- photographers: id, auth_id
