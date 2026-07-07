import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Share } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Contract {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ContractDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();
      if (error) throw error;
      setContract(data);
      setTitle(data.title);
      setContent(data.content);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("contracts").update({ title: title.trim(), content: content.trim() }).eq("id", id);
      if (error) throw error;
      Alert.alert("Success", "Contract updated!");
      setIsEditing(false);
      fetchContract();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!contract) return;
    try {
      await Share.share({
        message: contract.title + "\n\n" + contract.content,
        title: contract.title,
      });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleSendEmail = () => {
    router.push(`/emails/send?template=contract&contractId=${id}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Contract not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Edit Contract" : contract.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {isEditing ? (
        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Content</Text>
          <TextInput style={[styles.input, styles.textArea]} value={content} onChangeText={setContent} multiline numberOfLines={20} textAlignVertical="top" />
          <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            <Text style={styles.contractDate}>Created {new Date(contract.created_at).toLocaleDateString("en-AU")}</Text>
            <View style={styles.divider} />
            <Text style={styles.contractContent}>{contract.content}</Text>
          </View>

          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Actions</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit Contract</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionText}>Share / Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSendEmail}>
              <Text style={styles.actionIcon}>📧</Text>
              <Text style={styles.actionText}>Send via Email</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  loading: { textAlign: "center", marginTop: 60, fontSize: 16, color: "#666" },
  backButton: { marginTop: 20, alignSelf: "center", backgroundColor: "#C9A227", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: "#0A0A0A", fontWeight: "700" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backArrow: { fontSize: 24, color: "#0A0A0A" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0A0A0A", flex: 1, textAlign: "center" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  contractTitle: { fontSize: 20, fontWeight: "700", color: "#0A0A0A", marginBottom: 4 },
  contractDate: { fontSize: 13, color: "#999", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#E5E5E5", marginBottom: 16 },
  contractContent: { fontSize: 14, color: "#333", lineHeight: 22 },
  actionsCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: "#E5E5E5" },
  actionsTitle: { fontSize: 16, fontWeight: "700", color: "#0A0A0A", marginBottom: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  actionIcon: { fontSize: 20, marginRight: 12 },
  actionText: { fontSize: 15, color: "#0A0A0A", fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", color: "#0A0A0A", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#F8F6F0", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: "#E5E5E5", color: "#0A0A0A" },
  textArea: { height: 400, textAlignVertical: "top" },
  saveButton: { backgroundColor: "#C9A227", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  saveButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  cancelButton: { backgroundColor: "#E5E5E5", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#666", fontSize: 16, fontWeight: "600" },
});
