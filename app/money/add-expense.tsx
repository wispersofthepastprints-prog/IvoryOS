import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addExpense, getLedgerSettings, gstFromTotal, EXPENSE_CATEGORIES } from "../../lib/ledger";

export default function AddExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstIncluded, setGstIncluded] = useState(true);
  const [gstRegistered, setGstRegistered] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLedgerSettings().then((s: any) => {
      if (s) setGstRegistered(!!s.gst_registered);
    });
  }, []);

  const save = async () => {
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars <= 0) { Alert.alert("Enter an amount", "How much was the expense?"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert("Check the date", "Use YYYY-MM-DD."); return; }
    setSaving(true);
    try {
      const totalCents = Math.round(dollars * 100);
      await addExpense({
        amount: dollars,
        gst_amount: gstRegistered && gstIncluded ? gstFromTotal(totalCents) / 100 : 0,
        merchant: merchant || undefined,
        category, note: note || undefined, spent_at: date,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Add Expense</Text>
        <View style={{ width: 20 }} />
      </View>

      <Text style={styles.label}>AMOUNT</Text>
      <View style={styles.amountRow}>
        <Text style={{ fontSize: 28, fontWeight: "800", marginRight: 8 }}>$</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#999"
        />
      </View>

      {gstRegistered && (
        <View style={styles.gstRow}>
          <Text style={{ fontSize: 14, color: "#0A0A0A", flex: 1 }}>GST included in total (1/11 auto-calculated)</Text>
          <Switch value={gstIncluded} onValueChange={setGstIncluded} trackColor={{ true: "#C9A227" }} />
        </View>
      )}

      <Text style={styles.label}>MERCHANT</Text>
      <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="Camera House" placeholderTextColor="#999" />

      <Text style={styles.label}>DATE</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#999" autoCapitalize="none" />

      <Text style={styles.label}>CATEGORY</Text>
      <View style={styles.chips}>
        {EXPENSE_CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>NOTE (OPTIONAL)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. New lens for Smith wedding" placeholderTextColor="#999" />

      <TouchableOpacity style={styles.goldButton} onPress={save} disabled={saving}>
        <Text style={styles.goldButtonText}>{saving ? "Saving..." : "Save Expense"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#0A0A0A" },
  label: { marginHorizontal: 24, marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1 },
  amountRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 24 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800", color: "#0A0A0A" },
  gstRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 24, marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E5E5" },
  input: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: "#E5E5E5" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 24 },
  chip: { backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E5E5E5" },
  chipActive: { backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" },
  chipText: { fontSize: 13, color: "#0A0A0A" },
  chipTextActive: { color: "#C9A227", fontWeight: "700" },
  goldButton: { backgroundColor: "#C9A227", borderRadius: 12, paddingVertical: 18, marginHorizontal: 24, marginTop: 32, alignItems: "center" },
  goldButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
