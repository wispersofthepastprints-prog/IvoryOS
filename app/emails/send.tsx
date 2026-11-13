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

type RouteParams = {
  templateId?: string;
  clientId?: string;
  template?: "contract";
  contractId?: string;
};

export default function SendEmailScreen() {
  const router = useRouter();
  const { templateId, clientId, template: templateKind, contractId } = useLocalSearchParams<RouteParams>();

  const [template, setTemplate] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [photographer, setPhotographer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const loadClient = async (id: string, photographerId: string) => {
    const [{ data: selectedClient }, { data: latestBooking }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).eq("photographer_id", photographerId).single(),
      supabase
        .from("bookings")
        .select("event_date, location, event_location, package_description, package_price, deposit_amount, balance_due")
        .eq("client_id", id)
        .eq("photographer_id", photographerId)
        .order("event_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setClient(selectedClient || null);
    setBooking(latestBooking || null);
  };

  const loadData = async () => {
    try {
      const user = await getValidUser();
      if (!user) return;

      const { data: photog } = await supabase
        .from("photographers")
        .select("id, full_name, business_name, email, phone")
        .eq("auth_id", user.id)
        .single();
      setPhotographer(photog);
      if (!photog) return;

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, full_name, partner_name, email")
        .eq("photographer_id", photog.id)
        .order("full_name", { ascending: true });
      setClients(clientRows || []);

      if (templateId) {
        const { data: tmpl } = await supabase
          .from("emails")
          .select("*")
          .eq("id", templateId)
          .eq("photographer_id", photog.id)
          .single();
        setTemplate(tmpl);
        if (tmpl) {
          setSubject(tmpl.subject || "");
          setBody(tmpl.body || "");
        }
      } else if (templateKind === "contract" && contractId) {
        const { data: contract } = await supabase
          .from("contracts")
          .select("id, title, content")
          .eq("id", contractId)
          .eq("photographer_id", photog.id)
          .single();
        setTemplate(contract);
        if (contract) {
          setSubject(contract.title || "Photography agreement");
          setBody(contract.content || "");
        }
      }

      if (clientId) await loadClient(clientId, photog.id);
    } catch (err) {
      console.error("[SendEmail] load error:", err);
      Alert.alert("Error", "Could not load the email composer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const money = (cents: number | null | undefined) =>
    typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "TBA";

  const replaceVariables = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\{\{CLIENT_NAME\}\}/gi, client?.full_name || "Client")
      .replace(/\{\{EVENT_DATE\}\}/gi, booking?.event_date || client?.wedding_date || "TBA")
      .replace(/\{\{EVENT_LOCATION\}\}/gi, booking?.location || booking?.event_location || client?.address || "TBA")
      .replace(/\{\{PACKAGE_NAME\}\}/gi, booking?.package_description || "Package")
      .replace(/\{\{TOTAL_PRICE\}\}/gi, money(booking?.package_price))
      .replace(/\{\{DEPOSIT_AMOUNT\}\}/gi, money(booking?.deposit_amount))
      .replace(/\{\{BALANCE_AMOUNT\}\}/gi, money(booking?.balance_due))
      .replace(/\{\{PHOTOGRAPHER_NAME\}\}/gi, photographer?.full_name || "Photographer")
      .replace(/\{\{INVOICE_NUMBER\}\}/gi, "TBA")
      .replace(/\{\{INVOICE_AMOUNT\}\}/gi, "TBA")
      .replace(/\{\{DUE_DATE\}\}/gi, "TBA")
      .replace(/\{\{GALLERY_LINK\}\}/gi, "[Gallery Link]");
  };

  const handleSend = async () => {
    if (!client?.email) {
      Alert.alert("Choose a Client", "Select a client with an email address before opening the email app.");
      return;
    }

    setSending(true);
    try {
      const finalSubject = replaceVariables(subject);
      const finalBody = replaceVariables(body);
      const mailto = `mailto:${client.email}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
      const { Linking } = await import("react-native");
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
        Alert.alert("Email App Opened", "Review and send the pre-filled message in your email app.");
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Email</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>To</Text>
        {client ? (
          <>
            <Text style={styles.toText}>{client.full_name}</Text>
            <Text style={styles.toEmail}>{client.email || "No email"}</Text>
            {clients.length > 1 && (
              <TouchableOpacity onPress={() => { setClient(null); setBooking(null); }}>
                <Text style={styles.changeClient}>Choose a different client</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.chooseText}>Choose a client</Text>
            {clients.length === 0 ? (
              <Text style={styles.toEmail}>No clients are available yet.</Text>
            ) : clients.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.clientChoice}
                onPress={() => photographer && loadClient(item.id, photographer.id)}
              >
                <Text style={styles.clientChoiceName}>{item.full_name}{item.partner_name ? ` & ${item.partner_name}` : ""}</Text>
                <Text style={styles.toEmail}>{item.email || "No email address"}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
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
  container: { backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F0" },
  loadingText: { marginTop: 10, color: "#6b7280" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  back: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "700", color: "#0A0A0A" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 20, marginBottom: 12, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 8 },
  toText: { fontSize: 16, fontWeight: "600", color: "#0A0A0A" },
  toEmail: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  chooseText: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", marginBottom: 8 },
  changeClient: { color: "#8A6D00", fontWeight: "600", marginTop: 12 },
  clientChoice: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingVertical: 12 },
  clientChoiceName: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  bodyInput: { height: 250, lineHeight: 22, textAlignVertical: "top" },
  sendButton: { backgroundColor: "#C9A227", marginHorizontal: 20, marginTop: 8, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  sendButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});
