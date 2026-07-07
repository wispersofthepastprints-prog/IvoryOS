import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function MoreScreen() {
  const router = useRouter();

  const menuItems = [
    { icon: "📝", label: "Contracts", route: "/contracts" },
    { icon: "📧", label: "Email Templates", route: "/emails" },
    { icon: "📦", label: "Packages", route: "/packages" },
    { icon: "💰", label: "Invoices", route: "/invoices" },
    { icon: "📅", label: "Calendar", route: "/calendar" },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      {menuItems.map((item) => (
        <TouchableOpacity key={item.route} style={styles.menuItem} onPress={() => router.push(item.route)}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#0A0A0A" },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 24, marginBottom: 12, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E5E5E5" },
  icon: { fontSize: 24, marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0A0A0A" },
  arrow: { fontSize: 18, color: "#999" },
});