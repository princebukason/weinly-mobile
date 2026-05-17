import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { Alert.alert("Error", "Please fill in all fields."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const role = data.user?.user_metadata?.role;
      if (role === "supplier") {
        Alert.alert("Wrong portal", "Suppliers should use the supplier portal.");
        await supabase.auth.signOut();
        return;
      }
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Login failed", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={styles.logoBadge}><Text style={styles.logoText}>W</Text></View>
          <Text style={styles.logoName}>Weinly</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to track your fabric sourcing requests.</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? "Logging in..." : "Log in to Weinly"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/(auth)/signup")}>
            <Text style={styles.secondaryBtnText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0f1e" },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 40 },
  logoBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: "Inter_900Black", fontSize: 16, color: "white" },
  logoName: { fontFamily: "Inter_900Black", fontSize: 22, color: "#f1f5f9" },
  title: { fontFamily: "Inter_900Black", fontSize: 28, color: "#f1f5f9", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 15, color: "#94a3b8", lineHeight: 24, marginBottom: 32 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 14, color: "#f1f5f9", fontFamily: "Inter_400Regular", fontSize: 15 },
  passwordWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, paddingRight: 14 },
  passwordInput: { flex: 1, padding: 14, color: "#f1f5f9", fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 4 },
  eyeText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#6366f1" },
  primaryBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 8 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "white" },
  secondaryBtn: { borderRadius: 16, padding: 14, alignItems: "center" },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#6366f1" },
  disabledBtn: { opacity: 0.6 },
});