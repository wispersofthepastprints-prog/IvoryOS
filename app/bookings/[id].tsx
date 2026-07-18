import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase, getValidUser } from "../../lib/supabase";
import * as WebBrowser from "expo-web-browser";

const BACKEND_URL = "https://ewqbywvhgujwkqnxvuqi.supabase.co/functions/v1";

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBooking(); }, [id]);

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, clients(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("[BookingDetail] fetch error:", error.message);
        Alert.alert("Error", "Could not load booking details.");
      }

      setBooking(data);
      setClient(data?.clients || null);
    } catch (err) {
      console.error("[BookingDetail] exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (type: "deposit" | "balance") => {
    try {
      // Validate booking has required financial fields
      const amount = type === "deposit" ? booking?.deposit_amount : booking?.balance_due;

      if (!amount || amount <= 0) {
        Alert.alert(
          "Missing Payment Amount",
          `This booking does not have a ${type} amount set. Please edit the booking to add a ${type} amount.`,
          [{ text: "OK" }]
        );
        return;
      }

      if (!client?.email) {
        Alert.alert("No Client Email", "The client does not have an email address. Add one in the client profile.");
        return;
      }

      const user = await getValidUser();
      if (!user) {
        Alert.alert("Session Expired", "Please log out and log back in.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        Alert.alert("Authentication Error", "Could not get access token. Please log in again.");
        return;
      }

      const response = await fetch(`${BACKEND_URL}/create-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          photographer_id: booking.photographer_id,
          type,
          amount,
          client_email: client.email,
          description: `${booking.title || "Booking"} - ${type === "deposit" ? "Deposit" : "Balance"}`,
        }),
      });

      const result = await response.json();

      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url);
        fetchBooking(); // Refresh after payment
      } else if (result.error?.includes("not connected") || result.error?.includes("stripe")) {
        Alert.alert(
          "Bank Account Required",
          "You need to connect your bank account in Settings before you can send invoices to clients.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Connect Bank", onPress: () => router.push("/settings") }
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Could not create payment");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong creating the payment.");
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          status, 
          ...(status === "contracted" ? { contract_sent_at: new Date().toISOString() } : {}) 
        })
        .eq("id", id);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", `Status updated to ${status}`);
        fetchBooking();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents || cents <= 0) return "$0";
    return `$${(cents / 100).toLocaleString()}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "TBA";
    return new Date(dateStr).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Booking not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{booking.title || "Booking"}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>CLIENT</Text>
        <Text style={styles.clientName}>{client?.full_name || "Unknown"}</Text>
        <Text style={styles.clientDetail}>📧 {client?.email || "No email"}</Text>
        <Text style={styles.clientDetail}>📞 {client?.phone || "No phone"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>EVENT</Text>
        <Text style={styles.detail}>📅 {formatDate(booking.event_date)}</Text>
        <Text style={styles.detail}>📍 {booking.event_location || "Location TBA"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>FINANCES</Text>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Package Price</Text>
          <Text style={styles.financeValue}>{formatCurrency(booking.package_price)}</Text>
        </View>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Deposit</Text>
          <Text style={[styles.financeValue, booking.deposit_paid && styles.paid]}>
            {formatCurrency(booking.deposit_amount)} {booking.deposit_paid ? "✅ Paid" : "⏳ Unpaid"}
          </Text>
        </View>
        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>Balance Due</Text>
          <Text style={[styles.financeValue, booking.balance_paid && styles.paid]}>
            {formatCurrency(booking.balance_due)} {booking.balance_paid ? "✅ Paid" : "⏳ Unpaid"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>STATUS: {booking.status?.toUpperCase() || "UNKNOWN"}</Text>

        {booking.status === "inquiry" && (
          <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus("contracted")}>
            <Text style={styles.actionText}>📄 Send Contract</Text>
          </TouchableOpacity>
        )}

        {(booking.status === "contracted" || booking.status === "confirmed") && !booking.deposit_paid && (
          <TouchableOpacity style={styles.payButton} onPress={() => createPayment("deposit")}>
            <Text style={styles.payText}>💰 Send Deposit Invoice ({formatCurrency(booking.deposit_amount)})</Text>
          </TouchableOpacity>
        )}

        {booking.deposit_paid && !booking.balance_paid && (
          <TouchableOpacity style={styles.payButton} onPress={() => createPayment("balance")}>
            <Text style={styles.payText}>💰 Send Balance Invoice ({formatCurrency(booking.balance_due)})</Text>
          </TouchableOpacity>
        )}

        {booking.deposit_paid && booking.balance_paid && (
          <Text style={styles.paidText}>🎉 Fully Paid</Text>
        )}

        {booking.status === "contracted" && booking.deposit_paid && (
          <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus("confirmed")}>
            <Text style={styles.actionText}>✅ Confirm Booking</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  center: { justifyContent: "center", alignItems: "center", flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  back: { fontSize: 16, color: "#C9A227", fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", color: "#0A0A0A", flex: 1, textAlign: "center" },
  card: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginBottom: 12 },
  clientName: { fontSize: 18, fontWeight: "700", color: "#0A0A0A", marginBottom: 4 },
  clientDetail: { fontSize: 14, color: "#666", marginBottom: 2 },
  detail: { fontSize: 15, color: "#0A0A0A", marginBottom: 4 },
  financeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  financeLabel: { fontSize: 14, color: "#666" },
  financeValue: { fontSize: 14, fontWeight: "600", color: "#0A0A0A" },
  paid: { color: "#059669" },
  actionButton: { backgroundColor: "#DBEAFE", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  actionText: { color: "#2563EB", fontSize: 16, fontWeight: "700" },
  payButton: { backgroundColor: "#C9A227", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  payText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  paidText: { fontSize: 16, color: "#059669", fontWeight: "700", textAlign: "center", marginTop: 8 },
});
