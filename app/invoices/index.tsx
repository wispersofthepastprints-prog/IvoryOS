import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase";

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data } = await supabase
      .from("bookings")
      .select("*, clients(full_name)")
      .eq("auth_id", user.id)
      .order("created_at", { ascending: false });

    setInvoices(data || []);
    setLoading(false);
  };

  const getPaymentStatus = (booking: any) => {
    if (booking.deposit_paid && booking.balance_paid) return { label: "✅ Fully Paid", color: "#059669" };
    if (booking.deposit_paid) return { label: "💰 Deposit Only", color: "#2563EB" };
    return { label: "⏳ Unpaid", color: "#DC2626" };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>{invoices.length} total</Text>
      </View>

      {invoices.map((invoice) => {
        const status = getPaymentStatus(invoice);
        return (
          <TouchableOpacity key={invoice.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.clientName}>{invoice.clients?.full_name || "Unknown"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.details}>
              {invoice.event_date ? new Date(invoice.event_date).toLocaleDateString("en-AU") : "No date"}
            </Text>
            <Text style={styles.price}>${invoice.package_price || 0}</Text>
            <Text style={styles.balance}>
              Balance: ${invoice.balance_paid ? 0 : (invoice.package_price || 0) * 0.5}
            </Text>
          </TouchableOpacity>
        );
      })}

      {invoices.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No invoices yet</Text>
          <Text style={styles.emptySubtext}>Create a booking and send an invoice to see it here</Text>
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
  balance: { fontSize: 13, color: "#999", marginTop: 4 },
  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#999", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center" },
});
