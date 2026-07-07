import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const DEFAULT_CONTRACT_TEMPLATE = `WEDDING PHOTOGRAPHY AGREEMENT

This agreement is made between {{PHOTOGRAPHER_NAME}} ("Photographer") and {{CLIENT_NAME}} ("Client").

EVENT DETAILS
Date: {{EVENT_DATE}}
Location: {{EVENT_LOCATION}}
Package: {{PACKAGE_NAME}}

SERVICES
The Photographer agrees to provide wedding photography services as described in the selected package.

PAYMENT
Total Fee: {{TOTAL_PRICE}}
Deposit: {{DEPOSIT_AMOUNT}} (due at booking)
Balance: {{BALANCE_AMOUNT}} (due 7 days before event)

CANCELLATION
- Client may cancel up to 30 days before event for full deposit refund
- Cancellations within 30 days forfeit deposit
- Photographer reserves right to substitute in case of emergency

IMAGE DELIVERY
- Digital gallery delivered within 4-6 weeks
- Client receives print release for personal use
- Photographer retains copyright and right to use for portfolio/marketing

SIGNATURES
_________________________    _________________________
Photographer                    Client
Date: _______________          Date: _______________`;

export default function NewContractScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(DEFAULT_CONTRACT_TEMPLATE);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Contract title is required");
      return;
    }

    setLoading(true);
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
        Alert.alert("Session Expired", "Please log out and log back in.");
        setLoading(false);
        return;
      }

      if (!user.email_confirmed_at) {
        Alert.alert("Email Not Verified", "Please verify your email first.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("contracts").insert({
        auth_id: user.id,
        title: title.trim(),
        content: content.trim(),
      });

      setLoading(false);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Contract template saved!");
        router.replace("/contracts");
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Contract</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Contract Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Standard Wedding Package"
        />

        <Text style={styles.label}>Contract Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={20}
          textAlignVertical="top"
        />

        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>💡 Template Variables</Text>
          <Text style={styles.hintText}>{{CLIENT_NAME}} — Auto-filled from client{"
"}{{EVENT_DATE}} — Auto-filled from booking{"
"}{{EVENT_LOCATION}} — Auto-filled from booking{"
"}{{PACKAGE_NAME}} — Auto-filled from booking{"
"}{{TOTAL_PRICE}} — Auto-filled from booking{"
"}{{PHOTOGRAPHER_NAME}} — Your profile name</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveButton, loading && styles.disabled]} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save Contract Template"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  textArea: { height: 400, textAlignVertical: "top" },
  hintBox: { backgroundColor: "#FFF8E1", padding: 16, borderRadius: 12, marginTop: 16, borderLeftWidth: 4, borderLeftColor: "#C9A227" },
  hintTitle: { fontWeight: "700", color: "#0A0A0A", marginBottom: 6 },
  hintText: { fontSize: 13, color: "#666", lineHeight: 20 },
  saveButton: { backgroundColor: "#C9A227", marginHorizontal: 24, marginTop: 8, marginBottom: 40, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
