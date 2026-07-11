import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  status: string;
  created_at: string;
  due_date?: string;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvoices = async () => {
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        if (!session) await new Promise((r) => setTimeout(r, 500));
        attempts++;
      }
      const user = session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("auth_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "#059669";
      case "sent": return "#2563EB";
      case "draft": return "#999";
      default: return "#999";
    }
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert("Coming Soon", "Create invoice feature will be available in the next update.")}>
          <Text style={styles.addButtonText}>+ New Invoice</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : invoices.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No invoices yet</Text>
          <Text style={styles.emptySubtext}>Invoices will appear here once created</Text>
        </View>
      ) : (
        invoices.map((invoice) => (
          <View key={invoice.id} style={styles.invoiceCard}>
            <View style={styles.row}>
              <Text style={styles.clientName}>{invoice.client_name || "Unknown Client"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + "20" }]}>
                <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                  {invoice.status?.toUpperCase() || "DRAFT"}
                </Text>
              </View>
            </View>
            <Text style={styles.amount}>${invoice.amount?.toLocaleString() || "0"}</Text>
            {invoice.due_date && <Text style={styles.dueDate}>Due: {new Date(invoice.due_date).toLocaleDateString("en-AU")}</Text>}
          </View>
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
  emptySubtext: { fontSize: 14, color: "#666", textAlign: "center" },
  invoiceCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  clientName: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: "600" },
  amount: { fontSize: 20, fontWeight: "700", color: "#C9A227" },
  dueDate: { fontSize: 13, color: "#999", marginTop: 4 },
});