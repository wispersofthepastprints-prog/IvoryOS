import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithGoogle } from "../../lib/google-calendar";

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    fetchProfile();
    checkGoogleConnection();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("photographers")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
      }

      setProfile(data);

      // Pre-fill edit form
      if (data) {
        setEditFullName(data.full_name || "");
        setEditBusinessName(data.business_name || "");
        setEditLocation(data.location || "");
        setEditPhone(data.phone || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleConnection = async () => {
    const token = await AsyncStorage.getItem("google_access_token");
    setGoogleConnected(!!token);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      const updates = {
        full_name: editFullName.trim() || null,
        business_name: editBusinessName.trim() || null,
        location: editLocation.trim() || null,
        phone: editPhone.trim() || null,
      };

      if (profile) {
        // Update existing
        const { error } = await supabase
          .from("photographers")
          .update(updates)
          .eq("auth_id", user.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("photographers")
          .insert({
            auth_id: user.id,
            email: user.email,
            ...updates,
          });

        if (error) throw error;
      }

      // Update auth metadata too
      await supabase.auth.updateUser({
        data: { full_name: editFullName.trim() },
      });

      Alert.alert("Success", "Profile updated!");
      setEditModalVisible(false);
      fetchProfile();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const token = await signInWithGoogle();
      if (token) {
        await AsyncStorage.setItem("google_access_token", token);
        setGoogleConnected(true);
        Alert.alert("Success", "Google Calendar connected!");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDisconnectGoogle = async () => {
    await AsyncStorage.removeItem("google_access_token");
    setGoogleConnected(false);
    Alert.alert("Disconnected", "Google Calendar disconnected.");
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const isPro = profile?.subscription_tier === "pro";
  const isStudio = profile?.subscription_tier === "studio";

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#C9A227" style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>
            {profile?.full_name || "No name set"}
          </Text>
          <Text style={styles.email}>{profile?.email || ""}</Text>
          <Text style={styles.business}>
            {profile?.business_name || "No business name set"}
          </Text>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.editProfileText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
          <View style={styles.subscriptionCard}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>
                {isStudio ? "STUDIO" : isPro ? "PRO" : "FREE"}
              </Text>
            </View>
            <Text style={styles.subText}>
              {isStudio
                ? "Unlimited everything"
                : isPro
                ? "Unlimited clients & bookings"
                : "3 clients • 1 booking max"}
            </Text>
            {!isPro && !isStudio && (
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeText}>Upgrade to Pro — $49/mo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Integrations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTEGRATIONS</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={googleConnected ? handleDisconnectGoogle : handleConnectGoogle}
          >
            <Text style={styles.rowLabel}>
              {googleConnected ? "🔓 Disconnect Google Calendar" : "🔗 Connect Google Calendar"}
            </Text>
            <Text style={styles.rowValue}>
              {googleConnected ? "Connected" : "Not connected"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYOUTS</Text>
          <Text style={styles.subText}>Connect your bank to receive payments</Text>
          {profile?.stripe_connect_account_id ? (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>✅ Bank account connected</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>Connect Bank Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.infoBlock}>
            <Text style={styles.infoRow}>
              📍 {profile?.location || "No location set"}
            </Text>
            {profile?.phone && (
              <Text style={styles.infoRow}>📞 {profile.phone}</Text>
            )}
            <Text style={styles.infoRow}>
              📅 Joined{" "}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-AU")
                : "Recently"}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Your full name"
            />

            <Text style={styles.inputLabel}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={editBusinessName}
              onChangeText={setEditBusinessName}
              placeholder="Your business name"
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="City, State"
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="0412 345 678"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  scrollContent: { paddingBottom: 40 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0A0A0A",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  profileCard: {
    backgroundColor: "#0A0A0A",
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#C9A227",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  name: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  email: { fontSize: 14, color: "#AAAAAA", marginBottom: 4 },
  business: { fontSize: 14, color: "#C9A227", marginBottom: 16 },
  editProfileButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  editProfileText: { color: "#0A0A0A", fontWeight: "700", fontSize: 14 },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    marginBottom: 12,
    letterSpacing: 1,
  },
  subscriptionCard: { gap: 8 },
  tierBadge: {
    backgroundColor: "#F8F6F0",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tierText: { fontSize: 14, fontWeight: "700", color: "#0A0A0A" },
  subText: { fontSize: 14, color: "#666" },
  upgradeButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  upgradeText: { color: "#0A0A0A", fontWeight: "700", fontSize: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  rowLabel: { fontSize: 15, color: "#0A0A0A", fontWeight: "600" },
  rowValue: { fontSize: 14, color: "#999" },
  connectButton: {
    backgroundColor: "#E8F0FE",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  connectText: { color: "#1A73E8", fontWeight: "700", fontSize: 15 },
  connectedBadge: {
    backgroundColor: "#E6F4EA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  connectedText: { color: "#137333", fontWeight: "600" },
  infoBlock: { gap: 8 },
  infoRow: { fontSize: 15, color: "#0A0A0A" },
  logoutButton: {
    backgroundColor: "#FFE5E5",
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#CC0000", fontWeight: "700", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
    marginTop: 12,
  },
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
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#F8F6F0" },
  cancelButtonText: { color: "#0A0A0A", fontWeight: "700" },
  saveButton: { backgroundColor: "#C9A227" },
  saveButtonText: { color: "#0A0A0A", fontWeight: "700" },
});
