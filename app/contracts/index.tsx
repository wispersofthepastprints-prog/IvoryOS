import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from("bookings")
      .select("*, clients(full_name)")
      .eq("auth_id", user.id)
      .order("created_at", { ascending: false });

    setContracts(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed": return "#059669";
      case "sent": return "#2563EB";
      case "draft": return "#999";
      default: return "#999";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "signed": return "✅ Signed";
      case "sent": return "📧 Sent";
      case "draft": return "📝 Draft";
      default: return "📝 Draft";
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading contracts...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contracts</Text>
        <Text style={styles.subtitle}>{contracts.length} total</Text>
      </View>

      {contracts.map((contract) => (
        <TouchableOpacity key={contract.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.clientName}>{contract.clients?.full_name || "Unknown"}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.contract_status || "draft") + "20" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(contract.contract_status || "draft") }]}>
                {getStatusLabel(contract.contract_status || "draft")}
              </Text>
            </View>
          </View>
          <Text style={styles.details}>
            {contract.event_date ? new Date(contract.event_date).toLocaleDateString("en-AU") : "No date"} • {contract.location || "No location"}
          </Text>
          <Text style={styles.price}>${contract.package_price || 0}</Text>
        </TouchableOpacity>
      ))}

      {contracts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contracts yet</Text>
          <Text style={styles.emptySubtext}>Create a booking and send a contract to see it here</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  subtitle: { fontSize: 14, color: "#999", marginTop: 4 },
  card: {
    backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16,
    padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  clientName: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  details: { fontSize: 14, color: "#666", marginBottom: 4 },
  price: { fontSize: 16, fontWeight: "700", color: "#C9A227" },
  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#999", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center" },
});
