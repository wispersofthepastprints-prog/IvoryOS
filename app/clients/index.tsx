import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError("");
    try {
      // Retry session check up to 3 times
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        attempts++;
      }

      const user = session?.user;
      if (!user) {
        setError("Session expired. Please log out and log back in.");
        setLoading(false);
        return;
      }

      if (!user.email_confirmed_at) {
        setError("Please verify your email before viewing clients. Check your inbox.");
        setLoading(false);
        return;
      }

      await fetchClients(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async (user: any) => {
    // FIX: Query photographers table (not profiles)
    const { data: photographer, error: photographerError } = await supabase
      .from("photographers")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (photographerError || !photographer) {
      // Auto-create photographer record if missing
      const { data: newPhotographer, error: createError } = await supabase
        .from("photographers")
        .insert({
          auth_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || "",
        })
        .select("id")
        .single();

      if (createError || !newPhotographer) {
        setError("Profile not found. Please complete your profile in Settings.");
        return;
      }

      // Fetch clients with newly created photographer
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("photographer_id", newPhotographer.id)
        .order("created_at", { ascending: false });

      if (clientsError) {
        setError(clientsError.message);
      } else {
        setClients(clientsData || []);
      }
      return;
    }

    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("photographer_id", photographer.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      setError(clientsError.message);
    } else {
      setClients(clientsData || []);
    }
  };

  const filteredClients = clients.filter((c) =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/clients/new")}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TextInput
        style={styles.searchInput}
        placeholder="Search clients..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.clientCard}
            onPress={() => router.push(`/clients/${item.id}`)}
          >
            <Text style={styles.clientName}>{item.full_name}</Text>
            {item.partner_name && (
              <Text style={styles.clientPartner}>& {item.partner_name}</Text>
            )}
            <Text style={styles.clientDate}>
              {item.wedding_date
                ? new Date(item.wedding_date).toLocaleDateString("en-AU")
                : "No date set"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No clients yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/clients/new")}
            >
              <Text style={styles.emptyButtonText}>Add your first client</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: {
    backgroundColor: "#C9A227",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { fontSize: 24, fontWeight: "700", color: "#0A0A0A" },
  errorBox: {
    backgroundColor: "#FFE5E5",
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  errorText: { color: "#CC0000", fontSize: 14 },
  retryText: { color: "#C9A227", fontSize: 14, marginTop: 8, fontWeight: "600" },
  searchInput: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  clientCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  clientName: { fontSize: 17, fontWeight: "600", color: "#0A0A0A" },
  clientPartner: { fontSize: 14, color: "#666", marginTop: 2 },
  clientDate: { fontSize: 13, color: "#999", marginTop: 8 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: "#999", marginBottom: 16 },
  emptyButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: { color: "#0A0A0A", fontWeight: "700" },
  loading: { textAlign: "center", marginTop: 60, color: "#999" },
});
