import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";

type Client = {
  id: string;
  full_name: string;
  partner_name?: string;
};

export default function NewInvoiceScreen() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(true);
  const [photographerId, setPhotographerId] = useState<string | null>(null);

  // Resolve photographer and fetch clients on mount
  useEffect(() => {
    const init = async () => {
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
          setFetchingClients(false);
          return;
        }

        const { data: photographer } = await supabase
          .from("photographers")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!photographer) {
          setFetchingClients(false);
          return;
        }

        setPhotographerId(photographer.id);

        // Fetch clients
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, full_name, partner_name")
          .eq("photographer_id", photographer.id)
          .order("full_name", { ascending: true });

        setClients(clientsData || []);

        // Auto-generate invoice number: INV-YYYY-XXX
        const year = new Date().getFullYear();
        const { count } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("photographer_id", photographer.id)
          .gte("created_at", `${year}-01-01`)
          .lte("created_at", `${year}-12-31`);

        const nextNum = (count || 0) + 1;
        setInvoiceNumber(`INV-${year}-${String(nextNum).padStart(3, "0")}`);
      } catch (err) {
        console.error("[NewInvoice] init error:", err);
      } finally {
        setFetchingClients(false);
      }
    };

    init();
  }, []);

  const selectClient = (client: Client) => {
    setClientId(client.id);
    setClientName(
      client.partner_name
        ? `${client.full_name} & ${client.partner_name}`
        : client.full_name
    );
    setShowClientDropdown(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) setDueDate(selectedDate);
  };

  const handleSave = async () => {
    if (!clientId) {
      Alert.alert("Missing Client", "Please select a client for this invoice.");
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid invoice amount.");
      return;
    }
    if (!photographerId) {
      Alert.alert("Error", "Profile not found.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("invoices").insert({
        photographer_id: photographerId,
        client_id: clientId,
        invoice_number: invoiceNumber.trim() || null,
        amount: parseFloat(amount),
        status,
        due_date: dueDate.toISOString().split("T")[0],
        notes: notes.trim() || null,
      });

      if (error) {
        Alert.alert("Save Failed", error.message);
      } else {
        Alert.alert("Success", `Invoice ${invoiceNumber} created.`, [
          { text: "OK", onPress: () => router.replace("/invoices") },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingClients) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Invoice</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Client *</Text>
        <TouchableOpacity
          style={styles.clientPicker}
          onPress={() => setShowClientDropdown(true)}
        >
          <Text style={clientName ? styles.clientPickerText : styles.clientPickerPlaceholder}>
            {clientName || "Select a client"}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Invoice Number</Text>
        <TextInput
          style={styles.input}
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
          placeholder="INV-2026-001"
        />

        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="4500.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            {dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {["draft", "sent", "paid", "overdue"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBadge, status === s && styles.statusActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Payment terms, deposit details, etc."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.disabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? "Creating..." : "Create Invoice"}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Client Dropdown Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showClientDropdown}
        onRequestClose={() => setShowClientDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setShowClientDropdown(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No clients yet</Text>
                <TouchableOpacity
                  style={styles.addClientButton}
                  onPress={() => {
                    setShowClientDropdown(false);
                    router.push("/clients/new");
                  }}
                >
                  <Text style={styles.addClientText}>Add your first client</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.clientList}>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientItem,
                      clientId === client.id && styles.clientItemSelected,
                    ]}
                    onPress={() => selectClient(client)}
                  >
                    <Text style={styles.clientItemName}>
                      {client.full_name}
                      {client.partner_name ? ` & ${client.partner_name}` : ""}
                    </Text>
                    {clientId === client.id && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: { paddingVertical: 8 },
  backText: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#0A0A0A" },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    color: "#0A0A0A",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  clientPicker: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientPickerText: { fontSize: 15, color: "#0A0A0A", flex: 1 },
  clientPickerPlaceholder: { fontSize: 15, color: "#999", flex: 1 },
  chevron: { fontSize: 12, color: "#999" },
  dateButton: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  dateButtonText: { fontSize: 15, color: "#0A0A0A" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBadge: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginRight: 8,
    marginBottom: 8,
  },
  statusActive: { backgroundColor: "#C9A227", borderColor: "#C9A227" },
  statusText: { fontSize: 13, color: "#666", fontWeight: "600" },
  statusTextActive: { color: "#0A0A0A" },
  saveButton: {
    backgroundColor: "#C9A227",
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0A0A0A" },
  closeButton: { fontSize: 20, color: "#999", padding: 4 },
  clientList: { maxHeight: 400 },
  clientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F6F0",
  },
  clientItemSelected: { backgroundColor: "#C9A227" },
  clientItemName: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  checkmark: { fontSize: 16, fontWeight: "700", color: "#0A0A0A" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 16, color: "#999", marginBottom: 16 },
  addClientButton: { backgroundColor: "#C9A227", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  addClientText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
});
