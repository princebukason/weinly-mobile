import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vbqlgtmgumwwyhtjzckh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWxndG1ndW13d3lodGp6Y2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk4MTgsImV4cCI6MjA4MjM4NTgxOH0.EQYSJtZuOZBwv7qYy5idRppW2n8WWLb4ygO_GT8xmXo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});