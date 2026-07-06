import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function NewClientScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [weddingDate, setWeddingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setWeddingDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!fullName || !email) {
      Alert.alert("Error", "Full name and email are required");
      return;
    }

    setLoading(true);
    try {
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

      // NEW: Check if email is verified
      if (!user.email_confirmed_at) {
        Alert.alert(
          "Email Not Verified",
          "Please verify your email before creating clients. Check your inbox for the confirmation link."
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("clients").insert({
        auth_id: user.id,
        full_name: fullName,
        partner_name: partnerName,
        email,
        phone,
        address,
        notes,
        wedding_date: weddingDate.toISOString().split("T")[0],
      });

      setLoading(false);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Client saved!");
        router.replace("/clients");
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Client</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="e.g. Sarah Smith" />

        <Text style={styles.label}>Partner Name</Text>
        <TextInput style={styles.input} value={partnerName} onChangeText={setPartnerName} placeholder="e.g. James Smith" />

        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="sarah@email.com" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0412 345 678" keyboardType="phone-pad" />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Wedding venue or home address" />

        <Text style={styles.label}>Wedding Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            {weddingDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={weddingDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Bride wants sunset photos, mother-in-law allergic to flash..."
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity style={[styles.saveButton, loading && styles.disabled]} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save Client"}</Text>
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
  textArea: { height: 100, textAlignVertical: "top" },
  dateButton: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  dateButtonText: { fontSize: 15, color: "#0A0A0A" },
  saveButton: { backgroundColor: "#C9A227", marginHorizontal: 24, marginTop: 8, marginBottom: 40, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});