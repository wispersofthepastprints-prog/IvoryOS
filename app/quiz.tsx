import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { seedSampleData } from "../lib/seed";

const QUESTIONS = [
  {
    key: "shoot_type",
    title: "What do you shoot most?",
    options: ["Weddings", "Portraits", "Both", "Commercial"],
  },
  {
    key: "main_goal",
    title: "What's the big goal this year?",
    options: ["Book more clients", "Get paid faster", "Simplify the admin", "Grow the studio"],
  },
  {
    key: "current_tool",
    title: "What are you using now?",
    options: ["Spreadsheets / paper", "Pic-Time / Pixieset", "HoneyBook / Studio Ninja", "Nothing yet"],
  },
] as const;

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const q = QUESTIONS[step];

  const choose = async (option: string) => {
    const next = { ...answers, [q.key]: option };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("photographers")
        .upsert(
          { auth_id: user.id, ...next, quiz_completed: true },
          { onConflict: "auth_id" }
        );
      if (error) throw error;
      await seedSampleData(user.id);
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message || "Try again");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: 60 + insets.top, paddingBottom: 40 + insets.bottom }]}>
      <View style={styles.dots}>
        {QUESTIONS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.step}>{step + 1} of {QUESTIONS.length}</Text>
      <Text style={styles.title}>{q.title}</Text>
      {q.options.map((opt) => (
        <TouchableOpacity key={opt} style={styles.option} onPress={() => choose(opt)} disabled={saving}>
          <Text style={styles.optionText}>{saving ? "Setting up your studio..." : opt}</Text>
        </TouchableOpacity>
      ))}
      {step > 0 && (
        <TouchableOpacity onPress={() => setStep(step - 1)}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0", paddingHorizontal: 28 },
  dots: { flexDirection: "row", gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E0D9C8" },
  dotActive: { backgroundColor: "#C9A227", width: 24 },
  step: { fontSize: 12, fontWeight: "700", color: "#C9A227", letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", color: "#0A0A0A", marginBottom: 24 },
  option: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "#E5E5E5" },
  optionText: { fontSize: 16, fontWeight: "600", color: "#0A0A0A" },
  back: { textAlign: "center", color: "#999", marginTop: 12, fontSize: 14 },
});
