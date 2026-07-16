import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type Invoice = {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  due_date: string | null;
  client_id: string | null;
  created_at: string;
};

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photographerId, setPhotographerId] = useState<string | null>(null);

  const resolvePhotographerId = async (): Promise<string | null> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("[Invoices] photographer lookup error:", error.message);
        return null;
      }
      return data?.id ?? null;
    } catch (err) {
      console.error("[Invoices] resolvePhotographerId exception:", err);
      return null;
    }
  };

  const fetchInvoices = useCallback(async () => {
    if (!photographerId) return;

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, client_id, created_at")
        .eq("photographer_id", photographerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Invoices] fetch error:", error.message);
        Alert.alert("Error", "Failed to load invoices. Please try again.");
        return;
      }

      setInvoices(data || []);
    } catch (err) {
      console.error("[Invoices] fetch exception:", err);
      Alert.alert("Error", "Something went wrong loading invoices.");
    }
  }, [photographerId]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const pid = await resolvePhotographerId();
      if (!mounted) return;
      setPhotographerId(pid);
      setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (photographerId) fetchInvoices();
  }, [photographerId, fetchInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "paid": return "#22c55e";
      case "overdue": return "#ef4444";
      case "sent": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

  const renderItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/invoices/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.invoiceNumber}>
          {item.invoice_number || `Invoice #${item.id.slice(0, 8).toUpperCase()}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
      {item.due_date && (
        <Text style={styles.meta}>Due: {new Date(item.due_date).toLocaleDateString("en-AU")}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  if (!photographerId) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile not found. Please complete your profile in Settings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push("/invoices/new")}>
          <Text style={styles.newButtonText}>+ New Invoice</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySub}>Tap "+ New Invoice" to create your first one</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  errorText: { color: "#ef4444", textAlign: "center", fontSize: 14, lineHeight: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  newButton: { backgroundColor: "#C9A227", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  newButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  invoiceNumber: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  amount: { fontSize: 22, fontWeight: "700", color: "#0A0A0A", marginBottom: 4 },
  meta: { fontSize: 13, color: "#6b7280" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#9ca3af", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#9ca3af" },
});
