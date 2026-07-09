import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const fetchBookings = async () => {
    setError(null);
    setDebugInfo("Starting fetch...");
    
    try {
      // Step 1: Get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      setDebugInfo(prev => prev + "\nSession: " + (session ? "OK" : "NULL"));
      
      if (sessionError) {
        setDebugInfo(prev => prev + "\nSession error: " + sessionError.message);
      }

      const user = session?.user;
      if (!user) {
        setError("Not logged in. Please go to Settings and log out, then log back in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDebugInfo(prev => prev + "\nUser ID: " + user.id.substring(0, 8) + "...");

      // Step 2: Check email verification
      if (!user.email_confirmed_at) {
        setError("Email not verified. Please check your email for the verification link.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDebugInfo(prev => prev + "\nEmail verified: OK");

      // Step 3: Get photographer profile
      const { data: profileData, error: profileError } = await supabase
        .from("photographers")
        .select("id, full_name")
        .eq("auth_id", user.id)
        .single();

      setDebugInfo(prev => prev + "\nProfile: " + (profileData ? "FOUND" : "NOT FOUND"));
      
      if (profileError) {
        setDebugInfo(prev => prev + "\nProfile error: " + profileError.message);
        setError("Profile error: " + profileError.message + ". Please complete your profile in Settings.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!profileData) {
        setError("No photographer profile found. Please create your profile in Settings.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const photographerId = profileData.id;
      setDebugInfo(prev => prev + "\nPhotographer ID: " + photographerId.substring(0, 8) + "...");

      // Step 4: Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .eq("photographer_id", photographerId)
        .order("event_date", { ascending: true });

      setDebugInfo(prev => prev + "\nBookings query: " + (bookingsError ? "ERROR: " + bookingsError.message : "OK"));

      if (bookingsError) {
        setError("Database error: " + bookingsError.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setBookings(bookingsData || []);
      setDebugInfo(prev => prev + "\nBookings count: " + (bookingsData?.length || 0));
      
    } catch (err: any) {
      setDebugInfo(prev => prev + "\nException: " + err.message);
      setError("Unexpected error: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading bookings...</Text>
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
          <TouchableOpacity onPress={fetchBookings}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug info - remove after fixing */}
      {debugInfo ? (
        <View style={styles.debugBox}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      ) : null}

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
  debugBox: { backgroundColor: "#E5E5E5", marginHorizontal: 24, marginBottom: 16, padding: 12, borderRadius: 8 },
  debugText: { color: "#666", fontSize: 11, fontFamily: "monospace" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, color: "#999", marginBottom: 20 },
  createButton: { backgroundColor: "#C9A227", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  createButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  titleText: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", marginBottom: 8 },
  detail: { fontSize: 14, color: "#666", marginBottom: 4 },
  price: { fontSize: 16, fontWeight: "700", color: "#C9A227", marginTop: 4 },
});