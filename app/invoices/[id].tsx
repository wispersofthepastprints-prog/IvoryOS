import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";

type Invoice = {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue";
  due_date: string | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
};

type Client = {
  id: string;
  full_name: string;
  partner_name?: string;
  email?: string;
};

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");

  const [photographerId, setPhotographerId] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;
        const { data } = await supabase
          .from("photographers")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        if (data) setPhotographerId(data.id);
      } catch (err) {
        console.error("[InvoiceDetail] resolve error:", err);
      }
    };
    resolve();
  }, []);

  const fetchInvoice = useCallback(async () => {
    if (!photographerId || !id) return;
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date, notes, client_id, created_at")
        .eq("id", id)
        .eq("photographer_id", photographerId)
        .single();

      if (error || !data) {
        Alert.alert("Not Found", "This invoice could not be found.");
        router.back();
        return;
      }

      setInvoice(data);
      setInvoiceNumber(data.invoice_number || "");
      setAmount(data.amount.toString());
      setStatus(data.status);
      setNotes(data.notes || "");
      if (data.due_date) setDueDate(new Date(data.due_date));

      if (data.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, full_name, partner_name, email")
          .eq("id", data.client_id)
          .single();
        setClient(clientData || null);
      }
    } catch (err) {
      console.error("[InvoiceDetail] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [photographerId, id, router]);

  useEffect(() => {
    if (photographerId) fetchInvoice();
  }, [photographerId, fetchInvoice]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDueDate(selectedDate);
  };

  const handleUpdate = async () => {
    if (!invoice || !photographerId) return;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_number: invoiceNumber.trim() || null,
          amount: parseFloat(amount),
          status,
          due_date: dueDate.toISOString().split("T")[0],
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)
        .eq("photographer_id", photographerId);

      if (error) {
        Alert.alert("Update Failed", error.message);
      } else {
        Alert.alert("Saved", "Invoice updated successfully.");
        setIsEditing(false);
        fetchInvoice();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Invoice?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!invoice || !photographerId) return;
          try {
            const { error } = await supabase
              .from("invoices")
              .delete()
              .eq("id", invoice.id)
              .eq("photographer_id", photographerId);
            if (error) {
              Alert.alert("Delete Failed", error.message);
            } else {
              router.replace("/invoices");
            }
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleSend = async () => {
    if (!client?.email) {
      Alert.alert("No Client Email", "This client does not have an email address on file.");
      return;
    }

    const subjectLine = `Invoice ${invoiceNumber || "#" + id.slice(0, 8)}`;
    const body = `Hi ${client.full_name},\n\nPlease find your invoice attached.\n\nAmount: $${amount}\nDue: ${dueDate.toLocaleDateString("en-AU")}\n\nThank you,`;
    const mailto = `mailto:${client.email}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailto);
      if (!canOpen) {
        Alert.alert(
          "No Email App",
          "No email app is installed on this device. Please install Gmail, Outlook, or your preferred email client.",
          [{ text: "OK" }]
        );
        return;
      }
      await Linking.openURL(mailto);
    } catch (err) {
      console.error("[InvoiceDetail] send error:", err);
      Alert.alert("Error", "Could not open email app.");
    }
  };

  const getStatusColor = (s: string): string => {
    switch (s) {
      case "paid": return "#22c55e";
      case "overdue": return "#ef4444";
      case "sent": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
        <Text style={styles.loadingText}>Loading invoice...</Text>
      </View>
    );
  }

  if (!invoice) return null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invoice</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.editButton}>
          <Text style={styles.editText}>{isEditing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(invoice.status) + "20" }]}>
        <Text style={[styles.statusBannerText, { color: getStatusColor(invoice.status) }]}>
          {invoice.status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.clientRow}>
          <Text style={styles.clientLabel}>To:</Text>
          <Text style={styles.clientValue}>
            {client ? `${client.full_name}${client.partner_name ? ` & ${client.partner_name}` : ""}` : "Unknown Client"}
          </Text>
        </View>
        {client?.email && (
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Email:</Text>
            <Text style={styles.clientValue}>{client.email}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {isEditing ? (
          <>
            <Text style={styles.label}>Invoice Number</Text>
            <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} />
            <Text style={styles.label}>Amount *</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>
                {dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={dueDate} mode="date" display="default" onChange={onDateChange} />}
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {["draft", "sent", "paid", "overdue"].map((s) => (
                <TouchableOpacity key={s} style={[styles.statusBadge, status === s && styles.statusActive]} onPress={() => setStatus(s)}>
                  <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} textAlignVertical="top" />
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleUpdate} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Changes"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice #</Text>
              <Text style={styles.detailValue}>{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, styles.amountValue]}>${invoice.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-AU") : "Not set"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{new Date(invoice.created_at).toLocaleDateString("en-AU")}</Text>
            </View>
            {invoice.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {!isEditing && (
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
            <Text style={styles.actionButtonText}>📧 Send Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.markPaidButton]} onPress={() => { setStatus("paid"); handleUpdate(); }}>
            <Text style={[styles.actionButtonText, styles.markPaidText]}>✓ Mark as Paid</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Text style={[styles.actionButtonText, styles.deleteText]}>🗑 Delete Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  backButton: { paddingVertical: 8 },
  backText: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#0A0A0A" },
  editButton: { paddingVertical: 8 },
  editText: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  statusBanner: { marginHorizontal: 20, marginBottom: 12, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  statusBannerText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  clientRow: { flexDirection: "row", marginBottom: 6 },
  clientLabel: { fontSize: 13, color: "#9ca3af", width: 60 },
  clientValue: { fontSize: 15, fontWeight: "600", color: "#0A0A0A", flex: 1 },
  divider: { height: 1, backgroundColor: "#E5E5E5", marginVertical: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: "#6b7280" },
  detailValue: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  amountValue: { fontSize: 22, color: "#C9A227" },
  notesBox: { backgroundColor: "#F8F6F0", borderRadius: 12, padding: 14, marginTop: 12 },
  notesLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 4 },
  notesText: { fontSize: 14, color: "#0A0A0A", lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  textArea: { height: 100, textAlignVertical: "top" },
  dateButton: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  dateButtonText: { fontSize: 15, color: "#0A0A0A" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBadge: { backgroundColor: "#F8F6F0", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#E5E5E5", marginRight: 8, marginBottom: 8 },
  statusActive: { backgroundColor: "#C9A227", borderColor: "#C9A227" },
  statusText: { fontSize: 13, color: "#666", fontWeight: "600" },
  statusTextActive: { color: "#0A0A0A" },
  saveButton: { backgroundColor: "#C9A227", marginTop: 16, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  actionsCard: { backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5", gap: 10 },
  actionButton: { backgroundColor: "#F8F6F0", paddingVertical: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  actionButtonText: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  markPaidButton: { backgroundColor: "#22c55e20", borderColor: "#22c55e" },
  markPaidText: { color: "#22c55e" },
  deleteButton: { backgroundColor: "#ef444420", borderColor: "#ef4444" },
  deleteText: { color: "#ef4444" },
});
