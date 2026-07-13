import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_hours: number;
  includes: string;
  created_at: string;
}

export default function PackagesScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [includes, setIncludes] = useState("");

  const fetchPackages = async () => {
    try {
      let session = null;
      let attempts = 0;
      while (!session && attempts < 3) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
        if (!session) await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      const user = session?.user;
      if (!user) return;
      if (!user.email_confirmed_at) return;

      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("auth_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Error", "Name and price are required");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      // Get photographer record
      const { data: photographer } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!photographer) {
        Alert.alert("Error", "Profile not found");
        return;
      }

      const { error } = await supabase.from("packages").insert({
        photographer_id: photographer.id,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        duration_hours: parseInt(duration) || null,
        includes: includes.trim(),
      });

      if (error) throw error;

      Alert.alert("Success", "Package saved!");
      setName("");
      setDescription("");
      setPrice("");
      setDuration("");
      setIncludes("");
      setShowForm(false);
      fetchPackages();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const deletePackage = async (id: string) => {
    Alert.alert(
      "Delete Package",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("packages").delete().eq("id", id);
              if (error) throw error;
              setPackages(packages.filter((p) => p.id !== id));
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Packages</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? "− Cancel" : "+ New Package"}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.label}>Package Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Gold Wedding Package" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="What's included..." multiline numberOfLines={3} textAlignVertical="top" />

          <Text style={styles.label}>Price ($) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />

          <Text style={styles.label}>Duration (hours)</Text>
          <TextInput style={styles.input} value={duration} onChangeText={setDuration} placeholder="8" keyboardType="number-pad" />

          <Text style={styles.label}>Includes</Text>
          <TextInput style={[styles.input, styles.textArea]} value={includes} onChangeText={setIncludes} placeholder="• 2 photographers&#10;• 500 edited photos&#10;• Online gallery&#10;• Engagement session" multiline numberOfLines={6} textAlignVertical="top" />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Package</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : packages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No packages yet</Text>
          <Text style={styles.emptySubtext}>Create packages to use in bookings and contracts</Text>
        </View>
      ) : (
        packages.map((pkg) => (
          <View key={pkg.id} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageName}>{pkg.name}</Text>
              <TouchableOpacity onPress={() => deletePackage(pkg.id)}>
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
            {pkg.description ? <Text style={styles.packageDesc}>{pkg.description}</Text> : null}
            <Text style={styles.packagePrice}>${pkg.price}</Text>
            {pkg.duration_hours ? <Text style={styles.packageDetail}>⏱️ {pkg.duration_hours} hours</Text> : null}
            {pkg.includes ? <Text style={styles.packageIncludes}>{pkg.includes}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { backgroundColor: "#C9A227", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  formCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#E5E5E5" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  textArea: { height: 120, textAlignVertical: "top" },
  saveButton: { backgroundColor: "#C9A227", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  loading: { textAlign: "center", marginTop: 40, color: "#666" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#0A0A0A", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#666", textAlign: "center" },
  packageCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  packageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  packageName: { fontSize: 17, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  deleteText: { fontSize: 18 },
  packageDesc: { fontSize: 14, color: "#666", marginBottom: 8, lineHeight: 20 },
  packagePrice: { fontSize: 20, fontWeight: "700", color: "#C9A227", marginBottom: 4 },
  packageDetail: { fontSize: 13, color: "#999", marginBottom: 4 },
  packageIncludes: { fontSize: 13, color: "#666", lineHeight: 18, marginTop: 8 },
});