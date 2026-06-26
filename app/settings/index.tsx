import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const CLIENT_ID = "ca_UkHV4OfPSH1Uk98habHV7S2LUaMjuwOF";
const PAYMENT_LINK = "https://buy.stripe.com/7sY7sLeWX68g3Qr2Vkgbm00";

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("photographers")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        Alert.alert("Error", "Could not load profile: " + error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err: any) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!PAYMENT_LINK) {
      Alert.alert("Setup Required", "Payment link not configured yet.");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const url = userId ? `${PAYMENT_LINK}?client_reference_id=${userId}` : PAYMENT_LINK;
    await WebBrowser.openBrowserAsync(url);
  };

  const handleConnectBank = async () => {
    if (!CLIENT_ID) {
      Alert.alert("Error", "Stripe Connect not configured.");
      return;
    }
    const redirectUri = "https://ewqbywvhgujwkqnxvuqi.supabase.co";
    const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}`;
    await WebBrowser.openBrowserAsync(connectUrl);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
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

  const isPro = profile?.subscription_tier === "pro";
  const isStudio = profile?.subscription_tier === "studio";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || "Photographer"}</Text>
        <Text style={styles.email}>{profile?.email || ""}</Text>
        <Text style={styles.business}>{profile?.business_name || "Wispersofthepast"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>
            {isStudio ? "🏆 STUDIO" : isPro ? "⭐ PRO" : "🆓 FREE"}
          </Text>
        </View>
        {!isPro && !isStudio && (
          <>
            <Text style={styles.limitText}>3 clients • 1 booking max</Text>
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeText}>Upgrade to Pro — $49/mo</Text>
            </TouchableOpacity>
          </>
        )}
        {(isPro || isStudio) && (
          <Text style={styles.activeText}>✅ Unlimited access active</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>PAYOUTS</Text>
        {profile?.stripe_connect_account_id ? (
          <Text style={styles.connectedText}>✅ Bank account connected</Text>
        ) : (
          <>
            <Text style={styles.limitText}>Connect your bank to receive payments</Text>
            <TouchableOpacity style={styles.connectButton} onPress={handleConnectBank}>
              <Text style={styles.connectText}>Connect Bank Account</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <Text style={styles.infoRow}>📍 {profile?.location || "Glen Innes, NSW"}</Text>
        {profile?.phone && <Text style={styles.infoRow}>📞 {profile.phone}</Text>}
        <Text style={styles.infoRow}>📅 Joined {new Date(profile?.created_at).toLocaleDateString("en-AU")}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  profileCard: {
    backgroundColor: "#0A0A0A",
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#C9A227",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 36 },
  name: { color: "#F8F6F0", fontSize: 22, fontWeight: "700" },
  email: { color: "#999", fontSize: 14, marginTop: 4 },
  business: { color: "#C9A227", fontSize: 14, marginTop: 2 },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginBottom: 12 },
  tierBadge: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  tierText: { fontSize: 16, fontWeight: "700", color: "#0A0A0A" },
  limitText: { fontSize: 14, color: "#666", marginBottom: 12 },
  upgradeButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  upgradeText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  activeText: { fontSize: 14, color: "#059669", fontWeight: "600" },
  connectedText: { fontSize: 14, color: "#059669", fontWeight: "600" },
  connectButton: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  connectText: { color: "#2563EB", fontSize: 16, fontWeight: "700" },
  infoRow: { fontSize: 15, color: "#0A0A0A", marginBottom: 8 },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "700" },
});