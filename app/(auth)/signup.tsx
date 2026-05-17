import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Name, email and password are required.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: "buyer", full_name: name.trim(), phone: phone.trim() },
        },
      });
      if (error) throw error;
      Alert.alert(
        "Account created!",
        "Check your email to confirm your account, then log in.",
        [{ text: "OK", onPress: () => router.push("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Signup failed", err.message || "Something went wrong.");
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

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join Weinly to source premium fabrics from China.</Text>

        <View style={styles.form}>
          {[
            { label: "Full name", value: name, setter: setName, placeholder: "e.g. Amaka Obi", type: "default" },
            { label: "Email address", value: email, setter: setEmail, placeholder: "you@example.com", type: "email-address" },
            { label: "WhatsApp / phone", value: phone, setter: setPhone, placeholder: "+234 800 000 0000", type: "phone-pad" },
          ].map((field) => (
            <View key={field.label} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor="#475569"
                keyboardType={field.type as any}
                autoCapitalize={field.type === "email-address" ? "none" : "words"}
                style={styles.input}
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Use at least 8 characters with a mix of letters and numbers.</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleSignup}
            disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? "Creating account..." : "Create account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.secondaryBtnText}>Already have an account? Log in</Text>
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
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#475569", lineHeight: 16 },
  primaryBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 8 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "white" },
  secondaryBtn: { borderRadius: 16, padding: 14, alignItems: "center" },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#6366f1" },
  disabledBtn: { opacity: 0.6 },
});