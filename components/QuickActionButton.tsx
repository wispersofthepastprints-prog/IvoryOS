import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

interface Props {
  icon: string;
  label: string;
  onPress: () => void;
}

export default function QuickActionButton({ icon, label, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    width: 80,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F8F6F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    color: "#0A0A0A",
    fontWeight: "500",
    textAlign: "center",
  },
});
