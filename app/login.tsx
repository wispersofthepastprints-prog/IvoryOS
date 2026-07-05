import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmail, signUpWithEmail, supabase } from "../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    const { error } = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      router.replace("/");
    }
  };

  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Enter your email", "Type your email above first, then tap Forgot Password.");
      return;
    }
    if (forgotLoading) {
      Alert.alert("Please wait", "Check your email first. If you don't see it, wait 1 hour before trying again.");
      return;
    }
    
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: "https://wispersofthepastprints-prog.github.io/IvoryOS/reset-password-v2.html",
    });
    setForgotLoading(false);
    
    if (error) {
      if (error.message.includes("rate limit") || error.message.includes("security")) {
        Alert.alert("Too many attempts", "Please wait 1 hour before trying again. This protects your account from spam.");
      } else {
        Alert.alert("Error", error.message);
      }
    } else {
      Alert.alert("Check your email", "Password reset link sent! If you don't see it, check your spam folder.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>◇</Text>
          <Text style={styles.logoText}>IVORY OS</Text>
        </View>

        <Text style={styles.tagline}>
          The all-in-one platform for wedding photographers
        </Text>

        <View style={styles.spacer} />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.mainButton, loading && styles.disabled]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          <Text style={styles.mainButtonText}>
            {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleForgotPassword} 
          style={styles.forgotButton}
          disabled={forgotLoading}
        >
          <Text style={[styles.forgotText, forgotLoading && { color: "#999" }]}>
            {forgotLoading ? "Reset link sent — check email" : "Forgot Password?"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggleText}>
            {isLogin ? "New? Start Free Trial" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F6F0" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logoContainer: { alignItems: "center", marginBottom: 12 },
  logoIcon: { fontSize: 48, color: "#C9A227", marginBottom: 8 },
  logoText: { fontSize: 28, fontWeight: "800", color: "#0A0A0A", letterSpacing: 3 },
  tagline: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 22 },
  spacer: { height: 48 },
  input: {
    backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 12, fontSize: 15, marginBottom: 12, borderWidth: 1,
    borderColor: "#E5E5E5", color: "#0A0A0A",
  },
  mainButton: {
    backgroundColor: "#C9A227", paddingVertical: 18, borderRadius: 12,
    alignItems: "center", marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  mainButtonText: { color: "#0A0A0A", fontSize: 16, fontWeight: "700" },
  forgotButton: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  forgotText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleText: { textAlign: "center", color: "#666", marginTop: 20, fontSize: 14 },
});