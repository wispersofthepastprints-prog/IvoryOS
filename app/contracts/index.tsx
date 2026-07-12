import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Contract {
  id: string;
  title: string;
  content: string;
  created_at: string;
  client_name?: string;
}

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContracts = async () => {
    try {
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

      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("auth_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContracts();
  };

  const deleteContract = async (id: string) => {
    Alert.alert(
      "Delete Contract",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("contracts").delete().eq("id", id);
              if (error) throw error;
              setContracts(contracts.filter((c) => c.id !== id));
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Contracts</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/contracts/new")}>
          <Text style={styles.addButtonText}>+ New Contract</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : contracts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No contracts yet</Text>
          <Text style={styles.emptySubtext}>Create contract templates for your clients</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/contracts/new")}>
            <Text style={styles.emptyButtonText}>Create First Contract</Text>
          </TouchableOpacity>
        </View>
      ) : (
        contracts.map((contract) => (
          <TouchableOpacity
            key={contract.id}
            style={styles.contractCard}
            onPress={() => router.push(`/contracts/${contract.id}`)}
          >
            <View style={styles.contractHeader}>
              <Text style={styles.contractTitle}>{contract.title}</Text>
              <TouchableOpacity onPress={() => deleteContract(contract.id)}>
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.contractPreview} numberOfLines={2}>
              {contract.content.substring(0, 120)}...
            </Text>
            <Text style={styles.contractDate}>
              Created {new Date(contract.created_at).toLocaleDateString("en-AU")}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { backgroundColor: "#C9A227", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  loading: { textAlign: "center", marginTop: 40, color: "#666" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#0A0A0A", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20 },
  emptyButton: { backgroundColor: "#C9A227", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  emptyButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
  contractCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  contractHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  contractTitle: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  deleteText: { fontSize: 18 },
  contractPreview: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 8 },
  contractDate: { fontSize: 12, color: "#999" },
});
