import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { buildWhatsappLink, SITE_URL } from "@/lib/config";
import { registerForPushNotifications, savePushToken } from "@/lib/notifications";

type User = { id: string; email: string; name: string | null; phone: string | null; };
type Subscription = { plan: string; status: string; expires_at: string; } | null;

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const isPro = subscription && new Date(subscription.expires_at) > new Date();

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/(auth)/login"); return; }

      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.full_name || null,
        phone: session.user.user_metadata?.phone || null,
      });

      // Load subscription
      try {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan, status, expires_at")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .single();
        setSubscription(sub as Subscription);
      } catch {
        setSubscription(null);
      }

      setLoading(false);

      // Register push token
      try {
        const token = await registerForPushNotifications();
        if (token) await savePushToken(session.user.id, token);
      } catch (e) {
        console.error("Push token error:", e);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out", style: "destructive", onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        }
      }
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const infoItems = [
    { label: "Full name", value: user.name || "Not set" },
    { label: "Email", value: user.email },
    { label: "Phone", value: user.phone || "Not set" },
    { label: "Account type", value: isPro ? "Pro member" : "Free buyer" },
  ];

  const actions = [
    { label: "Submit new request", color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)", onPress: () => router.push("/(tabs)/home") },
    { label: "Track a request", color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", onPress: () => router.push("/(tabs)/track") },
    { label: "View request history", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", onPress: () => router.push("/(tabs)/history") },
    { label: "Chat on WhatsApp", color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.2)", onPress: () => Linking.openURL(buildWhatsappLink("Hello Weinly, I need help with fabric sourcing.")) },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <Text style={styles.pageTitle}>Profile</Text>

        {/* Account card */}
        <View style={styles.accountCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, isPro && styles.avatarPro]}>
              <Text style={styles.avatarText}>
                {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.name || "Buyer"}</Text>
                {isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>✨ Pro</Text>
                  </View>
                )}
              </View>
              <Text style={styles.userEmail}>{user.email}</Text>
              {isPro && subscription?.expires_at && (
                <Text style={styles.expiryText}>
                  Expires {new Date(subscription.expires_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoGrid}>
            {infoItems.map((info) => (
              <View key={info.label} style={styles.infoBox}>
                <Text style={styles.infoLabel}>{info.label}</Text>
                <Text style={styles.infoValue}>{info.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pro badge or upgrade banner */}
        {isPro ? (
          <View style={styles.proCard}>
            <View style={styles.proCardRow}>
              <View style={styles.proCardDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proCardTitle}>✨ Weinly Pro — Active</Text>
                <Text style={styles.proCardSub}>
                  {"Plan: "}{subscription?.plan === "pro_yearly" ? "Yearly" : "Monthly"}
                  {" · Expires "}{new Date(subscription!.expires_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => Linking.openURL(buildWhatsappLink("Hello Weinly, I want to manage my Pro subscription."))}>
              <Text style={styles.manageBtnText}>Manage subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>✨ Upgrade to Weinly Pro</Text>
            <Text style={styles.upgradeSub}>
              Get 3 contact unlocks/month, priority matching and dedicated support for ₦25,000/month.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => Linking.openURL(SITE_URL + "/pricing")}>
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications status */}
        <View style={styles.notifCard}>
          <View style={styles.notifRow}>
            <View style={styles.notifDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>Push notifications enabled</Text>
              <Text style={styles.notifSub}>
                You will be notified when quotes are ready and when supplier contact is approved.
              </Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick actions</Text>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionBtn, { backgroundColor: action.bg, borderColor: action.border }]}
              onPress={action.onPress}>
              <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.actionsTitle}>About Weinly</Text>
          <Text style={styles.aboutText}>
            AI-powered fabric sourcing platform connecting African buyers to verified Chinese fabric suppliers.
          </Text>
          <View style={styles.divider} />
          <View style={styles.aboutLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(SITE_URL)}>
              <Text style={styles.aboutLink}>weinlyhq.com</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL("mailto:hello@weinlyhq.com")}>
              <Text style={styles.aboutLink}>hello@weinlyhq.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.disabledBtn]}
          onPress={handleLogout}
          disabled={loggingOut}>
          <Text style={styles.logoutBtnText}>{loggingOut ? "Logging out..." : "Log out"}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0f1e" },
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#64748b" },
  pageTitle: { fontFamily: "Inter_900Black", fontSize: 24, color: "#f1f5f9", letterSpacing: -0.5 },
  accountCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 16 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  avatarPro: { backgroundColor: "#7c3aed" },
  avatarText: { fontFamily: "Inter_900Black", fontSize: 22, color: "white" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  userName: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#f1f5f9" },
  proBadge: { backgroundColor: "rgba(99,102,241,0.2)", borderWidth: 1, borderColor: "rgba(99,102,241,0.3)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  proBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#a5b4fc" },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", marginTop: 2 },
  expiryText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#475569", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoBox: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 10, width: "47%" },
  infoLabel: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#94a3b8" },
  proCard: { backgroundColor: "rgba(99,102,241,0.08)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", borderRadius: 20, padding: 16, gap: 12 },
  proCardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  proCardDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4ade80", marginTop: 4 },
  proCardTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#a5b4fc", marginBottom: 4 },
  proCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#64748b", lineHeight: 18 },
  manageBtn: { backgroundColor: "rgba(99,102,241,0.15)", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)", borderRadius: 12, padding: 12, alignItems: "center" },
  manageBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#818cf8" },
  upgradeCard: { backgroundColor: "rgba(99,102,241,0.06)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", borderRadius: 20, padding: 16, gap: 10 },
  upgradeTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#f1f5f9" },
  upgradeSub: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
  upgradeBtn: { backgroundColor: "linear-gradient(135deg, #6366f1, #7c3aed)", borderRadius: 14, padding: 14, alignItems: "center", backgroundColor: "#6366f1" },
  upgradeBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "white" },
  notifCard: { backgroundColor: "rgba(99,102,241,0.06)", borderWidth: 1, borderColor: "rgba(99,102,241,0.2)", borderRadius: 20, padding: 16 },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  notifDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4ade80", marginTop: 4 },
  notifTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#a5b4fc", marginBottom: 4 },
  notifSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#64748b", lineHeight: 18 },
  actionsCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 10 },
  actionsTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#f1f5f9", marginBottom: 4 },
  actionBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  actionBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  aboutCard: { backgroundColor: "#111827", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", gap: 12 },
  aboutText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#64748b", lineHeight: 20 },
  aboutLinks: { flexDirection: "row", gap: 16 },
  aboutLink: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#6366f1" },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", borderRadius: 16, padding: 16, alignItems: "center" },
  logoutBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#f87171" },
  disabledBtn: { opacity: 0.6 },
});