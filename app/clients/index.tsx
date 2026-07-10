import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Client } from "../../types/database";

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Listen for auth state changes - fires when session is restored from storage
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Clients auth event:", event, "Session:", session ? "present" : "null");
      if (session) {
        setSessionReady(true);
      }
    });

    // Also try immediate check
    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSessionReady(true);
    }
  };

  // Fetch clients when session is ready
  useEffect(() => {
    if (sessionReady) {
      fetchClients();
    }
  }, [sessionReady]);

  const fetchClients = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setError("Not logged in. Please log in.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profile) {
        setError("Profile not found. Please complete your profile in Settings.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("photographer_id", profile.id)
        .order("created_at", { ascending: false });

      if (clientsError) {
        setError("Database error: " + clientsError.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setClients(data || []);
    } catch (err: any) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity style={styles.clientCard} onPress={() => router.push(`/clients/${item.id}`)}>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.full_name}</Text>
        <Text style={styles.clientDetail}>{item.email}</Text>
        {item.partner_name && <Text style={styles.clientDetail}>Partner: {item.partner_name}</Text>}
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  if (loading && !sessionReady) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/clients/new")}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchClients}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput style={styles.search} placeholder="Search clients..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />

      <FlatList 
        data={filteredClients} 
        renderItem={renderClient} 
        keyExtractor={(item) => item.id} 
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0", paddingTop: 60 },
  center: { justifyContent: "center", alignItems: "center", paddingTop: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#C9A227", justifyContent: "center", alignItems: "center" },
  addText: { color: "#0A0A0A", fontSize: 24, fontWeight: "700" },
  errorBox: { backgroundColor: "#FEE2E2", marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 12, alignItems: "center" },
  errorText: { color: "#DC2626", fontSize: 14, marginBottom: 8 },
  retryText: { color: "#C9A227", fontWeight: "700", fontSize: 14 },
  search: { backgroundColor: "#FFFFFF", marginHorizontal: 24, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 16, color: "#0A0A0A" },
  list: { paddingHorizontal: 24 },
  clientCard: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", marginBottom: 4 },
  clientDetail: { fontSize: 13, color: "#666" },
  arrow: { fontSize: 18, color: "#C9A227" },
});