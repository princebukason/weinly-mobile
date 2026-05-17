"use client";
import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Linking, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { buildWhatsappLink, SITE_URL } from "@/lib/config";
import { registerForPushNotifications, saveRequestPushToken } from "@/lib/notifications";

type FabricRequest = {
  id: string; created_at: string; client_name: string | null; user_input: string;
  ai_output: unknown; status: string | null; contact_request_status: string | null;
  contact_access_fee: string | null; payment_status: string | null;
  payment_reference: string | null; paid_at: string | null; client_email: string | null;
};

type Quote = {
  id: string; supplier_name: string; price: string | null; moq: string | null;
  note: string | null; lead_time: string | null; supplier_region: string | null;
  is_contact_released: boolean | null; contact_name: string | null;
  contact_phone: string | null; contact_wechat: string | null; contact_email: string | null;
};

function formatAiOutput(aiOutput: unknown) {
  if (!aiOutput) return "—";
  if (typeof aiOutput === "string") return aiOutput;
  if (typeof aiOutput === "object") {
    return Object.entries(aiOutput as Record<string, unknown>)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value ?? "")}`)
      .join("\n");
  }
  return String(aiOutput);
}

export default function TrackScreen() {
  const [lookupId, setLookupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<FabricRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Payment state
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  async function handleLookup() {
    const cleanId = lookupId.trim();
    if (!cleanId) { Alert.alert("Error", "Enter a request ID."); return; }
    setLoading(true);
    setRequest(null);
    setQuotes([]);
    setPendingReference(null);
    try {
      const { data: req, error: reqError } = await supabase
        .from("fabric_requests").select("*").eq("id", cleanId).single();
      if (reqError || !req) { Alert.alert("Not found", "Request not found. Check your ID and try again."); return; }
      const { data: quotesData } = await supabase
        .from("quotes").select("*").eq("request_id", cleanId).order("id", { ascending: false });
      setRequest(req as FabricRequest);
      setQuotes((quotesData || []) as Quote[]);
      // Register push token silently so backend can notify this buyer
      registerForPushNotifications().then((token) => {
        if (token) saveRequestPushToken(cleanId, token);
      });
    } catch { Alert.alert("Error", "Failed to fetch request."); }
    finally { setLoading(false); }
  }

  async function startPayment(email: string) {
    if (!request) return;
    setPaying(true);
    setEmailModalVisible(false);
    try {
      const res = await fetch(`${SITE_URL}/api/paystack/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          requestId: request.id,
          name: request.client_name || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start payment.");

      setPendingReference(data.reference);
      await Linking.openURL(data.authorization_url);
    } catch (err: any) {
      Alert.alert("Payment error", err.message || "Could not start payment. Try again.");
    } finally {
      setPaying(false);
    }
  }

  function handleUnlock() {
    if (!request) return;
    const email = request.client_email?.trim();
    if (email) {
      startPayment(email);
    } else {
      // Ask for email if not stored on the request
      setEmailModalVisible(true);
    }
  }

  async function handleVerify() {
    if (!request || !pendingReference) return;
    setVerifying(true);
    try {
      const res = await fetch(`${SITE_URL}/api/paystack/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: pendingReference, requestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      // Refresh the request
      const { data: refreshed } = await supabase
        .from("fabric_requests").select("*").eq("id", request.id).single();
      if (refreshed) setRequest(refreshed as FabricRequest);

      setPendingReference(null);
      Alert.alert(
        "Payment verified ✓",
        "Your payment has been received. Supplier contact details will be released once reviewed — usually within a few hours.",
        [{ text: "OK" }]
      );
    } catch (err: any) {
      Alert.alert("Verification failed", err.message || "Could not verify payment. If you paid, contact support.");
    } finally {
      setVerifying(false);
    }
  }

  function getStagePill(req: FabricRequest, quoteCount: number) {
    if (req.contact_request_status === "approved") return { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "Contact released" };
    if (req.payment_status === "paid") return { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "Paid — awaiting approval" };
    if (quoteCount > 0) return { color: "#60a5fa", bg: "rgba(96,165,250,0.12)", label: "Quotes ready" };
    return { color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "In progress" };
  }

  const pill = request ? getStagePill(request, quotes.length) : null;
  const canUnlock = request && quotes.length > 0
    && request.payment_status !== "paid"
    && request.contact_request_status !== "approved";
  const awaitingApproval = request?.payment_status === "paid"
    && request?.contact_request_status !== "approved";

  const infoItems = request ? [
    { label: "Request ID", value: request.id },
    { label: "Buyer", value: request.client_name || "—" },
    { label: "Status", value: request.status || "submitted" },
    { label: "Payment", value: request.payment_status || "unpaid" },
    { label: "Contact status", value: request.contact_request_status || "none" },
    { label: "Access fee", value: request.contact_access_fee ? `₦${Number(request.contact_access_fee).toLocaleString()}` : "₦10,000" },
  ] : [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.pageTitle}>Track request</Text>
        <Text style={styles.pageSub}>Paste your request ID to see quotes and supplier contact.</Text>

        <View style={styles.lookupCard}>
          <Text style={styles.fieldLabel}>Request ID</Text>
          <TextInput
            value={lookupId}
            onChangeText={setLookupId}
            placeholder="Paste your request ID here"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity style={[styles.primaryBtn, loading && styles.disabledBtn]} onPress={handleLookup} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>Track request</Text>}
          </TouchableOpacity>
        </View>

        {request && pill && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Request tracker</Text>
              <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              {infoItems.map((info) => (
                <View key={info.label} style={styles.infoBox}>
                  <Text style={styles.infoLabel}>{info.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{info.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Fabric request</Text>
              <Text style={styles.specText}>{request.user_input}</Text>
            </View>

            {request.ai_output != null && (
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>AI sourcing spec</Text>
                <Text style={styles.specText}>{formatAiOutput(request.ai_output)}</Text>
              </View>
            )}

            <View style={styles.quotesHeader}>
              <Text style={styles.quotesTitle}>Supplier quotes</Text>
              <View style={styles.quotesBadge}>
                <Text style={styles.quotesBadgeText}>{quotes.length} {quotes.length === 1 ? "quote" : "quotes"}</Text>
              </View>
            </View>

            {quotes.length === 0 ? (
              <View style={styles.emptyQuotes}>
                <Text style={styles.emptyIcon}>◎</Text>
                <Text style={styles.emptyTitle}>Sourcing in progress</Text>
                <Text style={styles.emptyText}>Matching your request to verified suppliers. Quotes appear here shortly.</Text>
              </View>
            ) : (
              quotes.map((quote) => {
                const quoteStats = [
                  { label: "Price", value: quote.price || "—" },
                  { label: "MOQ", value: quote.moq || "—" },
                  { label: "Lead time", value: quote.lead_time || "—" },
                  { label: "Region", value: quote.supplier_region || "—" },
                ];
                const contactItems = [
                  { label: "Contact name", value: quote.contact_name || "—" },
                  { label: "Phone", value: quote.contact_phone || "—" },
                  { label: "WeChat", value: quote.contact_wechat || "—" },
                  { label: "Email", value: quote.contact_email || "—" },
                ];
                return (
                  <View key={quote.id} style={styles.quoteCard}>
                    <View style={styles.quoteHeader}>
                      <Text style={styles.supplierName}>{quote.supplier_name || "Verified Supplier"}</Text>
                      <View style={[styles.pill, { backgroundColor: quote.is_contact_released ? "rgba(52,211,153,0.12)" : "rgba(96,165,250,0.12)" }]}>
                        <Text style={[styles.pillText, { color: quote.is_contact_released ? "#34d399" : "#60a5fa" }]}>
                          {quote.is_contact_released ? "Released" : "Protected"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.quoteStats}>
                      {quoteStats.map((s) => (
                        <View key={s.label} style={styles.quoteStat}>
                          <Text style={styles.quoteStatLabel}>{s.label}</Text>
                          <Text style={styles.quoteStatValue}>{s.value}</Text>
                        </View>
                      ))}
                    </View>
                    {quote.note && (
                      <View style={styles.specBox}>
                        <Text style={styles.specLabel}>Supplier note</Text>
                        <Text style={styles.specText}>{quote.note}</Text>
                      </View>
                    )}
                    {quote.is_contact_released && (
                      <View style={styles.releasedBox}>
                        <Text style={styles.releasedTitle}>✓ Supplier contact details</Text>
                        <View style={styles.quoteStats}>
                          {contactItems.map((c) => (
                            <View key={c.label} style={styles.releasedStat}>
                              <Text style={styles.releasedLabel}>{c.label}</Text>
                              <Text style={styles.releasedValue}>{c.value}</Text>
                            </View>
                          ))}
                        </View>
                        {quote.contact_phone && (
                          <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${quote.contact_phone}`)}>
                            <Text style={styles.callBtnText}>📞 Call supplier</Text>
                          </TouchableOpacity>
                        )}
                        {quote.contact_wechat && (
                          <TouchableOpacity
                            style={styles.wechatBtn}
                            onPress={() => Linking.openURL(`weixin://`)}>
                            <Text style={styles.wechatBtnText}>💬 Open WeChat</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* ── Unlock / Payment section ── */}
            {canUnlock && (
              <View style={styles.unlockCard}>
                <Text style={styles.unlockTitle}>🔒 Unlock supplier contacts</Text>
                <Text style={styles.unlockText}>
                  Pay once to get direct phone, WeChat and email for all suppliers on this request.
                </Text>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Access fee</Text>
                  <Text style={styles.feeAmount}>
                    {request.contact_access_fee ? `₦${Number(request.contact_access_fee).toLocaleString()}` : "₦10,000"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.unlockBtn, paying && styles.disabledBtn]}
                  onPress={handleUnlock}
                  disabled={paying}>
                  {paying
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.unlockBtnText}>Pay to unlock contacts →</Text>}
                </TouchableOpacity>
                <Text style={styles.unlockNote}>
                  Secure payment via Paystack · One-time fee · No subscription
                </Text>
              </View>
            )}

            {/* Verify payment after returning from browser */}
            {pendingReference && (
              <View style={styles.verifyCard}>
                <Text style={styles.verifyTitle}>Did you complete the payment?</Text>
                <Text style={styles.verifyText}>
                  If you finished paying in your browser, tap below to confirm and unlock your contacts.
                </Text>
                <TouchableOpacity
                  style={[styles.verifyBtn, verifying && styles.disabledBtn]}
                  onPress={handleVerify}
                  disabled={verifying}>
                  {verifying
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.verifyBtnText}>✓ I've paid — verify now</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelVerifyBtn}
                  onPress={() => setPendingReference(null)}>
                  <Text style={styles.cancelVerifyText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Awaiting admin approval after payment */}
            {awaitingApproval && !pendingReference && (
              <View style={styles.awaitingCard}>
                <Text style={styles.awaitingTitle}>✓ Payment received</Text>
                <Text style={styles.awaitingText}>
                  Your payment has been confirmed. Supplier contact details will be released within a few hours after review.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => Linking.openURL(buildWhatsappLink(`Hello Weinly, I need help with request ID: ${request.id}`))}>
              <Text style={styles.waBtnText}>Chat on WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Email modal — shown when request has no stored email */}
      <Modal visible={emailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter your email</Text>
            <Text style={styles.modalSub}>Paystack needs your email to process the payment.</Text>
            <TextInput
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="you@example.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, !emailInput.includes("@") && styles.disabledBtn]}
              disabled={!emailInput.includes("@")}
              onPress={() => startPayment(emailInput.trim())}>
              <Text style={styles.primaryBtnText}>Continue to payment →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
              <Text style={styles.cancelVerifyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  pageTitle: { fontFamily: "Inter_900Black", fontSize: 24, color: "#f1f5f9", letterSpacing: -0.5 },
  pageSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
  lookupCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 12 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 13, color: "#f1f5f9", fontFamily: "Inter_400Regular", fontSize: 14 },
  primaryBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 15, alignItems: "center" },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "white" },
  disabledBtn: { opacity: 0.5 },
  resultCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(129,140,248,0.15)", gap: 14 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  resultTitle: { fontFamily: "Inter_900Black", fontSize: 18, color: "#f1f5f9" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoBox: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 10, width: "47%" },
  infoLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#94a3b8" },
  specBox: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 14, padding: 12 },
  specLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  specText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  quotesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quotesTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#f1f5f9" },
  quotesBadge: { backgroundColor: "rgba(99,102,241,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  quotesBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#818cf8" },
  emptyQuotes: { backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderStyle: "dashed", borderRadius: 16, padding: 24, alignItems: "center", gap: 6 },
  emptyIcon: { fontSize: 32, color: "#334155" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#475569" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#334155", textAlign: "center", lineHeight: 18 },
  quoteCard: { backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 14, gap: 10 },
  quoteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  supplierName: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#f1f5f9" },
  quoteStats: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  quoteStat: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 10, padding: 8, width: "47%" },
  quoteStatLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  quoteStatValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#f1f5f9" },
  releasedBox: { backgroundColor: "rgba(52,211,153,0.06)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", borderRadius: 14, padding: 12, gap: 8 },
  releasedTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#34d399" },
  releasedStat: { backgroundColor: "rgba(52,211,153,0.08)", borderWidth: 1, borderColor: "rgba(52,211,153,0.15)", borderRadius: 10, padding: 8, width: "47%" },
  releasedLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#065f46", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  releasedValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#34d399" },
  callBtn: { backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.25)", borderRadius: 12, padding: 11, alignItems: "center" },
  callBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#34d399" },
  wechatBtn: { backgroundColor: "rgba(74,222,128,0.08)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)", borderRadius: 12, padding: 11, alignItems: "center" },
  wechatBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#4ade80" },

  // Unlock card
  unlockCard: { backgroundColor: "rgba(251,191,36,0.06)", borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", borderRadius: 20, padding: 18, gap: 12 },
  unlockTitle: { fontFamily: "Inter_900Black", fontSize: 16, color: "#fbbf24" },
  unlockText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 12, padding: 12 },
  feeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#94a3b8" },
  feeAmount: { fontFamily: "Inter_900Black", fontSize: 20, color: "#fbbf24" },
  unlockBtn: { backgroundColor: "#f59e0b", borderRadius: 16, padding: 16, alignItems: "center" },
  unlockBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#0a0f1e" },
  unlockNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 16 },

  // Verify card
  verifyCard: { backgroundColor: "rgba(99,102,241,0.08)", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)", borderRadius: 20, padding: 18, gap: 12 },
  verifyTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#a5b4fc" },
  verifyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#94a3b8", lineHeight: 20 },
  verifyBtn: { backgroundColor: "#6366f1", borderRadius: 16, padding: 15, alignItems: "center" },
  verifyBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "white" },
  cancelVerifyBtn: { alignItems: "center", padding: 8 },
  cancelVerifyText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#475569" },

  // Awaiting approval
  awaitingCard: { backgroundColor: "rgba(167,139,250,0.08)", borderWidth: 1, borderColor: "rgba(167,139,250,0.2)", borderRadius: 16, padding: 16, gap: 6 },
  awaitingTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#a78bfa" },
  awaitingText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#94a3b8", lineHeight: 20 },

  // WhatsApp
  waBtn: { backgroundColor: "rgba(22,163,74,0.12)", borderWidth: 1, borderColor: "rgba(22,163,74,0.2)", borderRadius: 14, padding: 14, alignItems: "center" },
  waBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#4ade80" },

  // Email modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: "#111827", borderRadius: 24, padding: 24, width: "100%", gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { fontFamily: "Inter_900Black", fontSize: 20, color: "#f1f5f9" },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
});
