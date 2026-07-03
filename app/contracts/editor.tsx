import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";

const TEMPLATES = {
  standard: `WEDDING PHOTOGRAPHY CONTRACT

Package: [PACKAGE_NAME]
Date: [DATE]
Location: [LOCATION]

1. SERVICES
The photographer agrees to provide wedding photography services as outlined in the package description.

2. PAYMENT
A 50% non-refundable deposit is required to secure the date. The remaining balance is due 2 weeks before the wedding date.

3. CANCELLATION
If the client cancels within 30 days of the event, the deposit is forfeited.

4. COPYRIGHT
The photographer retains copyright of all images. The client receives a personal use license for digital files.

5. WEATHER
In the event of severe weather, the photographer and client will discuss alternative arrangements.`,

  elopement: `ELOPEMENT PHOTOGRAPHY CONTRACT

Package: [PACKAGE_NAME]
Date: [DATE]
Location: [LOCATION]

1. SERVICES
2-hour elopement coverage including ceremony and portraits.

2. PAYMENT
Full payment required at booking. No refunds for cancellations within 14 days.

3. TRAVEL
Travel within 50km included. Additional travel charged at $0.85/km.

4. DELIVERY
50 edited photos delivered within 2 weeks via online gallery.`,

  engagement: `ENGAGEMENT SESSION CONTRACT

Package: [PACKAGE_NAME]
Date: [DATE]
Location: [LOCATION]

1. SERVICES
1-hour engagement photo session at agreed location.

2. PAYMENT
Full payment at session. Rescheduling allowed with 48 hours notice.

3. DELIVERY
20 edited photos delivered within 1 week.

4. CANCELLATION
No refunds for no-shows. Reschedule fee $50 if less than 24 hours notice.`,
};

export default function ContractEditorScreen() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>("standard");
  const [contractText, setContractText] = useState(TEMPLATES.standard);
  const [saving, setSaving] = useState(false);

  const loadTemplate = (key: keyof typeof TEMPLATES) => {
    setSelectedTemplate(key);
    setContractText(TEMPLATES[key]);
  };

  const handleSave = () => {
    setSaving(true);
    // In production, save to Supabase
    setTimeout(() => {
      setSaving(false);
      Alert.alert("Saved", "Contract template saved!");
    }, 500);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contract Editor</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Choose Template</Text>
        <View style={styles.templateRow}>
          {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.templateBadge, selectedTemplate === key && styles.templateActive]}
              onPress={() => loadTemplate(key)}
            >
              <Text style={[styles.templateText, selectedTemplate === key && styles.templateTextActive]}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Edit Contract</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={contractText}
          onChangeText={setContractText}
          multiline
          numberOfLines={20}
          textAlignVertical="top"
        />

        <Text style={styles.hint}>
          Use [PACKAGE_NAME], [DATE], [LOCATION] as placeholders. They will be replaced automatically when sending.
        </Text>
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Template"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 12, marginTop: 8 },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  templateBadge: { backgroundColor: "#F8F6F0", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  templateActive: { backgroundColor: "#C9A227", borderColor: "#C9A227" },
  templateText: { fontSize: 13, color: "#666", fontWeight: "600" },
  templateTextActive: { color: "#0A0A0A" },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 14, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A", lineHeight: 22 },
  textArea: { height: 400, textAlignVertical: "top" },
  hint: { fontSize: 12, color: "#999", marginTop: 12, fontStyle: "italic" },
  saveButton: { backgroundColor: "#C9A227", marginHorizontal: 24, marginTop: 8, marginBottom: 40, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
