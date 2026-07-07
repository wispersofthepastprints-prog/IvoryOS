import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

interface Booking {
  id: string;
  event_date: string;
  client_name: string;
  package_name: string;
  status: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
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

      const { data: profile } = await supabase
        .from("photographers")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      const { data } = await supabase
        .from("bookings")
        .select("id, event_date, client_name, package_name, status")
        .eq("photographer_id", profile?.id)
        .order("event_date", { ascending: true });

      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Build marked dates for calendar
  const markedDates: Record<string, any> = {};
  bookings.forEach(b => {
    const date = b.event_date;
    if (!markedDates[date]) {
      markedDates[date] = { dots: [] };
    }
    markedDates[date].dots.push({
      color: b.status === "confirmed" ? "#C9A227" : b.status === "inquiry" ? "#666" : "#DC2626",
    });
  });

  // Highlight selected date
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: "#C9A227",
      selectedTextColor: "#0A0A0A",
    };
  }

  const selectedBookings = bookings.filter(b => b.event_date === selectedDate);

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <View style={styles.calendarCard}>
        <Calendar
          theme={{
            backgroundColor: "#FFFFFF",
            calendarBackground: "#FFFFFF",
            textSectionTitleColor: "#0A0A0A",
            selectedDayBackgroundColor: "#C9A227",
            selectedDayTextColor: "#0A0A0A",
            todayTextColor: "#C9A227",
            dayTextColor: "#0A0A0A",
            textDisabledColor: "#D1D5DB",
            dotColor: "#C9A227",
            monthTextColor: "#0A0A0A",
            textMonthFontWeight: "700",
            textDayFontSize: 14,
            textMonthFontSize: 16,
            arrowColor: "#C9A227",
          }}
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={onDayPress}
          enableSwipeMonths={true}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }) : "Select a date"}
        </Text>

        {selectedBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bookings on this date</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/bookings/new?date=${selectedDate}`)}
            >
              <Text style={styles.addButtonText}>+ Add Booking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          selectedBookings.map(booking => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => router.push(`/bookings/${booking.id}`)}
            >
              <View style={styles.bookingHeader}>
                <Text style={styles.clientName}>{booking.client_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.packageName}>{booking.package_name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "confirmed": return "#C9A227";
    case "inquiry": return "#9CA3AF";
    case "completed": return "#22C55E";
    case "cancelled": return "#EF4444";
    default: return "#C9A227";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  section: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0A0A0A", marginBottom: 12 },
  emptyState: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 15, color: "#666", marginBottom: 16 },
  addButton: {
    backgroundColor: "#C9A227",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: { color: "#0A0A0A", fontSize: 15, fontWeight: "700" },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  clientName: { fontSize: 16, fontWeight: "700", color: "#0A0A0A" },
  packageName: { fontSize: 14, color: "#666" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF", textTransform: "capitalize" },
});