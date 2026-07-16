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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
};

const DEFAULT_TEMPLATES: Record<string, Omit<Template, "id">> = {
  "inquiry-response": {
    name: "Inquiry Response",
    subject: "Re: Your Photography Inquiry",
    category: "Client",
    body: `Hi {{client_name}},

Thank you so much for reaching out about your wedding photography! I\'d love to learn more about your plans.

Could you share a few details with me?
- Wedding date
- Venue/location
- Approximate guest count
- What style of photography you love most

I have a few packages that might suit you, and I\'m happy to customise something if needed. Let me know a good time for a quick call or feel free to reply here.

Looking forward to hearing from you!

Best,
{{photographer_name}}`,
  },
  "booking-confirmation": {
    name: "Booking Confirmation",
    subject: "You're Booked! Next Steps",
    category: "Client",
    body: `Hi {{client_name}},

I\'m so excited to officially be your wedding photographer! 🎉

Here are the next steps:
1. Contract signing — I\'ll send this within 24 hours
2. 50% deposit to secure your date
3. Pre-wedding questionnaire (closer to the date)
4. Timeline planning call (2 weeks before)

Your date: {{event_date}}
Location: {{event_location}}

If you have any questions at all, just reply to this email.

Cheers,
{{photographer_name}}`,
  },
  "invoice-reminder": {
    name: "Invoice Reminder",
    subject: "Friendly Payment Reminder",
    category: "Business",
    body: `Hi {{client_name}},

I hope you\'re doing well! This is a gentle reminder that invoice {{invoice_number}} for ${{invoice_amount}} is due on {{due_date}}.

If you\'ve already paid, please ignore this — and thank you!

Payment can be made via the link in the original invoice email, or just reply here if you need anything resent.

Thanks so much,
{{photographer_name}}`,
  },
  "gallery-delivery": {
    name: "Gallery Delivery",
    subject: "Your Photos Are Ready",
    category: "Client",
    body: `Hi {{client_name}},

Your wedding gallery is live! 🎉

You can view, download, and share your photos here:
{{gallery_link}}

The gallery will be available for 12 months. If you\'d like to order prints or an album, just let me know — I can help you pick the best shots.

It was an absolute honour capturing your day. Thank you for trusting me.

Best,
{{photographer_name}}`,
  },
  "testimonial-request": {
    name: "Testimonial Request",
    subject: "A Quick Favor",
    category: "Client",
    body: `Hi {{client_name}},

I hope you\'re loving your photos! If you have a spare moment, I\'d be incredibly grateful for a short review. It really helps other couples find me.

You can leave one here: {{review_link}}

No pressure at all — but if you do, thank you from the bottom of my heart.

Best,
{{photographer_name}}`,
  },
  "contract-follow-up": {
    name: "Contract Follow-up",
    subject: "Contract Reminder",
    category: "Business",
    body: `Hi {{client_name}},

Just a quick follow-up on the contract for your wedding on {{event_date}}.

To secure your date, I\'ll need the signed contract and deposit back by {{deadline_date}}. After that, the date will be released to other inquiries.

Please let me know if you have any questions or need a revised version.

Thanks,
{{photographer_name}}`,
  },
};

export default function EmailTemplateScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  const [templateId, setTemplateId] = useState<string>(id || "");
  const [templateName, setTemplateName] = useState(name || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Client");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photographerId, setPhotographerId] = useState<string | null>(null);

  // Resolve photographer_id on mount
  useEffect(() => {
    const resolvePhotographer = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("photographers")
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!error && data) setPhotographerId(data.id);
      } catch (err) {
        console.error("[EmailTemplate] resolve error:", err);
      }
    };
    resolvePhotographer();
  }, []);

  // Load template data
  useEffect(() => {
    if (!photographerId) return;

    const loadTemplate = async () => {
      try {
        // Try to fetch from DB first
        const { data, error } = await supabase
          .from("emails")
          .select("id, name, subject, body, category")
          .eq("photographer_id", photographerId)
          .eq("id", templateId)
          .single();

        if (data && !error) {
          setTemplateName(data.name);
          setSubject(data.subject);
          setBody(data.body || "");
          setCategory(data.category);
        } else {
          // Fallback to default template
          const defaults = DEFAULT_TEMPLATES[templateId];
          if (defaults) {
            setTemplateName(defaults.name);
            setSubject(defaults.subject);
            setBody(defaults.body);
            setCategory(defaults.category);
          } else {
            // New blank template
            setTemplateName(name || "New Template");
            setSubject("");
            setBody("");
            setCategory("Client");
          }
        }
      } catch (err) {
        console.error("[EmailTemplate] load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [photographerId, templateId, name]);

  const handleSave = async () => {
    if (!templateName.trim() || !subject.trim()) {
      Alert.alert("Missing Fields", "Template name and subject are required.");
      return;
    }
    if (!photographerId) {
      Alert.alert("Error", "Profile not found. Please complete your profile first.");
      return;
    }

    setSaving(true);
    try {
      // Check if this template already exists in DB
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("photographer_id", photographerId)
        .eq("id", templateId)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from("emails")
          .update({
            name: templateName.trim(),
            subject: subject.trim(),
            body: body.trim(),
            category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", templateId)
          .eq("photographer_id", photographerId);
      } else {
        // Insert new (or seed a default for the first time)
        result = await supabase.from("emails").insert({
          photographer_id: photographerId,
          name: templateName.trim(),
          subject: subject.trim(),
          body: body.trim(),
          category,
        });
      }

      if (result.error) {
        Alert.alert("Save Failed", result.error.message);
      } else {
        Alert.alert("Saved", "Template saved successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong saving the template.");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C9A227" />
        <Text style={styles.loadingText}>Loading template...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Template</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Template Name *</Text>
          <TextInput
            style={styles.input}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="e.g. Inquiry Response"
          />

          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Re: Your Photography Inquiry"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {["Client", "Business"].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBadge, category === cat && styles.categoryActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="Write your email template here..."
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />

          <Text style={styles.helperTitle}>Quick Insert Variables</Text>
          <View style={styles.variableRow}>
            {[
              "{{client_name}}",
              "{{event_date}}",
              "{{event_location}}",
              "{{photographer_name}}",
              "{{invoice_number}}",
              "{{invoice_amount}}",
              "{{gallery_link}}",
              "{{due_date}}",
            ].map((v) => (
              <TouchableOpacity key={v} style={styles.variableChip} onPress={() => insertVariable(v)}>
                <Text style={styles.variableChipText}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Template"}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  bodyInput: { height: 220, lineHeight: 22 },
  categoryRow: { flexDirection: "row", gap: 10 },
  categoryBadge: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  categoryActive: { backgroundColor: "#C9A227", borderColor: "#C9A227" },
  categoryText: { fontSize: 13, color: "#666", fontWeight: "600" },
  categoryTextActive: { color: "#0A0A0A" },
  helperTitle: { fontSize: 13, fontWeight: "600", color: "#6b7280", marginTop: 16, marginBottom: 8 },
  variableRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variableChip: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  variableChipText: { fontSize: 12, color: "#C9A227", fontWeight: "600" },
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
});
