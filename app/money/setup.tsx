import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveLedgerSettings } from "../../lib/ledger";

export default function MoneySetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [gstRegistered, setGstRegistered] = useState<boolean | null>(null);
  const [pct, setPct] = useState("30");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (gstRegistered === null) { Alert.alert("One more thing", "Are you registered for GST?"); return; }
    const pctNum = parseFloat(pct);
    if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) { Alert.alert("Check the percentage", "Set-aside must be between 0 and 100."); return; }
    setSaving(true);
    try {
      await saveLedgerSettings({ country: "AU", gst_registered: gstRegistered, set_aside_pct: pctNum });
      router.replace("/money");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  const Option = ({ label, value }: { label: string; value: boolean }) => (
    <TouchableOpacity
      style={[styles.option, gstRegistered === value && styles.optionActive]}
      onPress={() => setGstRegistered(value)}
    >
      <Text style={[styles.optionText, gstRegistered === value && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Money &amp; Tax Setup</Text>
        <View style={{ width: 20 }} />
      </View>

      <Text style={styles.step}>1 of 3</Text>
      <Text style={styles.question}>Where is your business based?</Text>
      <View style={styles.option}><Text style={styles.optionText}>🇦🇺  Australia</Text></View>

      <Text style={styles.step}>2 of 3</Text>
      <Text style={styles.question}>Are you registered for GST?</Text>
      <View style={styles.row}>
        <Option label="Yes" value={true} />
        <Option label="No" value={false} />
      </View>

      <Text style={styles.step}>3 of 3</Text>
      <Text style={styles.question}>What percentage should be set aside for tax?</Text>
      <View style={styles.pctRow}>
        <TextInput
          style={styles.pctInput}
          value={pct}
          onChangeText={setPct}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <Text style={{ fontSize: 18, fontWeight: "600" }}>%</Text>
      </View>
      <Text style={styles.hint}>30% of net income is standard advisor guidance. You can change this anytime in Settings.</Text>

      <TouchableOpacity style={styles.goldButton} onPress={save} disabled={saving}>
        <Text style={styles.goldButtonText}>{saving ? "Saving..." : "Start Tracking"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#0A0A0A" },
  step: { marginHorizontal: 24, marginTop: 24, fontSize: 12, fontWeight: "700", color: "#C9A227", letterSpacing: 1 },
  question: { marginHorizontal: 24, marginTop: 8, marginBottom: 16, fontSize: 18, fontWeight: "700", color: "#0A0A0A" },
  option: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 8 },
  optionActive: { borderColor: "#C9A227", borderWidth: 2 },
  optionText: { fontSize: 16, color: "#0A0A0A", fontWeight: "500" },
  optionTextActive: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 24 },
  row > * : {}, // placeholder no-op
  pctRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 24 },
  pctInput: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5", padding: 16, fontSize: 20, fontWeight: "700", width: 110, textAlign: "center" },
  hint: { marginHorizontal: 24, marginTop: 12, fontSize: 13, color: "#666", lineHeight: 18 },
  goldButton: { backgroundColor: "#C9A227", borderRadius: 12, paddingVertical: 18, marginHorizontal: 24, marginTop: 32, alignItems: "center" },
  goldButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
