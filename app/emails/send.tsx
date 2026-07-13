import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function SendEmailScreen() {
  const router = useRouter();
  const { templateId, subject: initialSubject, body: initialBody, contractId, clientId } = useLocalSearchParams();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState((initialSubject as string) || "");
  const [body, setBody] = useState((initialBody as string) || "");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientEmail(clientId as string);
    }
  }, [clientId]);

  const fetchClientEmail = async (id: string) => {
    try {
      const { data, error } = await supabase.from("clients").select("email, full_name").eq("id", id).single();
      if (error) throw error;
      if (data) {
        setTo(data.email || "");
        setClientName(data.full_name || "");
      }
    } catch (err) {
      console.error("Error fetching client:", err);
    }
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/{{CLIENT_NAME}}/g, clientName || "Client")
      .replace(/{{PHOTOGRAPHER_NAME}}/g, "Your Photographer")
      .replace(/{{EVENT_DATE}}/g, "[Event Date]")
      .replace(/{{EVENT_LOCATION}}/g, "[Location]")
      .replace(/{{PACKAGE_NAME}}/g, "[Package]")
      .replace(/{{DEPOSIT_AMOUNT}}/g, "[Deposit Amount]");
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const finalBody = replaceVariables(body);
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;

    try {
      // Log the email
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        if (!session) await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      const user = session?.user;
        if (!user || !user.email_confirmed_at) return;

      // Get photographer record
      const { data: photographer } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!photographer) return;

      await supabase.from("emails").insert({
        photographer_id: photographer.id,
        client_id: clientId || null,
        template_id: templateId || null,
        subject: subject,
        body: finalBody,
        recipient: to,
      });

      // Open mail client
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        Alert.alert("Success", "Email client opened! The email has been logged.");
      } else {
        Alert.alert("Error", "No email client found. Please copy and send manually.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>To *</Text>
        <TextInput
          style={styles.input}
          value={to}
          onChangeText={setTo}
          placeholder="client@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Subject *</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Email subject"
        />

        <Text style={styles.label}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={15}
          textAlignVertical="top"
        />

        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>💡 Variables</Text>
          <Text style={styles.hintText}>
            {{CLIENT_NAME}} — Auto-filled{"\n"}
            {{EVENT_DATE}} — Manual or from booking{"\n"}
            {{EVENT_LOCATION}} — Manual or from booking{"\n"}
            {{PACKAGE_NAME}} — Manual or from booking{"\n"}
            {{PHOTOGRAPHER_NAME}} — Your profile
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
        <Text style={styles.sendButtonText}>📧 Open Email Client</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        This opens your phone's email app. The email will be pre-filled and logged in IvoryOS.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backArrow: { fontSize: 24, color: "#0A0A0A" },
  title: { fontSize: 24, fontWeight: "700", color: "#0A0A0A" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  textArea: { height: 300, textAlignVertical: "top" },
  hintBox: { backgroundColor: "#FFF8E1", padding: 16, borderRadius: 12, marginTop: 16, borderLeftWidth: 4, borderLeftColor: "#C9A227" },
  hintTitle: { fontWeight: "700", color: "#0A0A0A", marginBottom: 6 },
  hintText: { fontSize: 13, color: "#666", lineHeight: 20 },
  sendButton: { backgroundColor: "#C9A227", marginHorizontal: 24, marginTop: 8, marginBottom: 12, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  sendButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  note: { textAlign: "center", color: "#999", fontSize: 13, marginHorizontal: 24, marginBottom: 40 },
});