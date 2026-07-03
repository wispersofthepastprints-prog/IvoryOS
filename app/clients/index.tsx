import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Client } from "../../types/database";

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("photographers").select("id").eq("auth_id", user.id).single();
    const { data } = await supabase.from("clients").select("*").eq("photographer_id", profile?.id).order("created_at", { ascending: false });
    setClients(data || []);
  };

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity style={styles.clientCard} onPress={() => router.push(`/clients/${item.id}`)}>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.full_name}</Text>
        <Text style={styles.clientDetail}>{item.email}</Text>
        {item.partner_name && <Text style={styles.clientDetail}>Partner: {item.partner_name}</Text>}
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/clients/new")}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
      <TextInput style={styles.search} placeholder="Search clients..." placeholderTextColor="#999" value={search} onChangeText={setSearch} />
      <FlatList data={filteredClients} renderItem={renderClient} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0", paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#C9A227", justifyContent: "center", alignItems: "center" },
  addText: { color: "#0A0A0A", fontSize: 24, fontWeight: "700" },
  search: { backgroundColor: "#FFFFFF", marginHorizontal: 24, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 16, color: "#0A0A0A" },
  list: { paddingHorizontal: 24 },
  clientCard: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E5E5" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "600", color: "#0A0A0A", marginBottom: 4 },
  clientDetail: { fontSize: 13, color: "#666" },
  arrow: { fontSize: 18, color: "#C9A227" },
})