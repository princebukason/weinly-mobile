import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

type FabricRequest = {
  id: string; created_at: string; client_name: string | null; client_email: string | null;
  user_input: string; status: string | null; contact_request_status: string | null;
  payment_status: string | null; contact_access_fee: string | null;
};

type Quote = {
  id: string; request_id: string; supplier_name: string; price: string | null;
  moq: string | null; lead_time: string | null; supplier_region: string | null;
  is_contact_released: boolean | null;
};

export default function HistoryScreen() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [requests, setRequests] = useState<FabricRequest[]>([]);
  const [quotesMap, setQuotesMap] = useState<Record<string, Quote[]>>({});

  async function searchHistory() {
    if (!email.trim() && !phone.trim()) { Alert.alert("Error", "Enter your email or phone number."); return; }
    setLoading(true);
    setRequests([]);
    setQuotesMap({});
    setSearched(false);
    try {
      let query = supabase.from("fabric_requests").select("*").order("created_at", { ascending: false });
      if (email.trim() && phone.trim()) {
        query = query.or(`client_email.eq.${email.trim()},client_phone.eq.${phone.trim()}`);
      } else if (email.trim()) {
        query = query.eq("client_email", email.trim());
      } else {
        query = query.eq("client_phone", phone.trim());
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []) as FabricRequest[];
      setRequests(list);
      setSearched(true);
      const ids = list.map((r) => r.id);
      if (ids.length > 0) {
        const { data: quotesData } = await supabase.from("quotes").select("*").in("request_id", ids);
        const grouped: Record<string, Quote[]> = {};
        (quotesData || []).forEach((q) => {
          const quote = q as Quote;
          if (!grouped[quote.request_id]) grouped[quote.request_id] = [];
          grouped[quote.request_id].push(quote);
        });
        setQuotesMap(grouped);
      }
    } catch { Alert.alert("Error", "Failed to load history."); }
    finally { setLoading(false); }
  }

  function getStagePill(req: FabricRequest, quoteCount: number) {
    if (req.contact_request_status === "approved") return { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "Contact released" };
    if (req.payment_status === "paid") return { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "Paid" };
    if (quoteCount > 0) return { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "Quotes ready" };
    return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "In progress" };
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.pageTitle}>Request history</Text>
        <Text style={styles.pageSub}>Enter the email or phone you used when submitting.</Text>

        <View style={styles.searchCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#475569" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WhatsApp / phone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" placeholderTextColor="#475569" keyboardType="phone-pad" style={styles.input} />
          </View>
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.disabledBtn]} onPress={searchHistory} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Search history</Text>}
          </TouchableOpacity>
        </View>

        {searched && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {requests.length === 0 ? "No requests found" : `${requests.length} request${requests.length === 1 ? "" : "s"} found`}
            </Text>

            {requests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>◎</Text>
                <Text style={styles.emptyTitle}>No requests found</Text>
                <Text style={styles.emptyText}>Make sure you use the same email or phone you submitted with.</Text>
                <TouchableOpacity style={styles.newRequestBtn} onPress={() => router.push("/(tabs)/home")}>
                  <Text style={styles.newRequestBtnText}>Submit a new request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              requests.map((request) => {
                const quotes = quotesMap[request.id] || [];
                const pill = getStagePill(request, quotes.length);
                const statsItems = [
                  { label: "Status", value: request.status || "submitted" },
                  { label: "Payment", value: request.payment_status || "unpaid" },
                  { label: "Quotes", value: String(quotes.length) },
                ];
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestIdLabel}>Request ID</Text>
                        <Text style={styles.requestId} numberOfLines={1}>{request.id}</Text>
                        <Text style={styles.requestDate}>{new Date(request.created_at).toLocaleDateString()}</Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                      </View>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>Request</Text>
                      <Text style={styles.specText} numberOfLines={3}>{request.user_input}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      {statsItems.map((s) => (
                        <View key={s.label} style={styles.statBox}>
                          <Text style={styles.statLabel}>{s.label}</Text>
                          <Text style={styles.statValue}>{s.value}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.trackBtn} onPress={() => router.push("/(tabs)/track")}>
                      <Text style={styles.trackBtnText}>Track this request →</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  pageTitle: { fontFamily: "Inter_900Black", fontSize: 24, color: "#f1f5f9", letterSpacing: -0.5 },
  pageSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
  searchCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 13, color: "#f1f5f9", fontFamily: "Inter_400Regular", fontSize: 14 },
  primaryBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 15, alignItems: "center" },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "white" },
  disabledBtn: { opacity: 0.6 },
  resultsCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 14 },
  resultsTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#f1f5f9" },
  emptyState: { alignItems: "center", padding: 24, gap: 8 },
  emptyIcon: { fontSize: 40, color: "#334155" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#475569" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#334155", textAlign: "center", lineHeight: 20 },
  newRequestBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  newRequestBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "white" },
  requestCard: { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 14, gap: 10 },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  requestIdLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  requestId: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#94a3b8" },
  requestDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#475569", marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  specBox: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 10 },
  specLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  specText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#94a3b8", lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 6 },
  statBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 8 },
  statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#94a3b8" },
  trackBtn: { backgroundColor: "rgba(99,102,241,0.1)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", borderRadius: 12, padding: 10, alignItems: "center" },
  trackBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#818cf8" },
});