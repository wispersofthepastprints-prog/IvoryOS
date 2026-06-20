import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  status: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  inquiry: { bg: "#FEE2E2", text: "#DC2626" },
  quoted: { bg: "#FEF3C7", text: "#D97706" },
  contracted: { bg: "#DBEAFE", text: "#2563EB" },
  confirmed: { bg: "#D1FAE5", text: "#059669" },
  completed: { bg: "#E0E7FF", text: "#4F46E5" },
  cancelled: { bg: "#F3F4F6", text: "#6B7280" },
};

export default function StatusBadge({ status }: Props) {
  const colors = statusColors[status] || statusColors.inquiry;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
