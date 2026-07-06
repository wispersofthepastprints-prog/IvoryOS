import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import StatusBadge from "../../components/StatusBadge";

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchBookings = async () => {
    setErrorMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
	const user = session?.user;
	if (!user) {
  	setErrorMsg("Please log in to continue.");
 	 return;
	}
	if (!user.email_confirmed_at) {
  	setErrorMsg("Please verify your email before viewing bookings. Check your inbox for the confirmation link.");
 	 return;
	}

      const { data: profile, error: profileError } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profileError) {
        setErrorMsg("Profile error: " + profileError.message);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("photographer_id", profile?.id)
        .order("event_date", { ascending: true });

      if (error) {
        setErrorMsg("Query error: " + error.message);
        return;
      }

      setBookings(data || []);
    } catch (err: any) {
      setErrorMsg("Catch error: " + err.message);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Delete Booking", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("bookings").delete().eq("id", id);
          if (!error) fetchBookings();
        },
      },
    ]);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const filteredBookings = bookings.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return "$0";
    return `$${(cents / 100).toLocaleString()}`;
  };

  const renderBooking = ({ item }: { item: any }) => (
    <View style={styles.bookingCard}>
      <TouchableOpacity style={styles.bookingInfo} onPress={() => router.push(`/bookings/${item.id}`)}>
        <Text style={styles.bookingTitle}>{item.title}</Text>
        <Text style={styles.eventDate}>📅 {formatDate(item.event_date)}</Text>
        <Text style={styles.price}>{formatCurrency(item.package_price)}</Text>
      </TouchableOpacity>
      <View style={styles.rightSide}>
        <StatusBadge status={item.status} />
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id, item.title)}>
          <Text style={styles.deleteText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/bookings/new")}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search bookings..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={fetchBookings}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filteredBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/bookings/new")}>
              <Text style={styles.emptyButtonText}>Create your first booking</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0", paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#C9A227", justifyContent: "center", alignItems: "center" },
  addText: { color: "#0A0A0A", fontSize: 24, fontWeight: "700" },
  search: { backgroundColor: "#FFFFFF", marginHorizontal: 24, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 16, color: "#0A0A0A" },
  errorBox: { backgroundColor: "#FEE2E2", marginHorizontal: 24, padding: 16, borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#DC2626", fontSize: 14 },
  retryText: { color: "#C9A227", fontSize: 14, fontWeight: "600", marginTop: 8, textAlign: "center" },
  list: { paddingHorizontal: 24 },
  bookingCard: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  bookingInfo: { flex: 1 },
  bookingTitle: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", marginBottom: 4 },
  eventDate: { fontSize: 13, color: "#999", marginBottom: 2 },
  price: { fontSize: 14, fontWeight: "700", color: "#0A0A0A", marginTop: 2 },
  rightSide: { alignItems: "flex-end" },
  deleteButton: { marginTop: 8, padding: 4 },
  deleteText: { fontSize: 18 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: "#999", marginBottom: 16 },
  emptyButton: { backgroundColor: "#C9A227", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  emptyButtonText: { color: "#0A0A0A", fontSize: 14, fontWeight: "700" },
});