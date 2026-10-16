import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, Switch } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addExpense, getLedgerSettings, gstFromTotal, EXPENSE_CATEGORIES } from "../../lib/ledger";
import { pickReceipt, uploadReceipt, PickedReceipt } from "../../lib/receipts";

export default function AddExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { snap } = useLocalSearchParams<{ snap?: string }>();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Other");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstIncluded, setGstIncluded] = useState(true);
  const [gstRegistered, setGstRegistered] = useState(false);
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [saving, setSaving] = useState(false);
  const snapHandled = useRef(false);

  useEffect(() => {
    getLedgerSettings().then((s: any) => {
      if (s) setGstRegistered(!!s.gst_registered);
    });
  }, []);

  // "Snap Receipt" quick action lands here with ?snap=1 → straight to camera
  useEffect(() => {
    if (snap === "1" && !snapHandled.current) {
      snapHandled.current = true;
      attach(true);
    }
  }, [snap]);

  const attach = async (fromCamera: boolean) => {
    setAttaching(true);
    try {
      const picked = await pickReceipt(fromCamera);
      if (picked) setReceipt(picked);
    } catch (e: any) {
      Alert.alert("Couldn't get photo", e.message || "Try again");
    } finally {
      setAttaching(false);
    }
  };

  const save = async () => {
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars <= 0) { Alert.alert("Enter an amount", "How much was the expense?"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert("Check the date", "Use YYYY-MM-DD."); return; }
    setSaving(true);
    try {
      let receiptPath: string | undefined;
      if (receipt) receiptPath = await uploadReceipt(receipt);
      const totalCents = Math.round(dollars * 100);
      await addExpense({
        amount: dollars,
        gst_amount: gstRegistered && gstIncluded ? gstFromTotal(totalCents) / 100 : 0,
        merchant: merchant || undefined,
        category, note: note || undefined, spent_at: date,
        source: receiptPath ? "receipt" : "manual",
        receipt_image_url: receiptPath,
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

      <Text style={styles.label}>RECEIPT (OPTIONAL)</Text>
      {receipt ? (
        <View style={styles.receiptPreview}>
          <Image source={{ uri: receipt.uri }} style={styles.receiptThumb} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0A0A0A" }}>Receipt attached</Text>
            <TouchableOpacity onPress={() => setReceipt(null)}>
              <Text style={{ color: "#B3261E", marginTop: 4, fontSize: 13 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.receiptRow}>
          <TouchableOpacity style={styles.receiptBtn} onPress={() => attach(true)} disabled={attaching}>
            <Text style={{ fontSize: 20 }}>📷</Text>
            <Text style={styles.receiptBtnText}>{attaching ? "Opening…" : "Take Photo"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.receiptBtn} onPress={() => attach(false)} disabled={attaching}>
            <Text style={{ fontSize: 20 }}>🖼</Text>
            <Text style={styles.receiptBtnText}>{attaching ? "Opening…" : "From Library"}</Text>
          </TouchableOpacity>
        </View>
      )}

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
  receiptPreview: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E5E5", gap: 12 },
  receiptThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#E5E5E5" },
  receiptRow: { flexDirection: "row", gap: 12, marginHorizontal: 24 },
  receiptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: "#E5E5E5", gap: 8 },
  receiptBtnText: { fontSize: 13, fontWeight: "600", color: "#0A0A0A" },
  goldButton: { backgroundColor: "#C9A227", borderRadius: 12, paddingVertical: 18, marginHorizontal: 24, marginTop: 32, alignItems: "center" },
  goldButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
