import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLedgerSettings, vaultTotalsCents, formatAUD } from "../../lib/ledger";

export default function VaultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [totals, setTotals] = useState<{ incomeCents: number; setAsideCents: number; byQuarterCents: Record<string, number> } | null>(null);
  const [pct, setPct] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const s = await getLedgerSettings();
    if (s) setPct(s.set_aside_pct);
    setTotals(await vaultTotalsCents(s?.set_aside_pct ?? 30));
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const quarters = totals ? Object.keys(totals.byQuarterCents).sort().reverse() : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Tax Vault</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>TOTAL SET ASIDE</Text>
        <Text style={styles.heroAmount}>{totals ? formatAUD(totals.setAsideCents) : "$0"}</Text>
        <Text style={styles.heroSub}>from {totals ? formatAUD(totals.incomeCents) : "$0"} income · at {pct}%</Text>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          🏛 Ivory Ledger tracks what you should set aside. Moving the money to a separate account is done at your bank — auto-transfers are a future feature.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>BY QUARTER (AU FINANCIAL YEAR)</Text>
      {quarters.length === 0 && <Text style={styles.empty}>No income recorded yet. Paid invoices appear here automatically.</Text>}
      {quarters.map((q) => (
        <View key={q} style={styles.rowCard}>
          <Text style={styles.rowTitle}>{q}</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.rowAmount}>{formatAUD(Math.round(totals!.byQuarterCents[q] * (pct / 100)))}</Text>
            <Text style={styles.rowSub}>of {formatAUD(totals!.byQuarterCents[q])}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.disclaimer}>
        Ivory Ledger provides record-keeping and estimates only. It is not tax, legal, or financial advice. Figures should be verified with a registered tax agent.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#0A0A0A" },
  hero: { backgroundColor: "#0A0A0A", marginHorizontal: 24, borderRadius: 20, padding: 24, marginBottom: 12 },
  heroLabel: { color: "#C9A227", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 8 },
  heroAmount: { color: "#F8F6F0", fontSize: 40, fontWeight: "800", marginBottom: 4 },
  heroSub: { color: "#999", fontSize: 14 },
  noteCard: { backgroundColor: "#FFFFFF", marginHorizontal: 24, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 12 },
  noteText: { fontSize: 13, color: "#666", lineHeight: 18 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 1, marginHorizontal: 24, marginBottom: 12, marginTop: 8 },
  rowCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF", marginHorizontal: 24, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E5E5E5" },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#0A0A0A" },
  rowAmount: { fontSize: 15, fontWeight: "700", color: "#C9A227" },
  rowSub: { fontSize: 12, color: "#999", marginTop: 2 },
  empty: { marginHorizontal: 24, color: "#999", fontSize: 13 },
  disclaimer: { marginHorizontal: 24, marginTop: 16, fontSize: 11, color: "#999", lineHeight: 16 },
});
