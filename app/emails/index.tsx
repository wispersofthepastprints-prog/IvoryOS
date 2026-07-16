import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  category: string;
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  { id: "inquiry-response", name: "Inquiry Response", subject: "Re: Your Photography Inquiry", category: "Client" },
  { id: "booking-confirmation", name: "Booking Confirmation", subject: "You're Booked! Next Steps", category: "Client" },
  { id: "invoice-reminder", name: "Invoice Reminder", subject: "Friendly Payment Reminder", category: "Business" },
  { id: "gallery-delivery", name: "Gallery Delivery", subject: "Your Photos Are Ready", category: "Client" },
  { id: "testimonial-request", name: "Testimonial Request", subject: "A Quick Favor", category: "Client" },
  { id: "contract-follow-up", name: "Contract Follow-up", subject: "Contract Reminder", category: "Business" },
];

export default function EmailsScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from("emails")
          .select("id, name, subject, category")
          .order("category", { ascending: true });

        if (error || !data || data.length === 0) {
          console.log("[Emails] Using defaults. Reason:", error?.message || "empty");
          setTemplates(DEFAULT_TEMPLATES);
        } else {
          setTemplates(data);
        }
      } catch (err) {
        console.error("[Emails] Exception:", err);
        setTemplates(DEFAULT_TEMPLATES);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handlePress = (template: EmailTemplate) => {
    // Navigate to the template editor with the template ID
    router.push({
      pathname: "/emails/template",
      params: { id: template.id, name: template.name },
    });
  };

  const renderItem = ({ item }: { item: EmailTemplate }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.subject}>{item.subject}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Email Templates</Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No templates found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  header: { padding: 20, paddingTop: 60, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", flex: 1 },
  categoryBadge: {
    backgroundColor: "#F8F6F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  subject: { fontSize: 14, color: "#6b7280" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, color: "#9ca3af" },
});
