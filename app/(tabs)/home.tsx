import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { SITE_URL } from "@/lib/config";

export default function HomeScreen() {
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"spec" | "submitting">("spec");

  async function generateAISpec(input: string): Promise<string | null> {
    try {
      const res = await fetch(`${SITE_URL}/api/spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.output || null;
    } catch { return null; }
  }

  async function submitRequest(aiOutput: string | null) {
    setLoadingPhase("submitting");
    const { data, error } = await supabase.from("fabric_requests").insert([{
        client_name: clientName || null,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        user_input: description.trim(),
        ai_output: aiOutput,
        status: "submitted",
        buyer_requested_contact: false,
        contact_request_status: "none",
        payment_status: "unpaid",
      }]).select().single();
    if (error) throw error;
    setDescription("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    Alert.alert(
      "Request submitted!",
      `Your request ID is:\n${data.id}\n\nSave this ID to track your quotes.`,
      [{ text: "Track request", onPress: () => router.push("/(tabs)/track") }, { text: "OK" }]
    );
  }

  async function handleSubmit() {
    if (!description.trim()) { Alert.alert("Error", "Please describe the fabric you need."); return; }
    setLoading(true);
    setLoadingPhase("spec");
    try {
      const aiOutput = await generateAISpec(description.trim());
      if (!aiOutput) {
        setLoading(false);
        Alert.alert(
          "AI spec unavailable",
          "We couldn't generate an AI spec right now. Your raw description will still be sent to suppliers — but adding more detail improves your quotes.\n\nDo you want to submit anyway?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Submit anyway",
              onPress: async () => {
                setLoading(true);
                try { await submitRequest(null); }
                catch (err: any) { Alert.alert("Error", err.message || "Something went wrong."); }
                finally { setLoading(false); }
              },
            },
          ]
        );
        return;
      }
      await submitRequest(aiOutput);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: "Your name", value: clientName, setter: setClientName, placeholder: "e.g. Amaka Obi", type: "default" },
    { label: "Email address", value: clientEmail, setter: setClientEmail, placeholder: "you@example.com", type: "email-address" },
    { label: "WhatsApp / phone", value: clientPhone, setter: setClientPhone, placeholder: "+234 800 000 0000", type: "phone-pad" },
  ];

  const stats = [
    { v: "500+", l: "Suppliers" },
    { v: "24hr", l: "Quote time" },
    { v: "₦10k", l: "Unlock fee" },
  ];

  const steps = [
    { n: "01", title: "Submit your request", text: "Describe the fabric. AI formats it into a professional spec.", color: "#818cf8" },
    { n: "02", title: "Review supplier quotes", text: "See price, MOQ and lead time from verified Chinese suppliers.", color: "#34d399" },
    { n: "03", title: "Unlock & connect", text: "Pay ₦10,000 to unlock direct supplier phone, WeChat and email.", color: "#fbbf24" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>W</Text>
            </View>
            <Text style={styles.logoName}>Weinly</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Fabric sourcing platform</Text>
            </View>
            <Text style={styles.heroTitle}>
              Source premium fabrics{" "}
              <Text style={styles.heroAccent}>directly from China</Text>
            </Text>
            <Text style={styles.heroSub}>Describe what you need. Get verified supplier quotes. Unlock direct contact.</Text>
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.l} style={styles.statItem}>
                  <Text style={styles.statValue}>{s.v}</Text>
                  <Text style={styles.statLabel}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Submit a request</Text>
            <Text style={styles.sectionSub}>Be detailed — fabric type, color, quantity and quality gets better quotes.</Text>
            <View style={styles.form}>
              {fields.map((field) => (
                <View key={field.label} style={styles.field}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor="#475569"
                    keyboardType={field.type as any}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fabric description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Example: premium beaded lace for wedding asoebi, navy blue, soft handfeel, 5-yard packs..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={5}
                  style={[styles.input, styles.textarea]}
                />
                <Text style={styles.hint}>Include: fabric type · color · quantity · quality · intended use</Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={loading}>
                <Text style={styles.primaryBtnText}>
                  {loading ? (loadingPhase === "spec" ? "Generating AI spec..." : "Submitting...") : "Submit fabric request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.sectionTitle}>How it works</Text>
            {steps.map((step) => (
              <View key={step.n} style={styles.step}>
                <Text style={[styles.stepNum, { color: step.color }]}>{step.n}</Text>
                <View style={[styles.stepBar, { backgroundColor: step.color }]} />
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  logoBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  logoText: { fontFamily: "Inter_900Black", fontSize: 14, color: "white" },
  logoName: { fontFamily: "Inter_900Black", fontSize: 20, color: "#f1f5f9" },
  heroCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(129,140,248,0.15)" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", marginBottom: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  liveBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#a5b4fc" },
  heroTitle: { fontFamily: "Inter_900Black", fontSize: 26, color: "#f1f5f9", lineHeight: 34, letterSpacing: -0.5, marginBottom: 10 },
  heroAccent: { color: "#818cf8" },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#94a3b8", lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 20 },
  statItem: { gap: 2 },
  statValue: { fontFamily: "Inter_900Black", fontSize: 20, color: "#f1f5f9" },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#64748b" },
  formCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  sectionTitle: { fontFamily: "Inter_900Black", fontSize: 20, color: "#f1f5f9", marginBottom: 4, letterSpacing: -0.3 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20, marginBottom: 20 },
  form: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 13, color: "#f1f5f9", fontFamily: "Inter_400Regular", fontSize: 14 },
  textarea: { height: 120, textAlignVertical: "top" },
  hint: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#475569", lineHeight: 16 },
  primaryBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 4 },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "white" },
  disabledBtn: { opacity: 0.6 },
  stepsCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 16 },
  step: { gap: 6 },
  stepNum: { fontFamily: "Inter_900Black", fontSize: 11, letterSpacing: 1 },
  stepBar: { width: 36, height: 3, borderRadius: 2 },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#f1f5f9" },
  stepText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
});