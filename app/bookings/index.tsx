import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWithRetry();
  }, []);

  const loadWithRetry = async (retries = 5) => {
    setLoading(true);
    setError(null);

    for (let i = 0; i < retries; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchBookings(session.user);
        return;
      }
      // Wait 500ms before next retry
      await new Promise((r) => setTimeout(r, 500));
    }

    // All retries failed
    setError("Session not found. Please log out and log back in.");
    setLoading(false);
  };

  const fetchBookings = async (user: any) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profileData) {
        setError("Profile not found. Please complete your profile in Settings.");
        setLoading(false);
        return;
      }

      const photographerId = profileData.id;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .eq("photographer_id", photographerId)
        .order("event_date", { ascending: true });

      if (bookingsError) {
        setError("Database error: " + bookingsError.message);
        setLoading(false);
        return;
      }

      setBookings(bookingsData || []);
    } catch (err: any) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWithRetry();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/bookings/new")}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadWithRetry()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {bookings.length === 0 && !error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No bookings yet</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push("/bookings/new")}>
            <Text style={styles.createButtonText}>Create your first booking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        bookings.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={styles.card}
            onPress={() => router.push(`/bookings/${booking.id}`)}
          >
            <Text style={styles.titleText}>{booking.title || "Untitled Booking"}</Text>
            <Text style={styles.detail}>
              📅 {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-AU") : "No date"}
            </Text>
            <Text style={styles.detail}>📍 {booking.event_location || "No location"}</Text>
            <Text style={styles.price}>${booking.package_price || 0}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center", paddingTop: 100 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { backgroundColor: "#C9A227", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  addButtonText: { fontSize: 24, fontWeight: "700", color: "#0A0A0A" },
  errorBox: { backgroundColor: "#FEE2E2", marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 12, alignItems: "center" },
  errorText: { color: "#DC2626", fontSize: 14, marginBottom: 8 },
  retryText: { color: "#C9A227", fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, color: "#999", marginBottom: 20 },
  createButton: { backgroundColor: "#C9A227", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  createButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  titleText: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", marginBottom: 8 },
  detail: { fontSize: 14, color: "#666", marginBottom: 4 },
  price: { fontSize: 16, fontWeight: "700", color: "#C9A227", marginTop: 4 },
});