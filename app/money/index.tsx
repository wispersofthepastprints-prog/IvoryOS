import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import {
  getLedgerSettings, monthIncomeCents, vaultTotalsCents,
  recentActivity, formatAUD,
} from "../../lib/ledger";

export default function MoneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<any>(null);
  const [incomeCents, setIncomeCents] = useState(0);
  const [setAsideCents, setSetAsideCents] = useState(0);
  const [activity, setActivity] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const s = await getLedgerSettings();
      setSettings(s);
      if (!s) return; // setup card rendered below

      const [inc, vault, act] = await Promise.all([
        monthIncomeCents(new Date()),
        vaultTotalsCents(s.set_aside_pct),
        recentActivity(20),
      ]);
      setIncomeCents(inc);
      setSetAsideCents(vault.setAsideCents);
      setActivity(act);

      // Upcoming money owed: confirmed bookings with unpaid deposit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("photographers").select("id").eq("auth_id", user.id).single();
        const { data: due } = await supabase
          .from("bookings")
          .select("id, package_price, event_date, clients(full_name)")
          .eq("photographer_id", profile?.id)
          .eq("deposit_paid", false)
          .eq("status", "confirmed")
          .order("event_date", { ascending: true })
          .limit(3);
        setUpcoming(due || []);
      }
    } catch (e) {
      console.error("Money screen error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  if (loading) return <View style={[styles.container, styles.center]}><Text>Loading...</Text></View>;

  // ---- One-time setup gate ----
  if (!settings) {
    return (
      <View style={[styles.container, styles.center, { padding: 32 }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>💰</Text>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#0A0A0A", marginBottom: 8, textAlign: "center" }}>
          Set up Money &amp; Tax
        </Text>
        <Text style={{ fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 }}>
          Three taps. Ivory Ledger will track your income and set aside tax automatically — it never asks you to type a number.
        </Text>
        <TouchableOpacity style={styles.goldButton} onPress={() => router.push("/money/setup")}>
          <Text style={styles.goldButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct = settings.set_aside_pct;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Money</Text>
          <TouchableOpacity onPress={() => router.push("/settings")}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <TouchableOpacity style={styles.heroCard} onPress={() => router.push("/money/vault")}>
          <Text style={styles.heroLabel}>THIS MONTH</Text>
          <Text style={styles.heroAmount}>{formatAUD(incomeCents)}</Text>
          <Text style={styles.heroSubtext}>Tax set aside: <Text style={{ color: "#C9A227", fontWeight: "700" }}>{formatAUD(setAsideCents)}</Text></Text>
        </TouchableOpacity>

        {/* Tax Vault */}
        <TouchableOpacity style={styles.vaultCard} onPress={() => router.push("/money/vault")}>
          <Text style={styles.vaultText}>
            🏛 Put aside {formatAUD(setAsideCents)} of your {formatAUD(incomeCents)}. {"\n"}
            At {pct}%, you're covered for this quarter.
          </Text>
        </TouchableOpacity>

        {/* Upcoming money owed */}
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>UPCOMING</Text>
            {upcoming.map((b: any) => (
              <TouchableOpacity key={b.id} style={styles.rowCard} onPress={() => router.push(`/bookings/${b.id}`)}>
                <Text style={styles.rowIcon}>💰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Deposit due: {formatAUD(b.package_price || 0)}</Text>
                  <Text style={styles.rowSub}>{b.clients?.full_name || "Client"} — {new Date(b.event_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/money/add-expense")}>
            <Text style={{ fontSize: 24 }}>🧾</Text>
            <Text style={styles.quickLabel}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push("/money/add-expense")}>
            <Text style={{ fontSize: 24 }}>📷</Text>
            <Text style={styles.quickLabel}>Snap Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { opacity: 0.5 }]} onPress={() => {}}>
            <Text style={{ fontSize: 24 }}>📊</Text>
            <Text style={styles.quickLabel}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Recent activity */}
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        {activity.length === 0 && (
          <Text style={styles.emptyText}>No activity yet. Paid invoices will appear here automatically.</Text>
        )}
        {activity.map((item) => (
          <View key={`${item.kind}-${item.id}`} style={styles.rowCard}>
            <Text style={styles.rowIcon}>{item.kind === "income" ? "💵" : "🧾"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowSub}>{item.category} — {new Date(item.when).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: item.amountCents >= 0 ? "#166534" : "#0A0A0A" }]}>
              {item.amountCents >= 0 ? "+" : ""}{formatAUD(Math.abs(item.amountCents))}
            </Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          Ivory Ledger provides record-keeping and estimates only. It is not tax, legal, or financial advice. Figures should be verified with a registered tax agent.
        </Text>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/")}>
          <Text style={styles.navIcon}>🏠</Text><Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/clients")}>
          <Text style={styles.navIcon}>👥</Text><Text style={styles.navLabel}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/bookings")}>
          <Text style={styles.navIcon}>📅</Text><Text style={styles.navLabel}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/money")}>
          <Text style={styles.navIcon}>💰</Text><Text style={styles.navLabelActive}>Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/more")}>
          <Text style={styles.navIcon}>⋮</Text><Text style={styles.navLabel}>More</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/settings")}>
          <Text style={styles.navIcon}>⚙️</Text><Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  scrollView: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  heroCard: { backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 20, padding: 24, marginBottom: 12 },
  heroLabel: { color: "#C9A227", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  heroAmount: { color: "#F8F6F0", fontSize: 36, fontWeight: "800", marginBottom: 4 },
  heroSubtext: { color: "#999", fontSize: 14 },
  vaultCard: { backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#C9A227" },
  vaultText: { color: "#F8F6F0", fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginHorizontal: 24, marginBottom: 12, marginTop: 8 },
  rowCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 24, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E5E5" },
  rowIcon: { fontSize: 20, marginRight: 12 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#0A0A0A" },
  rowSub: { fontSize: 12, color: "#999", marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: "700" },
  quickRow: { flexDirection: "row", gap: 12, marginHorizontal: 24, marginBottom: 16 },
  quickBtn: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  quickLabel: { fontSize: 12, fontWeight: "600", color: "#0A0A0A", marginTop: 8 },
  emptyText: { marginHorizontal: 24, color: "#999", fontSize: 13, marginBottom: 12 },
  disclaimer: { marginHorizontal: 24, marginTop: 16, fontSize: 11, color: "#999", lineHeight: 16 },
  goldButton: { backgroundColor: "#C9A227", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32 },
  goldButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5E5", position: "absolute", bottom: 0, left: 0, right: 0 },
  navItem: { alignItems: "center", flex: 1 },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 11, color: "#999" },
  navLabelActive: { fontSize: 11, color: "#C9A227", fontWeight: "600" },
});
