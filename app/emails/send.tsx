import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase, getValidUser } from "../../lib/supabase";

export default function SendEmailScreen() {
  const router = useRouter();
  const { templateId, clientId } = useLocalSearchParams<{ templateId?: string; clientId?: string }>();

  const [template, setTemplate] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await getValidUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get photographer
      const { data: photog } = await supabase
        .from("photographers")
        .select("full_name, business_name, email, phone")
        .eq("auth_id", user.id)
        .single();

      setPhotographer(photog);

      // Get template
      if (templateId) {
        const { data: tmpl } = await supabase
          .from("emails")
          .select("*")
          .eq("id", templateId)
          .single();
        setTemplate(tmpl);
        if (tmpl) {
          setSubject(tmpl.subject || "");
          setBody(tmpl.body || "");
        }
      }

      // Get client
      if (clientId) {
        const { data: cl } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single();
        setClient(cl);
      }
    } catch (err) {
      console.error("[SendEmail] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const replaceVariables = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\{\{CLIENT_NAME\}\}/g, client?.full_name || "Client")
      .replace(/\{\{EVENT_DATE\}\}/g, client?.wedding_date || "TBA")
      .replace(/\{\{EVENT_LOCATION\}\}/g, client?.address || "TBA")
      .replace(/\{\{PACKAGE_NAME\}\}/g, "Package")
      .replace(/\{\{TOTAL_PRICE\}\}/g, "$0")
      .replace(/\{\{PHOTOGRAPHER_NAME\}\}/g, photographer?.full_name || "Photographer")
      .replace(/\{\{photographer_name\}\}/g, photographer?.full_name || "Photographer")
      .replace(/\{\{client_name\}\}/g, client?.full_name || "Client")
      .replace(/\{\{event_date\}\}/g, client?.wedding_date || "TBA")
      .replace(/\{\{event_location\}\}/g, client?.address || "TBA")
      .replace(/\{\{invoice_number\}\}/g, "INV-000")
      .replace(/\{\{invoice_amount\}\}/g, "$0")
      .replace(/\{\{due_date\}\}/g, "TBA")
      .replace(/\{\{gallery_link\}\}/g, "[Gallery Link]");
  };

  const handleSend = async () => {
    if (!client?.email) {
      Alert.alert("No Email", "This client does not have an email address.");
      return;
    }

    setSending(true);
    try {
      const finalSubject = replaceVariables(subject);
      const finalBody = replaceVariables(body);

      // Open email app with mailto
      const mailto = `mailto:${client.email}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
      const { Linking } = await import("react-native");
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
        Alert.alert("Success", "Email app opened with pre-filled message.");
      } else {
        Alert.alert("No Email App", "Please install an email client.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Email</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>To</Text>
        <Text style={styles.toText}>{client?.full_name || "No client selected"}</Text>
        <Text style={styles.toEmail}>{client?.email || "No email"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Subject</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={12}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity style={[styles.sendButton, sending && styles.disabled]} onPress={handleSend} disabled={sending}>
        <Text style={styles.sendButtonText}>{sending ? "Opening..." : "Open in Email App"}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  back: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#0A0A0A" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8 },
  toText: { fontSize: 16, fontWeight: "600", color: "#0A0A0A" },
  toEmail: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  bodyInput: { height: 250, lineHeight: 22 },
  sendButton: { backgroundColor: "#C9A227", marginHorizontal: 20, marginTop: 8, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
