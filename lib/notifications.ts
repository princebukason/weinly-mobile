import "react-native-url-polyfill/auto";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications only work on physical devices.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted.");
    return null;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "b6ed082d-aa80-4d1f-b4a9-dd0b992e7975",
      })
    ).data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366f1",
      });
    }

    return token;
  } catch (e) {
    console.log("Push token error (expected in Expo Go):", e);
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) console.error("Failed to save push token:", error);
  } catch (e) {
    console.error("Push token save error:", e);
  }
}

export async function saveRequestPushToken(requestId: string, token: string) {
  try {
    await fetch(`${SITE_URL}/api/push/save-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, token }),
    });
  } catch (e) {
    console.error("Request push token save error:", e);
  }
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data: data || {},
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}