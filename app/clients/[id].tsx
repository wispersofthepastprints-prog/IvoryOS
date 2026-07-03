import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Client } from "../../types/database";

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClient(); }, [id]);

  const fetchClient = async () => {
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    setClient(data);
    setLoading(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Client", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("clients").delete().eq("id", id);
          if (!error) router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Client not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Client</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.delete}>🗑</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{client.full_name}</Text>
        {client.partner_name && (
          <Text style={styles.partner}>Partner: {client.partner_name}</Text>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionLabel}>CONTACT</Text>
        <Text style={styles.infoRow}>📧 {client.email}</Text>
        {client.phone && <Text style={styles.infoRow}>📞 {client.phone}</Text>}
        {client.address && <Text style={styles.infoRow}>📍 {client.address}</Text>}
      </View>

      {client.notes && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <Text style={styles.notes}>{client.notes}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.newBookingButton} onPress={() => router.push(`/bookings/new?clientId=${client.id}`)}>
        <Text style={styles.newBookingText}>+ New Booking for {client.full_name}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center" },
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
  delete: { fontSize: 20 },
  card: {
    backgroundColor: "#0A0A0A",
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  name: { color: "#F8F6F0", fontSize: 24, fontWeight: "700" },
  partner: { color: "#C9A227", fontSize: 14, marginTop: 4 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginBottom: 12 },
  infoRow: { fontSize: 15, color: "#0A0A0A", marginBottom: 8 },
  notes: { fontSize: 14, color: "#666", lineHeight: 20 },
  newBookingButton: {
    backgroundColor: "#C9A227",
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  newBookingText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
});