import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import QuickActionButton from "../components/QuickActionButton";
import { DashboardData } from "../types/database";

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: profileData } = await supabase
        .from("photographers")
        .select("id, full_name")
        .eq("auth_id", user.id)
        .single();
      
      setProfile(profileData);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("photographer_id", profile?.id)
        .gte("created_at", startOfMonth.toISOString())
        .order("event_date", { ascending: true });

      const monthlyRevenue = bookings?.reduce((sum, b) => sum + (b.package_price || 0), 0) || 0;

      const today = new Date().toISOString();
      const { data: upcoming } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .eq("photographer_id", profile?.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(1);

      const pendingActions: any[] = [];

      const { data: unsignedContracts } = await supabase
        .from("bookings")
        .select("*, clients(full_name)")
        .eq("photographer_id", profile?.id)
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
        .eq("photographer_id", profile?.id)
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
        monthlyRevenue, bookingCount: bookings?.length || 0,
        upcomingBooking: upcoming?.[0] || null,
        upcomingClient: upcoming?.[0]?.clients || null,
        pendingActions: pendingActions.slice(0, 3),
      });
    } catch (error) { console.error("Dashboard error:", error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString()}`;
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.full_name?.split(" ")[0] || "Photographer"} 👋</Text>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Text style={styles.settings}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>THIS MONTH</Text>
        <Text style={styles.revenueAmount}>{formatCurrency(data?.monthlyRevenue || 0)}</Text>
        <Text style={styles.revenueSubtext}>{data?.bookingCount || 0} bookings</Text>
      </View>

      {data?.upcomingBooking && (
        <TouchableOpacity 
          style={styles.upcomingCard}
          onPress={() => router.push(`/bookings/${data.upcomingBooking.id}`)}
        >
          <Text style={styles.sectionLabel}>UPCOMING</Text>
          <Text style={styles.upcomingTitle}>{data.upcomingBooking.title}</Text>
          <Text style={styles.upcomingDetail}>📅 {formatDate(data.upcomingBooking.event_date)}</Text>
          <Text style={styles.upcomingDetail}>📍 {data.upcomingBooking.event_location || "Location TBA"}</Text>
          <Text style={styles.shotListText}>View Booking →</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={styles.actionsRow}>
        <QuickActionButton icon="📝" label="New Job" onPress={() => router.push("/bookings/new")} />
        <QuickActionButton icon="👤" label="New Client" onPress={() => router.push("/clients/new")} />
	<QuickActionButton icon="📝" label="New Contract" onPress={() => router.push("/contracts/new")} />
	<QuickActionButton icon="📧" label="Send Email" onPress={() => router.push("/emails")} />
        <QuickActionButton icon="💰" label="Send Invoice" onPress={() => router.push("/invoices")} />
      </View>

      {data?.pendingActions && data.pendingActions.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>PENDING</Text>
          {data.pendingActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.pendingItem}>
              <Text style={styles.pendingIcon}>⚠️</Text>
              <View style={styles.pendingContent}>
                <Text style={styles.pendingText}>{action.message}</Text>
                {action.daysOverdue > 0 && <Text style={styles.pendingOverdue}>{action.daysOverdue} days overdue</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/settings")}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/clients")}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/bookings")}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/invoices")}>
          <Text style={styles.navIcon}>💰</Text>
          <Text style={styles.navLabel}>Invoices</Text>
        </TouchableOpacity>
	<TouchableOpacity style={styles.navItem} onPress={() => router.push("/calendar")}>
	  <Text style={styles.navIcon}>📅</Text>
	  <Text style={styles.navLabel}>Calendar</Text>
	</TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  greeting: { fontSize: 24, fontWeight: "700", color: "#0A0A0A" },
  settings: { fontSize: 20 },
  revenueCard: { backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 20, padding: 24, marginBottom: 20 },
  revenueLabel: { color: "#C9A227", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  revenueAmount: { color: "#F8F6F0", fontSize: 36, fontWeight: "800", marginBottom: 4 },
  revenueSubtext: { color: "#999", fontSize: 14 },
  upcomingCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginHorizontal: 24, marginBottom: 12, marginTop: 8 },
  upcomingTitle: { fontSize: 18, fontWeight: "700", color: "#0A0A0A", marginBottom: 8 },
  upcomingDetail: { fontSize: 14, color: "#666", marginBottom: 4 },
  shotListText: { color: "#C9A227", fontWeight: "600", fontSize: 14, marginTop: 8 },
  actionsRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 24, marginBottom: 24 },
  pendingItem: { flexDirection: "row", backgroundColor: "#FFFFFF", marginHorizontal: 24, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#FEE2E2" },
  pendingIcon: { fontSize: 20, marginRight: 12 },
  pendingContent: { flex: 1 },
  pendingText: { fontSize: 14, color: "#0A0A0A", fontWeight: "500" },
  pendingOverdue: { fontSize: 12, color: "#DC2626", marginTop: 2 },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 16, paddingBottom: 32, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E5E5", marginTop: 20 },
  navItem: { alignItems: "center" },
  navIcon: { fontSize: 20, marginBottom: 4 },
  navLabel: { fontSize: 11, color: "#999" },
  navLabelActive: { fontSize: 11, color: "#C9A227", fontWeight: "600" },
});