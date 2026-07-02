import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";

const UPGRADE_LINK = "https://buy.stripe.com/7sY7sLeWX68g3Qr2Vkgbm00";

export default function NewClientScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!fullName || !email) {
      Alert.alert("Error", "Full name and email are required");
      return;
    }

    setLoading(true);
    try {
      // FIX: Retry session fetch up to 3 times with delay
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        attempts++;
      }

      const user = session?.user;
      if (!user) {
        Alert.alert("Session Expired", "Please log out and log back in to continue.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("photographers")
        .select("id, subscription_tier")
        .eq("auth_id", user.id)
        .single();

      // FREE TIER LIMIT CHECK
      if (profile?.subscription_tier === "free") {
        const { count, error: countError } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("photographer_id", profile.id);

        if (countError) {
          Alert.alert("Error", "Could not check client limit: " + countError.message);
          return;
        }

        if (count && count >= 3) {
          Alert.alert(
            "Free Limit Reached",
            "You've used all 3 free client slots. Upgrade to Pro for unlimited clients.",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "Upgrade to Pro", 
                onPress: () => WebBrowser.openBrowserAsync(UPGRADE_LINK)
              }
            ]
          );
          return;
        }
      }

      if (!profile) {
        // Auto-create photographer profile if missing
        const { data: newProfile, error: profileError } = await supabase
          .from("photographers")
          .insert({
            auth_id: user.id,
            email: user.email || email,
            full_name: user.email?.split("@")[0] || "Photographer",
            subscription_tier: "free",
            subscription_status: "active",
          })
          .select()
          .single();

        if (profileError) {
          Alert.alert("Error", "Failed to create profile: " + profileError.message);
          return;
        }

        const { error } = await supabase.from("clients").insert({
          photographer_id: newProfile.id,
          full_name: fullName,
          partner_name: partnerName || null,
          email: email,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
          source: "app",
        });

        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("clients").insert({
          photographer_id: profile.id,
          full_name: fullName,
          partner_name: partnerName || null,
          email: email,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
          source: "app",
        });

        if (error) {
          Alert.alert("Error", error.message);
          return;
        }
      }

      Alert.alert("Success", "Client added!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Client</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Sarah Smith"
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Partner Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Michael Smith"
            placeholderTextColor="#999"
            value={partnerName}
            onChangeText={setPartnerName}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="sarah@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="0412 345 678"
            placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Glen Innes, NSW"
            placeholderTextColor="#999"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Bride wants sunset photos..."
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.disabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading ? "Saving..." : "Save Client"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  scroll: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  back: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", color: "#0A0A0A" },
  form: { paddingHorizontal: 24, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    color: "#0A0A0A",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});