import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { registerForPushNotifications, savePushToken } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    async function setupNotifications() {
      try {
        const token = await registerForPushNotifications();
        if (!token) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await savePushToken(session.user.id, token);
        }
      } catch (e) {
        console.error("Notification setup error:", e);
      }
    }

    setupNotifications();

    // Only set up listeners if the API is available
    if (Notifications.addNotificationReceivedListener) {
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });
    }

    if (Notifications.addNotificationResponseReceivedListener) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.requestId) {
          router.push("/(tabs)/track");
        }
      });
    }

    return () => {
      // Use .remove() method on the subscription object directly
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0f1e" } }} />
    </>
  );
}