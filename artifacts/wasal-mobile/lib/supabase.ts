import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xugjqhxfdjlndljogvru.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1Z2pxaHhmZGpsbmRsam9ndnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjIxNjAsImV4cCI6MjA4NzA5ODE2MH0.wsflnj4IbqRJFxFDZDjaH3d0HyoR8FY185FEJErRwkY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
