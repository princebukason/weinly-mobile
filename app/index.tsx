import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

const slides = [
  {
    title: "Source premium fabrics from China",
    subtitle:
      "Describe what you need and get matched with verified Chinese fabric suppliers.",
    accent: "#818cf8",
  },
  {
    title: "Get verified supplier quotes first",
    subtitle:
      "See price, MOQ and lead time before paying anything to unlock direct contact.",
    accent: "#34d399",
  },
  {
    title: "Connect directly and close deals",
    subtitle:
      "Pay ₦10,000 to unlock direct supplier phone, WeChat and email. No middlemen.",
    accent: "#fbbf24",
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        console.log("SESSION ERROR:", sessionError);
        console.log("SESSION USER:", session?.user?.id ?? null);

        const { data, error } = await supabase
          .from("fabric_requests")
          .select("*")
          .limit(1);

        console.log("SUPABASE TEST DATA:", data);
        console.log("SUPABASE TEST ERROR:", error);

        if (!isMounted) return;

        if (session?.user) {
          router.replace("/(tabs)/home");
          return;
        }

        setChecking(false);
      } catch (err) {
        console.log("BOOT ERROR:", err);

        if (!isMounted) return;
        setChecking(false);
      }
    }

    boot();

    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Weinly</Text>
        <Text style={styles.loadingSubtext}>Checking connection...</Text>
      </View>
    );
  }

  const slide = slides[current];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { shadowColor: slide.accent }]}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.logoName}>Weinly</Text>
        </View>

        <View style={[styles.accentBar, { backgroundColor: slide.accent }]} />

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why buyers use Weinly</Text>
          <Text style={styles.cardText}>
            Clear specs. Verified quotes. Faster supplier access. Less guesswork.
          </Text>
        </View>

        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  backgroundColor: i === current ? slide.accent : "#334155",
                  width: i === current ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {current < slides.length - 1 ? (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: slide.accent }]}
              onPress={() => setCurrent((prev) => prev + 1)}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: "#6366f1" }]}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.secondaryBtnText}>
                I already have an account
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0f1e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    fontFamily: "Inter_900Black",
    fontSize: 32,
    color: "#f1f5f9",
    letterSpacing: -1,
    marginTop: 16,
  },
  loadingSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#0a0f1e",
    padding: 24,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 48,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoText: {
    fontFamily: "Inter_900Black",
    fontSize: 18,
    color: "white",
  },
  logoName: {
    fontFamily: "Inter_900Black",
    fontSize: 24,
    color: "#f1f5f9",
    letterSpacing: -0.5,
  },
  accentBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  title: {
    fontFamily: "Inter_900Black",
    fontSize: 32,
    color: "#f1f5f9",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 26,
    marginBottom: 24,
  },
  card: {
    width: "100%",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxWidth: width - 48,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#f8fafc",
    marginBottom: 8,
  },
  cardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 40,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: 12,
    paddingBottom: 16,
  },
  primaryBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "white",
  },
  secondaryBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#94a3b8",
  },
  skipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    padding: 8,
  },
});