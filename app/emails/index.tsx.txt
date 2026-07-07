import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "booking-confirmation",
    name: "Booking Confirmation",
    category: "Booking",
    subject: "Your Wedding Photography is Confirmed! 🎉",
    body: `Hi {{CLIENT_NAME}},

Great news — your wedding photography is officially confirmed!

EVENT DETAILS
Date: {{EVENT_DATE}}
Location: {{EVENT_LOCATION}}
Package: {{PACKAGE_NAME}}

WHAT'S NEXT
- I'll send you a pre-wedding questionnaire 2 weeks before your date
- We'll schedule a final timeline call 1 week out
- Your gallery will be delivered within 4-6 weeks after the wedding

If you have any questions before then, just reply to this email.

Looking forward to capturing your day!

{{PHOTOGRAPHER_NAME}}
{{PHOTOGRAPHER_PHONE}}
{{PHOTOGRAPHER_EMAIL}}`
  },
  {
    id: "pre-wedding-reminder",
    name: "Pre-Wedding Reminder",
    category: "Reminder",
    subject: "One Week Until Your Wedding! 📸",
    body: `Hi {{CLIENT_NAME}},

Your wedding is just one week away! Here's a quick reminder of what to expect:

PHOTOGRAPHY TIMELINE
- Getting ready: {{START_TIME}}
- Ceremony: {{CEREMONY_TIME}}
- Reception: {{RECEPTION_TIME}}

FINAL CHECKLIST
□ Confirmed shot list
□ Shared family photo list
□ Backup indoor location (if weather is bad)
□ Relaxed timeline with buffer time

See you on {{EVENT_DATE}}!

{{PHOTOGRAPHER_NAME}}`
  },
  {
    id: "post-wedding-followup",
    name: "Post-Wedding Follow-up",
    category: "Follow-up",
    subject: "Your Wedding Photos Are Coming Soon 💕",
    body: `Hi {{CLIENT_NAME}},

Thank you for letting me be part of your wedding day! It was absolutely beautiful.

DELIVERY TIMELINE
- Sneak peek: 3-5 days
- Full gallery: 4-6 weeks
- Album design: 8-10 weeks

You'll receive an email with your private gallery link as soon as it's ready.

In the meantime, if you'd like to order prints or an album, just let me know!

With love,
{{PHOTOGRAPHER_NAME}}`
  },
  {
    id: "contract-reminder",
    name: "Contract Reminder",
    category: "Contract",
    subject: "Please Review & Sign Your Photography Agreement",
    body: `Hi {{CLIENT_NAME}},

Please find your wedding photography agreement attached. 

To secure your date, please:
1. Review the attached contract
2. Sign and return via email
3. Pay the deposit: {{DEPOSIT_AMOUNT}}

Once I receive both, your date is officially locked in!

Questions? Just reply to this email.

{{PHOTOGRAPHER_NAME}}`
  }
];

export default function EmailsScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomTemplates();
  }, []);

  const fetchCustomTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("auth_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomTemplates(data || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (template: EmailTemplate) => {
    router.push({
      pathname: "/emails/send",
      params: {
        templateId: template.id,
        subject: template.subject,
        body: template.body,
      },
    });
  };

  const allTemplates = [...templates, ...customTemplates];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Email Templates</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pre-Built Templates</Text>
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => handleSend(template)}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(template.category) }]}>
                <Text style={styles.categoryText}>{template.category}</Text>
              </View>
            </View>
            <Text style={styles.templateSubject} numberOfLines={1}>{template.subject}</Text>
            <Text style={styles.templatePreview} numberOfLines={2}>{template.body.substring(0, 100)}...</Text>
            <Text style={styles.sendText}>Tap to send →</Text>
          </TouchableOpacity>
        ))}
      </View>

      {customTemplates.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Custom Templates</Text>
          {customTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleSend(template)}
            >
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateSubject} numberOfLines={1}>{template.subject}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Booking": "#E8F5E9",
    "Reminder": "#FFF3E0",
    "Follow-up": "#E3F2FD",
    "Contract": "#F3E5F5",
  };
  return colors[category] || "#F5F5F5";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0A0A0A", marginHorizontal: 24, marginBottom: 12, marginTop: 8 },
  templateCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  templateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  templateName: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 12, fontWeight: "600", color: "#333" },
  templateSubject: { fontSize: 14, color: "#666", marginBottom: 6 },
  templatePreview: { fontSize: 13, color: "#999", lineHeight: 18, marginBottom: 8 },
  sendText: { fontSize: 14, fontWeight: "600", color: "#C9A227" },
});