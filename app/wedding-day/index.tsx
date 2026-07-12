import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../../lib/supabase";

export default function WeddingDayScreen() {
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayBookings();
  }, []);

  const fetchTodayBookings = async () => {
    let session = null;
    let attempts = 0;
    while (!session && attempts < 3) {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
      if (!session) await new Promise(r => setTimeout(r, 500));
      attempts++;
    }
    const user = session?.user;
    if (!user) return;
    if (!user.email_confirmed_at) return;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("bookings")
      .select("*, clients(full_name, phone, notes)")
      .eq("auth_id", user.id)
      .eq("event_date", today);

    setTodayBookings(data || []);
    setLoading(false);
  };

  const shotList = [
    { id: 1, label: "Getting ready", done: false },
    { id: 2, label: "Dress details", done: false },
    { id: 3, label: "First look", done: false },
    { id: 4, label: "Ceremony wide", done: false },
    { id: 5, label: "Ring exchange", done: false },
    { id: 6, label: "Family formals", done: false },
    { id: 7, label: "Bridal party", done: false },
    { id: 8, label: "Couple portraits", done: false },
    { id: 9, label: "Reception details", done: false },
    { id: 10, label: "First dance", done: false },
    { id: 11, label: "Cake cutting", done: false },
    { id: 12, label: "Sparkler exit", done: false },
  ];

  const [shots, setShots] = useState(shotList);

  const toggleShot = (id: number) => {
    setShots(shots.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const completedCount = shots.filter(s => s.done).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading wedding day...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wedding Day</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</Text>
      </View>

      {todayBookings.map((booking) => (
        <View key={booking.id} style={styles.card}>
          <Text style={styles.coupleName}>{booking.clients?.full_name || "Unknown"}</Text>
          <Text style={styles.venue}>📍 {booking.location || "No venue set"}</Text>
          <Text style={styles.package}>💰 ${booking.package_price || 0} — {booking.package_description || "No package description"}</Text>
          {booking.clients?.phone && (
            <Text style={styles.phone}>📞 {booking.clients.phone}</Text>
          )}
          {booking.clients?.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>⚠️ Notes</Text>
              <Text style={styles.notesText}>{booking.clients.notes}</Text>
            </View>
          )}
        </View>
      ))}

      {todayBookings.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No weddings today</Text>
          <Text style={styles.emptySubtext}>Relax or edit your upcoming bookings</Text>
        </View>
      )}

      <View style={styles.shotListCard}>
        <View style={styles.shotHeader}>
          <Text style={styles.shotTitle}>Shot List</Text>
          <Text style={styles.shotProgress}>{completedCount}/{shots.length}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedCount / shots.length) * 100}%` }]} />
        </View>

        {shots.map((shot) => (
          <TouchableOpacity key={shot.id} style={styles.shotItem} onPress={() => toggleShot(shot.id)}>
            <Text style={[styles.shotCheckbox, shot.done && styles.shotChecked]}>
              {shot.done ? "✅" : "⬜"}
            </Text>
            <Text style={[styles.shotLabel, shot.done && styles.shotLabelDone]}>
              {shot.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  date: { fontSize: 16, color: "#999", marginTop: 4 },
  card: {
    backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 20,
    padding: 24, marginBottom: 16,
  },
  coupleName: { color: "#F8F6F0", fontSize: 22, fontWeight: "700" },
  venue: { color: "#C9A227", fontSize: 15, marginTop: 8 },
  package: { color: "#999", fontSize: 14, marginTop: 4 },
  phone: { color: "#999", fontSize: 14, marginTop: 4 },
  notesBox: { backgroundColor: "#1A1A1A", borderRadius: 12, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: "#C9A227" },
  notesLabel: { color: "#C9A227", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  notesText: { color: "#F8F6F0", fontSize: 14 },
  emptyCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 24, marginBottom: 16, alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#999" },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 4 },
  shotListCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: "#E5E5E5" },
  shotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  shotTitle: { fontSize: 18, fontWeight: "700", color: "#0A0A0A" },
  shotProgress: { fontSize: 14, color: "#999", fontWeight: "600" },
  progressBar: { height: 6, backgroundColor: "#E5E5E5", borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: "#C9A227", borderRadius: 3 },
  shotItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8F6F0" },
  shotCheckbox: { fontSize: 20, marginRight: 12 },
  shotChecked: { opacity: 0.7 },
  shotLabel: { fontSize: 15, color: "#0A0A0A", fontWeight: "500" },
  shotLabelDone: { textDecorationLine: "line-through", color: "#999" },
});
