import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase, getValidUser } from "../lib/supabase";
import { View, ActivityIndicator } from "react-native";
import { initRevenueCat } from "../lib/revenuecat";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
    initRevenueCat();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        router.replace("/login");
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setIsAuthenticated(!!session);
        const isAuthScreen = segments[0] === "login";
        if (isAuthScreen) {
          router.replace("/");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    // Local probe: no persisted tokens at all = definitively logged out
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    // Server validation: tokens exist but Supabase rejects them = dead session
    const user = await getValidUser();
    setLoading(false);
    if (!user) {
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
    }
  };

  // Keep the URL honest: bounce between login and home as auth state changes
  useEffect(() => {
    if (loading) return;
    const onAuthScreen = segments[0] === "login" || segments[0] === "register";
    if (!isAuthenticated && !onAuthScreen) {
      router.replace("/login");
    } else if (isAuthenticated && onAuthScreen) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="invoices/index" />
      <Stack.Screen name="invoices/new" />
      <Stack.Screen name="invoices/[id]" />
      <Stack.Screen name="emails/index" />
      <Stack.Screen name="emails/template" />
      <Stack.Screen name="contracts/index" />
      <Stack.Screen name="contracts/new" />
      <Stack.Screen name="contracts/[id]" />
      <Stack.Screen name="packages/index" />
      <Stack.Screen name="wedding-day/index" />
      <Stack.Screen name="calendar/index" />
      <Stack.Screen name="more" />
      <Stack.Screen name="money/index" />
      <Stack.Screen name="money/setup" />
      <Stack.Screen name="money/add-expense" />
      <Stack.Screen name="money/vault" />
    </Stack>
  );
}
