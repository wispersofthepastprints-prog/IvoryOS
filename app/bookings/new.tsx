import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCalendarEvent } from "../../lib/google-calendar";

export default function NewBookingScreen() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [location, setLocation] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const { date } = useLocalSearchParams();
  const [eventDate, setEventDate] = useState(date ? new Date(date as string) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState("inquiry");
  const [loading, setLoading] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!clientId || !packagePrice) {
      Alert.alert("Error", "Client and package price are required");
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

      // Get photographer record first
      const { data: photographer } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!photographer) {
        Alert.alert("Error", "Profile not found");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("bookings").insert({
        photographer_id: photographer.id,
        client_id: clientId,
        location,
        package_price: parseFloat(packagePrice),
        package_description: packageDescription,
        event_date: eventDate.toISOString().split("T")[0],
        status,
      });

      setLoading(false);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        // Sync to Google Calendar        // Sync to Google Calendar (optional — don't fail if it doesn't work)
        try {
          const { getStoredToken, createCalendarEvent } = await import("../../lib/google-calendar");
          const googleToken = await getStoredToken();
          if (googleToken) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("full_name")
              .eq("id", clientId)
              .single();

            await createCalendarEvent(googleToken, {
              summary: `Wedding: ${clientData?.full_name || "Client"}`,
              description: packageDescription,
              location: location,
              startDate: eventDate.toISOString().split("T")[0],
              endDate: eventDate.toISOString().split("T")[0],
            });
            console.log("✅ Synced to Google Calendar");
          }
        } catch (calendarErr) {
          // Silently fail — booking is already saved
          console.log("Google Calendar sync skipped:", calendarErr);
        }

        Alert.alert("Success", "Booking saved!");
        router.replace("/bookings");
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Booking</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Client ID *</Text>
        <TextInput style={styles.input} value={clientId} onChangeText={setClientId} placeholder="Select a client from your list" />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Wedding venue address" />

        <Text style={styles.label}>Event Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            {eventDate.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={eventDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Package Price *</Text>
        <TextInput style={styles.input} value={packagePrice} onChangeText={setPackagePrice} placeholder="4500" keyboardType="decimal-pad" />

        <Text style={styles.label}>Package Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={packageDescription}
          onChangeText={setPackageDescription}
          placeholder="e.g. 8-hour coverage, 2 photographers, engagement session, 500 edited photos, online gallery..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {["inquiry", "quoted", "contracted", "confirmed", "completed"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBadge, status === s && styles.statusActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusText, status === s && styles.statusTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={[styles.saveButton, loading && styles.disabled]} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save Booking"}</Text>
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
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusBadge: { backgroundColor: "#F8F6F0", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#E5E5E5", marginRight: 8, marginBottom: 8 },
  statusActive: { backgroundColor: "#C9A227", borderColor: "#C9A227" },
  statusText: { fontSize: 13, color: "#666", fontWeight: "600" },
  statusTextActive: { color: "#0A0A0A" },
  saveButton: { backgroundColor: "#C9A227", marginHorizontal: 24, marginTop: 8, marginBottom: 40, paddingVertical: 18, borderRadius: 12, alignItems: "center" },
  disabled: { opacity: 0.6 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});