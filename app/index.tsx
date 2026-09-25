import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { seedSampleData } from "../lib/seed";

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [taxSetAside, setTaxSetAside] = useState<number | null>(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data: sesh } = await supabase.auth.getSession();
        session = sesh?.session;
        if (!session) await new Promise((r) => setTimeout(r, 500));
        attempts++;
      }
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      if (!user.email_confirmed_at) {
        setLoading(false);
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("photographers")
        .select("id, full_name, email, business_name, location, phone, created_at, subscription_tier, stripe_connect_account_id")
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }
      setProfile(profileData);

      const photographerId = profileData?.id;

      // v1.1: self-heal sample content for fresh accounts (idempotent)
      if (profileData) {
        const { count } = await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", profileData.id);
        if (count === 0) await seedSampleData(user.id);
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Ivory Ledger: monthly tax set-aside (derived, never stored)
      setTaxSetAside(null);
      try {
        const { data: ledger } = await supabase
          .from("ledger_settings")
          .select("set_aside_pct")
          .eq("user_id", user.id)
          .maybeSingle();
        if (ledger) {
          const { data: income } = await supabase
            .from("ledger_income")
            .select("amount")
            .eq("user_id", user.id)
            .gte("paid_at", startOfMonth.toISOString());
          const totalDollars = (income || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
          setTaxSetAside(Math.round(totalDollars * 100 * (ledger.set_aside_pct / 100)));
        }
      } catch (ledgerErr) {
        console.error("Ledger fetch error:", ledgerErr);
      }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("photographer_id", photographerId)
        .gte("created_at", startOfMonth.toISOString())
        .order("event_date", { ascending: true });

      const monthlyRevenueCents = bookings?.reduce((sum, b) => sum + (b.package_price || 0), 0) || 0;

      const today = new Date().toISOString();
      const { data: upcoming } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .eq("photographer_id", photographerId)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(1);

      const pendingActions: any[] = [];

      const { data: unsignedContracts } = await supabase
        .from("bookings")
        .select("*, clients(full_name)")
        .eq("photographer_id", photographerId)
        .eq("status", "contracted")
        .lt("contract_sent_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

      unsignedContracts?.forEach((b: any) => {
        pendingActions.push({
          id: `contract-${b.id}`, type: "contract" as const,
          message: `${b.clients?.full_name || "Client"} contract unsigned`,
          booking_id: b.id, daysOverdue: 2,
        });
      });

      const { data: unpaidDeposits } = await supabase
        .from("bookings")
        .select("*, clients(full_name)")
        .eq("photographer_id", photographerId)
        .eq("deposit_paid", false)
        .eq("status", "confirmed");

      unpaidDeposits?.forEach((b: any) => {
        pendingActions.push({
          id: `deposit-${b.id}`, type: "payment" as const,
          message: `${b.clients?.full_name || "Client"} deposit unpaid`,
          booking_id: b.id, daysOverdue: 0,
        });
      });

      setData({
        monthlyRevenueCents,
        bookingCount: bookings?.length || 0,
        upcomingBooking: upcoming?.[0] || null,
        upcomingClient: upcoming?.[0]?.clients || null,
        pendingActions: pendingActions.slice(0, 3),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  // package_price is stored in cents
  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  };

  const hourNow = new Date().getHours();
  const timeGreeting = hourNow < 12 ? "Good morning" : hourNow < 17 ? "Good afternoon" : "Good evening";
  const QUIPS = [
    "golden hour waits for no one",
    "the best light is five minutes away",
    "champagne fades, RAW files don't",
    "backup cards. Always.",
    "quiet moments make the loudest photos",
    "the timeline is a living thing",
  ];
  const quip = QUIPS[new Date().getDate() % QUIPS.length];

  const upcomingTitle = data?.upcomingBooking?.title
    || (data?.upcomingClient?.full_name
      ? (data.upcomingClient.partner_name ? `${data.upcomingClient.full_name} & ${data.upcomingClient.partner_name}` : data.upcomingClient.full_name)
      : null);

  // --- Priority queue: one card, one action ---
  const depositAction = data?.pendingActions?.find((a: any) => a.type === "payment");
  const contractAction = data?.pendingActions?.find((a: any) => a.type === "contract");

  const statLine = data
    ? `${formatCurrency(data.monthlyRevenueCents || 0)} this month · ${data.bookingCount || 0} ${data.bookingCount === 1 ? "booking" : "bookings"}`
    : "";

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>{timeGreeting}, {profile?.full_name?.split(" ")[0] || "photographer"} — {quip}</Text>

        {/* ONE priority card: deposit → contract → next booking → calm */}
        {depositAction ? (
          <TouchableOpacity
            style={styles.priorityCard}
            onPress={() => router.push(`/bookings/${depositAction.booking_id}`)}
          >
            <Text style={styles.priorityLabel}>💰 DEPOSIT DUE</Text>
            <Text style={styles.priorityTitle}>{depositAction.message}</Text>
            {upcomingTitle && (
              <Text style={styles.priorityDetail}>📍 {data?.upcomingBooking?.event_location || data?.upcomingBooking?.location || "Location TBA"}</Text>
            )}
            <Text style={styles.priorityCta}>Collect deposit →</Text>
          </TouchableOpacity>
        ) : contractAction ? (
          <TouchableOpacity
            style={styles.priorityCard}
            onPress={() => router.push(`/bookings/${contractAction.booking_id}`)}
          >
            <Text style={styles.priorityLabel}>✍️ CONTRACT UNSIGNED</Text>
            <Text style={styles.priorityTitle}>{contractAction.message}</Text>
            <Text style={styles.priorityCta}>Send reminder →</Text>
          </TouchableOpacity>
        ) : data?.upcomingBooking ? (
          <TouchableOpacity
            style={styles.priorityCard}
            onPress={() => router.push(`/bookings/${data.upcomingBooking.id}`)}
          >
            <Text style={styles.priorityLabel}>NEXT UP · {formatDate(data.upcomingBooking.event_date)}</Text>
            {upcomingTitle && <Text style={styles.priorityTitle}>{upcomingTitle}</Text>}
            <Text style={styles.priorityDetail}>📍 {data.upcomingBooking.event_location || data.upcomingBooking.location || "Location TBA"}</Text>
            <Text style={styles.priorityCta}>View booking →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.calmCard}>
            <Text style={styles.calmEmoji}>🌤</Text>
            <Text style={styles.calmTitle}>All caught up</Text>
            <Text style={styles.calmSub}>Go make something beautiful.</Text>
          </View>
        )}

        {/* Whisper line: stats, tap → Money */}
        <TouchableOpacity style={styles.statLine} onPress={() => router.push("/money")}>
          <Text style={styles.statText}>
            {statLine}
            {taxSetAside !== null && (
              <Text> · tax aside <Text style={{ color: "#8A857A", fontWeight: "700" }}>{formatCurrency(taxSetAside)}</Text></Text>
            )}
          </Text>
        </TouchableOpacity>

        {/* Four actions, one row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/bookings/new")}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>New Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/clients/new")}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>New Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/invoices")}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionLabel}>Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/more")}>
            <Text style={styles.actionIcon}>⋯</Text>
            <Text style={styles.actionLabel}>More</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/")}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, { color: "#C9A227", fontWeight: "600" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/clients")}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/bookings")}>
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navLabel}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/money")}>
          <Text style={styles.navIcon}>💰</Text>
          <Text style={styles.navLabel}>Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/more")}>
          <Text style={styles.navIcon}>⋮</Text>
          <Text style={styles.navLabel}>More</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/settings")}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 60 },
  center: { justifyContent: "center", alignItems: "center" },
  greeting: { fontSize: 22, fontWeight: "700", color: "#0A0A0A", paddingHorizontal: 24, marginBottom: 20 },
  priorityCard: { backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 20, padding: 22, marginBottom: 12 },
  priorityLabel: { color: "#C9A227", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  priorityTitle: { color: "#F8F6F0", fontSize: 19, fontWeight: "700", marginBottom: 4 },
  priorityDetail: { color: "#999", fontSize: 14, marginBottom: 4 },
  priorityCta: { color: "#C9A227", fontWeight: "600", fontSize: 14, marginTop: 8 },
  calmCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 20, padding: 28, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  calmEmoji: { fontSize: 28, marginBottom: 8 },
  calmTitle: { fontSize: 18, fontWeight: "700", color: "#0A0A0A" },
  calmSub: { fontSize: 14, color: "#999", marginTop: 4 },
  statLine: { marginHorizontal: 24, paddingVertical: 10, marginBottom: 12 },
  statText: { fontSize: 13, color: "#8A857A" },
  actionsRow: { flexDirection: "row", marginHorizontal: 24, gap: 10 },
  actionBtn: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionLabel: { fontSize: 12, color: "#0A0A0A", fontWeight: "600" },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5E5", position: "absolute", bottom: 0, left: 0, right: 0 },
  navItem: { alignItems: "center", flex: 1 },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 11, color: "#999" },
});
