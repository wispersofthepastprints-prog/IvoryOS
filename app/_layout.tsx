import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { supabase, getCurrentUser } from "../lib/supabase";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.replace("/login");
      } else {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setSession(user);
    setLoading(false);
    if (!user) {
      router.replace("/login");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F6F0" }}>
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="clients/index" />
    </Stack>
  );
}
